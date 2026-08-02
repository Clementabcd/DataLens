// ============================================================
// DataLens Core — Benford Engine
// Référence théorique : Newcomb-Benford Law, tests de Nigrini
// (Forensic Analytics, 2012) pour le MAD et les seuils de conformité.
// ============================================================

import type {
  BenfordAnalysisResult,
  BenfordChiSquare,
  BenfordDigitType,
  BenfordMAD,
  BenfordReport,
  DigitDistribution,
  MADInterpretation,
} from '../types';

// ------------------------------------------------------------
// 1. Extraction des chiffres significatifs
// ------------------------------------------------------------

/** Retire le signe et ramène le nombre à sa forme "mantisse entière" (ex: 0.00456 -> 456, 12.3 -> 123) */
function significantDigitsString(value: number): string | null {
  const abs = Math.abs(value);
  if (abs === 0 || !Number.isFinite(abs)) return null;
  // On normalise en notation scientifique pour extraire uniquement les chiffres significatifs
  const exp = abs.toExponential(14); // 15 chiffres significatifs de précision
  const mantissa = exp.split('e')[0].replace('.', '').replace('-', '');
  // Retire les zéros de fin non significatifs dus à l'arrondi flottant, garde au moins 3 chiffres
  return mantissa;
}

export function extractFirstDigit(value: number): number | null {
  const s = significantDigitsString(value);
  if (!s) return null;
  const d = parseInt(s[0], 10);
  return d >= 1 && d <= 9 ? d : null;
}

export function extractSecondDigit(value: number): number | null {
  const s = significantDigitsString(value);
  if (!s || s.length < 2) return null;
  const d = parseInt(s[1], 10);
  return d >= 0 && d <= 9 ? d : null;
}

export function extractFirstTwoDigits(value: number): number | null {
  const s = significantDigitsString(value);
  if (!s || s.length < 2) return null;
  const d = parseInt(s.slice(0, 2), 10);
  return d >= 10 && d <= 99 ? d : null;
}

// ------------------------------------------------------------
// 2. Distributions théoriques de Benford
// ------------------------------------------------------------

/** P(D1 = d) = log10(1 + 1/d), d ∈ [1..9] */
export function theoreticalFirstDigit(d: number): number {
  return Math.log10(1 + 1 / d);
}

/** P(D2 = d) = Σ_{k=1}^{9} log10(1 + 1/(10k + d)), d ∈ [0..9] */
export function theoreticalSecondDigit(d: number): number {
  let p = 0;
  for (let k = 1; k <= 9; k++) p += Math.log10(1 + 1 / (10 * k + d));
  return p;
}

/** P(D1D2 = n) = log10(1 + 1/n), n ∈ [10..99] */
export function theoreticalFirstTwoDigits(n: number): number {
  return Math.log10(1 + 1 / n);
}

function digitRange(type: BenfordDigitType): number[] {
  if (type === 'first') return Array.from({ length: 9 }, (_, i) => i + 1); // 1..9
  if (type === 'second') return Array.from({ length: 10 }, (_, i) => i); // 0..9
  return Array.from({ length: 90 }, (_, i) => i + 10); // 10..99
}

function theoreticalFor(type: BenfordDigitType, d: number): number {
  if (type === 'first') return theoreticalFirstDigit(d);
  if (type === 'second') return theoreticalSecondDigit(d);
  return theoreticalFirstTwoDigits(d);
}

function extractorFor(type: BenfordDigitType): (v: number) => number | null {
  if (type === 'first') return extractFirstDigit;
  if (type === 'second') return extractSecondDigit;
  return extractFirstTwoDigits;
}

// ------------------------------------------------------------
// 3. Chi-carré : statistique + valeur critique (approximation de Wilson-Hilferty
//    pour les grands degrés de liberté, table exacte pour les cas usuels)
// ------------------------------------------------------------

const EXACT_CHI_SQUARE: Record<number, { p95: number; p99: number }> = {
  8: { p95: 15.507, p99: 20.09 },
  9: { p95: 16.919, p99: 21.666 },
};

function chiSquareCriticalValue(df: number, alpha95: boolean): number {
  const exact = EXACT_CHI_SQUARE[df];
  if (exact) return alpha95 ? exact.p95 : exact.p99;
  // Approximation de Wilson-Hilferty (précise pour df modérés/grands, ex: df=89)
  const z = alpha95 ? 1.645 : 2.326;
  const term = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
  return df * term ** 3;
}

