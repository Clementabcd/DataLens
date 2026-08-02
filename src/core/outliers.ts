// ============================================================
// DataLens Core — Outlier Engine
// Toutes les méthodes sont déterministes et documentées.
// ============================================================

import { mean, percentile, populationVariance } from './statistics';

export type OutlierMethod = 'zscore' | 'modifiedZscore' | 'mad' | 'iqr' | 'grubbs';

export interface FlaggedPoint {
  index: number; // position dans le tableau de valeurs d'origine
  value: number;
  methods: OutlierMethod[]; // méthodes ayant flaggé ce point
  severity: 'faible' | 'modere' | 'eleve'; // basé sur le nombre de méthodes concordantes
}

export interface OutlierMethodResult {
  method: OutlierMethod;
  label: string;
  description: string;
  threshold: number;
  flaggedIndices: number[];
}

export interface IntegrityFindings {
  duplicateCount: number;
  duplicateValues: { value: number; count: number }[];
  missingCount: number; // valeurs manquantes/invalides retirées à l'import
}

export interface OutlierReport {
  methods: OutlierMethodResult[];
  combined: FlaggedPoint[]; // union de toutes les méthodes, avec sévérité
  integrity: IntegrityFindings;
}

function median(sortedValues: number[]): number {
  return percentile(sortedValues, 0.5);
}

// ------------------------------------------------------------
// 1. Z-score classique : (x - μ) / σ, seuil habituel |z| > 3
// ------------------------------------------------------------
function zScoreMethod(values: number[], threshold = 3): OutlierMethodResult {
  const mu = mean(values);
  const sigma = Math.sqrt(populationVariance(values, mu));
  const flaggedIndices: number[] = [];
  if (sigma > 0) {
    values.forEach((v, i) => {
      if (Math.abs((v - mu) / sigma) > threshold) flaggedIndices.push(i);
    });
  }
  return {
    method: 'zscore',
    label: 'Z-score',
    description: `Écart à la moyenne exprimé en écarts-types (seuil |z| > ${threshold})`,
    threshold,
    flaggedIndices,
  };
}

// ------------------------------------------------------------
// 2. Z-score modifié : 0.6745 × (x - médiane) / MAD, seuil usuel 3.5
//    (Iglewicz & Hoaglin, 1993) — robuste aux valeurs extrêmes
// ------------------------------------------------------------
function medianAbsoluteDeviation(values: number[], med: number): number {
  const deviations = values.map((v) => Math.abs(v - med));
  return median([...deviations].sort((a, b) => a - b));
}

function modifiedZScoreMethod(values: number[], threshold = 3.5): OutlierMethodResult {
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = medianAbsoluteDeviation(values, med);
  const flaggedIndices: number[] = [];
  if (mad > 0) {
    values.forEach((v, i) => {
      const modifiedZ = (0.6745 * (v - med)) / mad;
      if (Math.abs(modifiedZ) > threshold) flaggedIndices.push(i);
    });
  }
  return {
    method: 'modifiedZscore',
    label: 'Z-score modifié',
    description: `Version robuste basée sur la médiane et le MAD (seuil |z\'| > ${threshold})`,
    threshold,
    flaggedIndices,
  };
}

// ------------------------------------------------------------
// 3. MAD brut : distance à la médiane exprimée en multiples du MAD non standardisé
//    (complémentaire du Z-score modifié : seuil en unités MAD directes, k = 3)
// ------------------------------------------------------------
function madMethod(values: number[], k = 3): OutlierMethodResult {
  const sorted = [...values].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = medianAbsoluteDeviation(values, med);
  const flaggedIndices: number[] = [];
  if (mad > 0) {
    values.forEach((v, i) => {
      if (Math.abs(v - med) / mad > k) flaggedIndices.push(i);
    });
  }
  return {
    method: 'mad',
    label: 'MAD',
    description: `Distance à la médiane en multiples du MAD non standardisé (seuil k = ${k})`,
    threshold: k,
    flaggedIndices,
  };
}

// ------------------------------------------------------------
// 4. IQR / Tukey : bornes Q1 - k×IQR et Q3 + k×IQR, k = 1.5 (fences classiques de Tukey)
// ------------------------------------------------------------
function iqrTukeyMethod(values: number[], k = 1.5): OutlierMethodResult {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - k * iqr;
  const upperFence = q3 + k * iqr;
  const flaggedIndices: number[] = [];
  values.forEach((v, i) => {
    if (v < lowerFence || v > upperFence) flaggedIndices.push(i);
  });
  return {
    method: 'iqr',
    label: 'IQR (Tukey)',
    description: `Bornes de Tukey Q1 - ${k}×IQR / Q3 + ${k}×IQR = [${lowerFence.toFixed(2)}, ${upperFence.toFixed(2)}]`,
    threshold: k,
    flaggedIndices,
  };
}

