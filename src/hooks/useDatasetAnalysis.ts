import { useMemo } from 'react';
import { generateBenfordReport, generateVerdict, generatePlainSummary } from '../core/benford';
import { computeDescriptiveStatistics } from '../core/statistics';
import { analyzeOutliers } from '../core/outliers';

export function useDatasetAnalysis(label: string, values: number[], missingCount = 0) {
  return useMemo(() => {
    if (values.length < 5) {
      return { benford: null, verdict: null, plainSummary: null, stats: null, outliers: null };
    }
    const benford = generateBenfordReport(label, values);
    const verdict = generateVerdict(benford.overallScore);
    const plainSummary = generatePlainSummary(benford);
    const stats = computeDescriptiveStatistics(values);
    const outliers = analyzeOutliers(values, missingCount);
    return { benford, verdict, plainSummary, stats, outliers };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, values, missingCount]);
}
