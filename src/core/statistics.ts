// ============================================================
// DataLens Core — Statistics Engine
// Toutes les formules sont documentées pour rester explicables.
// ============================================================

import type { DescriptiveStatistics } from '../types';

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

/** Percentile par interpolation linéaire (méthode "linear", type R-7 / Excel PERCENTILE.INC) */
export function percentile(sortedValues: number[], p: number): number {
  const n = sortedValues.length;
  if (n === 0) return NaN;
  if (n === 1) return sortedValues[0];
  const rank = p * (n - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  if (lowerIndex === upperIndex) return sortedValues[lowerIndex];
  const fraction = rank - lowerIndex;
  return (
    sortedValues[lowerIndex] +
    fraction * (sortedValues[upperIndex] - sortedValues[lowerIndex])
  );
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  return percentile(sorted(values), 0.5);
}

export function mode(values: number[]): number[] {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let maxCount = 0;
  for (const c of counts.values()) maxCount = Math.max(maxCount, c);
  if (maxCount <= 1) return []; // pas de mode significatif
  const modes: number[] = [];
  for (const [v, c] of counts.entries()) if (c === maxCount) modes.push(v);
  return modes.sort((a, b) => a - b);
}

/** Variance d'échantillon (division par n-1) — estimateur non biaisé */
export function sampleVariance(values: number[], m?: number): number {
  const n = values.length;
  if (n < 2) return 0;
  const mu = m ?? mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - mu) ** 2, 0);
  return sumSq / (n - 1);
}

/** Variance de population (division par n) */
export function populationVariance(values: number[], m?: number): number {
  const n = values.length;
  if (n === 0) return 0;
  const mu = m ?? mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - mu) ** 2, 0);
  return sumSq / n;
}

/** Asymétrie de Fisher-Pearson, avec correction d'échantillon (g1 ajusté) */
export function skewness(values: number[], m?: number): number {
  const n = values.length;
  if (n < 3) return 0;
  const mu = m ?? mean(values);
  const s = Math.sqrt(populationVariance(values, mu));
  if (s === 0) return 0;
  const m3 = values.reduce((acc, v) => acc + (v - mu) ** 3, 0) / n;
  const g1 = m3 / s ** 3;
  // Correction d'échantillon (adjusted Fisher-Pearson standardized moment coefficient)
  return (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
}

/** Excès de kurtosis (0 = distribution normale), correction d'échantillon */
export function kurtosis(values: number[], m?: number): number {
  const n = values.length;
  if (n < 4) return 0;
  const mu = m ?? mean(values);
  const variance = populationVariance(values, mu);
  if (variance === 0) return 0;
  const m4 = values.reduce((acc, v) => acc + (v - mu) ** 4, 0) / n;
  const g2 = m4 / variance ** 2 - 3;
  // Correction d'échantillon (excess kurtosis, sample-adjusted)
  return ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
}

/** Entropie de Shannon (en bits) calculée sur un histogramme (règle de Sturges pour le nb de bins) */
export function shannonEntropy(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 0;
  const binCount = Math.max(2, Math.ceil(Math.log2(n) + 1)); // règle de Sturges
  const binWidth = (max - min) / binCount;
  const bins = new Array(binCount).fill(0);
  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx]++;
  }
  let entropy = 0;
  for (const count of bins) {
    if (count === 0) continue;
    const p = count / n;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function computeDescriptiveStatistics(values: number[]): DescriptiveStatistics {
  const s = sorted(values);
  const n = s.length;
  const mu = mean(s);
  const med = percentile(s, 0.5);
  const varSample = sampleVariance(s, mu);
  const varPop = populationVariance(s, mu);
  const stdDevSample = Math.sqrt(varSample);
  const stdDevPop = Math.sqrt(varPop);
  const q1 = percentile(s, 0.25);
  const q3 = percentile(s, 0.75);
  const deciles = Array.from({ length: 9 }, (_, i) => percentile(s, (i + 1) / 10));

  return {
    count: n,
    sum: s.reduce((a, b) => a + b, 0),
    mean: mu,
    median: med,
    mode: mode(s),
    min: n > 0 ? s[0] : NaN,
    max: n > 0 ? s[n - 1] : NaN,
    range: n > 0 ? s[n - 1] - s[0] : NaN,
    variance: varSample,
    populationVariance: varPop,
    stdDev: stdDevSample,
    populationStdDev: stdDevPop,
    coefficientOfVariation: mu !== 0 ? (stdDevSample / Math.abs(mu)) * 100 : NaN,
    quartiles: { q1, q2: med, q3, iqr: q3 - q1 },
    deciles,
    skewness: skewness(s, mu),
    kurtosis: kurtosis(s, mu),
    entropy: shannonEntropy(s),
  };
}