function computeChiSquare(distribution: DigitDistribution[], sampleSize: number): BenfordChiSquare {
  let statistic = 0;
  for (const bucket of distribution) {
    const expectedCount = bucket.expectedFrequency * sampleSize;
    if (expectedCount === 0) continue;
    statistic += (bucket.observedCount - expectedCount) ** 2 / expectedCount;
  }
  const degreesOfFreedom = distribution.length - 1;
  const criticalValue95 = chiSquareCriticalValue(degreesOfFreedom, true);
  const criticalValue99 = chiSquareCriticalValue(degreesOfFreedom, false);
  return {
    statistic,
    degreesOfFreedom,
    criticalValue95,
    criticalValue99,
    passesAt95: statistic <= criticalValue95,
    passesAt99: statistic <= criticalValue99,
  };
}

// ------------------------------------------------------------
// 4. MAD (Mean Absolute Deviation) — seuils de Nigrini
// ------------------------------------------------------------

const MAD_THRESHOLDS: Record<BenfordDigitType, { close: number; acceptable: number; marginal: number }> = {
  first: { close: 0.006, acceptable: 0.012, marginal: 0.015 },
  second: { close: 0.008, acceptable: 0.01, marginal: 0.012 },
  firstTwo: { close: 0.0012, acceptable: 0.0018, marginal: 0.0022 },
};

function computeMAD(distribution: DigitDistribution[], type: BenfordDigitType): BenfordMAD {
  const value =
    distribution.reduce((acc, b) => acc + Math.abs(b.deviation), 0) / distribution.length;
  const t = MAD_THRESHOLDS[type];
  let interpretation: MADInterpretation;
  if (value <= t.close) interpretation = 'conformite-proche';
  else if (value <= t.acceptable) interpretation = 'conformite-acceptable';
  else if (value <= t.marginal) interpretation = 'conformite-marginale';
  else interpretation = 'non-conforme';
  return { value, interpretation };
}

// ------------------------------------------------------------
// 5. Score de conformité normalisé (0-100)
//    50% chi-carré (position par rapport aux seuils critiques)
//    50% MAD (position par rapport aux seuils de Nigrini)
// ------------------------------------------------------------

function chiSquareScore(chi: BenfordChiSquare): number {
  if (chi.statistic <= chi.criticalValue95) {
    // Zone de conformité : score entre 80 et 100
    return 100 - (chi.statistic / chi.criticalValue95) * 20;
  }
  if (chi.statistic <= chi.criticalValue99) {
    // Zone intermédiaire : score entre 50 et 80
    const ratio =
      (chi.statistic - chi.criticalValue95) / (chi.criticalValue99 - chi.criticalValue95);
    return 80 - ratio * 30;
  }
  // Au-delà du seuil à 99% : décroissance continue vers 0
  const excess = chi.statistic / chi.criticalValue99;
  return Math.max(0, 50 - (excess - 1) * 25);
}

function madScore(mad: BenfordMAD, type: BenfordDigitType): number {
  const t = MAD_THRESHOLDS[type];
  if (mad.value <= t.close) return 100 - (mad.value / t.close) * 10;
  if (mad.value <= t.acceptable) {
    const ratio = (mad.value - t.close) / (t.acceptable - t.close);
    return 90 - ratio * 20;
  }
  if (mad.value <= t.marginal) {
    const ratio = (mad.value - t.acceptable) / (t.marginal - t.acceptable);
    return 70 - ratio * 30;
  }
  const excess = mad.value / t.marginal;
  return Math.max(0, 40 - (excess - 1) * 40);
}

// ------------------------------------------------------------
// 6. Analyse complète pour un type de chiffre donné
// ------------------------------------------------------------

export function analyzeBenfordDigit(
  values: number[],
  type: BenfordDigitType,
): BenfordAnalysisResult {
  const extractor = extractorFor(type);
  const digits = digitRange(type);
  const counts = new Map<number, number>();
  for (const d of digits) counts.set(d, 0);

  let sampleSize = 0;
  for (const raw of values) {
    const d = extractor(raw);
    if (d === null) continue;
    counts.set(d, (counts.get(d) ?? 0) + 1);
    sampleSize++;
  }

  const distribution: DigitDistribution[] = digits.map((d) => {
    const observedCount = counts.get(d) ?? 0;
    const observedFrequency = sampleSize > 0 ? observedCount / sampleSize : 0;
    const expectedFrequency = theoreticalFor(type, d);
    const deviation = observedFrequency - expectedFrequency;
    return {
      digit: d,
      observedCount,
      observedFrequency,
      expectedFrequency,
      deviation,
      deviationPercent: expectedFrequency > 0 ? (deviation / expectedFrequency) * 100 : 0,
    };
  });

  const chiSquare = computeChiSquare(distribution, sampleSize);
  const mad = computeMAD(distribution, type);
  const score = Math.round(0.5 * chiSquareScore(chiSquare) + 0.5 * madScore(mad, type));

  return {
    digitType: type,
    sampleSize,
    distribution,
    chiSquare,
    mad,
    score: Math.max(0, Math.min(100, score)),
  };
}