// ------------------------------------------------------------
// 5. Test de Grubbs : détecte la valeur la plus extrême d'un échantillon
//    supposé normal. G = max|x - μ| / σ, comparé à une valeur critique
//    dérivée de la loi de Student (approximation de la quantile t).
// ------------------------------------------------------------

/** Approximation de la quantile de la loi normale standard (Beasley-Springer-Moro simplifiée) */
function normalQuantile(p: number): number {
  // Approximation rationnelle d'Abramowitz & Stegun (26.2.23), précision ~1e-4
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const clampedP = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  const isUpper = clampedP > 0.5;
  const q = isUpper ? 1 - clampedP : clampedP;
  const t = Math.sqrt(-2 * Math.log(q));
  const z = t - (a[0] + a[1] * t + a[2] * t * t) / (1 + b[0] * t + b[1] * t * t + b[2] * t * t * t);
  return isUpper ? z : -z;
}

/** Approximation de la quantile de Student par expansion de Cornish-Fisher autour de la normale */
function studentTQuantile(p: number, df: number): number {
  const z = normalQuantile(p);
  const z3 = z ** 3;
  const z5 = z ** 5;
  // Termes correctifs standards de l'expansion de Cornish-Fisher pour la loi de Student
  const g1 = (z3 + z) / (4 * df);
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / (96 * df ** 2);
  return z + g1 + g2;
}

function grubbsCriticalValue(n: number, alpha = 0.05): number {
  const df = n - 2;
  if (df < 1) return Infinity;
  const tCritical = studentTQuantile(1 - alpha / (2 * n), df);
  const tSquared = tCritical ** 2;
  return ((n - 1) / Math.sqrt(n)) * Math.sqrt(tSquared / (df + tSquared));
}

function grubbsMethod(values: number[], alpha = 0.05): OutlierMethodResult {
  const n = values.length;
  const mu = mean(values);
  const sigma = Math.sqrt(populationVariance(values, mu));
  const flaggedIndices: number[] = [];
  if (n >= 7 && sigma > 0) {
    // On identifie le point le plus extrême ; si G dépasse la valeur critique, il est flaggé
    let maxG = 0;
    let maxIdx = -1;
    values.forEach((v, i) => {
      const g = Math.abs(v - mu) / sigma;
      if (g > maxG) {
        maxG = g;
        maxIdx = i;
      }
    });
    const critical = grubbsCriticalValue(n, alpha);
    if (maxIdx >= 0 && maxG > critical) flaggedIndices.push(maxIdx);
  }
  return {
    method: 'grubbs',
    label: 'Grubbs',
    description:
      n >= 7
        ? `Test de la valeur la plus extrême (α = ${alpha}) — approximation Cornish-Fisher, valide pour données ~normales`
        : 'Échantillon trop petit (n < 7) pour un test de Grubbs fiable',
    threshold: n >= 7 ? grubbsCriticalValue(n, alpha) : NaN,
    flaggedIndices,
  };
}

// ------------------------------------------------------------
// 6. Intégrité : doublons (les valeurs manquantes sont comptées en amont, au parsing)
// ------------------------------------------------------------
function findDuplicates(values: number[]): { value: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .filter(([, c]) => c > 1)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

// ------------------------------------------------------------
// 7. Rapport combiné
// ------------------------------------------------------------
export function analyzeOutliers(values: number[], missingCount = 0): OutlierReport {
  const methods: OutlierMethodResult[] = [
    zScoreMethod(values),
    modifiedZScoreMethod(values),
    madMethod(values),
    iqrTukeyMethod(values),
    grubbsMethod(values),
  ];

  const byIndex = new Map<number, OutlierMethod[]>();
  for (const m of methods) {
    for (const idx of m.flaggedIndices) {
      const list = byIndex.get(idx) ?? [];
      list.push(m.method);
      byIndex.set(idx, list);
    }
  }

  const combined: FlaggedPoint[] = Array.from(byIndex.entries())
    .map(([index, flaggedMethods]) => ({
      index,
      value: values[index],
      methods: flaggedMethods,
      severity: (flaggedMethods.length >= 3
        ? 'eleve'
        : flaggedMethods.length === 2
          ? 'modere'
          : 'faible') as FlaggedPoint['severity'],
    }))
    .sort((a, b) => b.methods.length - a.methods.length);

  const duplicateValues = findDuplicates(values);
  const duplicateCount = duplicateValues.reduce((acc, d) => acc + (d.count - 1), 0);

  return {
    methods,
    combined,
    integrity: { duplicateCount, duplicateValues, missingCount },
  };
}
