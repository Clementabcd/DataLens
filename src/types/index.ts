// ============================================================
// DataLens — Types partagés du moteur scientifique
// ============================================================

export interface Dataset {
  columnName: string;
  values: number[];
  rawCount: number; // avant filtrage des valeurs invalides
}

export interface DigitDistribution {
  digit: number; // 0-9 (ou 10-99 pour les deux premiers chiffres)
  observedCount: number;
  observedFrequency: number; // proportion observée
  expectedFrequency: number; // proportion théorique de Benford
  deviation: number; // observedFrequency - expectedFrequency
  deviationPercent: number; // en % relatif à l'attendu
}

export type BenfordDigitType = 'first' | 'second' | 'firstTwo';

export interface BenfordChiSquare {
  statistic: number;
  degreesOfFreedom: number;
  criticalValue95: number;
  criticalValue99: number;
  passesAt95: boolean;
  passesAt99: boolean;
}

export interface BenfordMAD {
  value: number; // Mean Absolute Deviation
  interpretation: MADInterpretation;
}

export type MADInterpretation =
  | 'conformite-proche'
  | 'conformite-acceptable'
  | 'conformite-marginale'
  | 'non-conforme';

export interface BenfordAnalysisResult {
  digitType: BenfordDigitType;
  sampleSize: number;
  distribution: DigitDistribution[];
  chiSquare: BenfordChiSquare;
  mad: BenfordMAD;
  score: number; // 0-100, score de conformité normalisé
}

export interface BenfordReport {
  columnName: string;
  firstDigit: BenfordAnalysisResult;
  secondDigit: BenfordAnalysisResult;
  firstTwoDigits: BenfordAnalysisResult;
  overallScore: number; // 0-100
  summary: string[];
}

export interface DescriptiveStatistics {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number; // variance d'échantillon (n-1)
  populationVariance: number; // variance de population (n)
  stdDev: number;
  populationStdDev: number;
  coefficientOfVariation: number; // en %
  quartiles: { q1: number; q2: number; q3: number; iqr: number };
  deciles: number[]; // D1..D9
  skewness: number; // asymétrie (Fisher-Pearson corrigée)
  kurtosis: number; // excès de kurtosis (0 = normale)
  entropy: number; // entropie de Shannon (bits), sur histogramme
}