// ------------------------------------------------------------
// 7. Rapport complet (3 tests combinés) + résumé explicable
// ------------------------------------------------------------

export function generateBenfordReport(columnName: string, values: number[]): BenfordReport {
  const firstDigit = analyzeBenfordDigit(values, 'first');
  const secondDigit = analyzeBenfordDigit(values, 'second');
  const firstTwoDigits = analyzeBenfordDigit(values, 'firstTwo');

  // Le premier chiffre pèse davantage : c'est le test Benford de référence, le plus robuste statistiquement
  const overallScore = Math.round(
    0.5 * firstDigit.score + 0.2 * secondDigit.score + 0.3 * firstTwoDigits.score,
  );

  const summary: string[] = [];
  summary.push(
    `Test du premier chiffre : ${describeInterpretation(firstDigit.mad.interpretation)} (MAD = ${firstDigit.mad.value.toFixed(4)}, χ² = ${firstDigit.chiSquare.statistic.toFixed(2)} sur ${firstDigit.sampleSize} valeurs).`,
  );
  summary.push(
    `Test du deuxième chiffre : ${describeInterpretation(secondDigit.mad.interpretation)} (MAD = ${secondDigit.mad.value.toFixed(4)}).`,
  );
  summary.push(
    `Test des deux premiers chiffres : ${describeInterpretation(firstTwoDigits.mad.interpretation)} (MAD = ${firstTwoDigits.mad.value.toFixed(4)}).`,
  );

  const strongestDeviation = [...firstDigit.distribution].sort(
    (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation),
  )[0];
  if (strongestDeviation) {
    summary.push(
      `Chiffre le plus atypique (1er chiffre) : "${strongestDeviation.digit}", observé ${(strongestDeviation.observedFrequency * 100).toFixed(2)}% vs ${(strongestDeviation.expectedFrequency * 100).toFixed(2)}% attendu.`,
    );
  }

  return { columnName, firstDigit, secondDigit, firstTwoDigits, overallScore, summary };
}

export type VerdictTier = 'naturel' | 'a-surveiller' | 'suspect';

export interface Verdict {
  tier: VerdictTier;
  title: string;
  message: string;
}

/** Traduit le score en verdict compréhensible sans connaître la loi de Benford */
export function generateVerdict(overallScore: number): Verdict {
  if (overallScore >= 80) {
    return {
      tier: 'naturel',
      title: 'Ces données semblent naturelles',
      message:
        'La répartition des chiffres correspond à ce que l\'on observe dans la grande majorité des jeux de données réels, non modifiés.',
    };
  }
  if (overallScore >= 50) {
    return {
      tier: 'a-surveiller',
      title: 'Quelques écarts, à surveiller',
      message:
        'La répartition des chiffres s\'écarte modérément de ce qui est attendu. Cela peut être normal selon le contexte (petits échantillons, données bornées), mais mérite un second regard.',
    };
  }
  return {
    tier: 'suspect',
    title: 'Écarts importants détectés',
    message:
      'La répartition des chiffres diffère nettement de ce qui est attendu naturellement. Cela peut indiquer des données arrondies, fabriquées ou modifiées manuellement — une vérification approfondie est recommandée.',
  };
}

/** Résumé en langage simple, sans jargon statistique, pour l'utilisateur non-expert */
export function generatePlainSummary(report: BenfordReport): string[] {
  const lines: string[] = [];
  const strongest = [...report.firstDigit.distribution].sort(
    (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation),
  )[0];

  if (strongest && Math.abs(strongest.deviationPercent) > 15) {
    const direction = strongest.deviation > 0 ? 'plus souvent' : 'moins souvent';
    lines.push(
      `Le chiffre "${strongest.digit}" apparaît en tête des nombres ${direction} que prévu (${(strongest.observedFrequency * 100).toFixed(1)}% observé contre ${(strongest.expectedFrequency * 100).toFixed(1)}% attendu).`,
    );
  } else {
    lines.push('Aucun chiffre ne se démarque anormalement en tête des nombres.');
  }

  const consistencyNote =
    report.secondDigit.score >= 70 && report.firstTwoDigits.score >= 70
      ? 'Les vérifications complémentaires (2e chiffre, 2 premiers chiffres) confirment cette tendance.'
      : 'Les vérifications complémentaires montrent des résultats plus contrastés — une revue manuelle peut aider à trancher.';
  lines.push(consistencyNote);

  return lines;
}

function describeInterpretation(i: MADInterpretation): string {
  switch (i) {
    case 'conformite-proche':
      return 'conformité proche de la loi de Benford';
    case 'conformite-acceptable':
      return 'conformité acceptable';
    case 'conformite-marginale':
      return 'conformité marginale, à surveiller';
    case 'non-conforme':
      return 'non-conforme à la loi de Benford';
  }
}
