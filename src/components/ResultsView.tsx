import { useState } from 'react';
import VerdictCard from './VerdictCard';
import BenfordChart from './BenfordChart';
import StatsGrid from './StatsGrid';
import OutliersPanel from './OutliersPanel';
import BenfordExplainer from './BenfordExplainer';
import { useDatasetAnalysis } from '../hooks/useDatasetAnalysis';

type ResultTab = 'apercu' | 'details' | 'anomalies';

export default function ResultsView({
  label,
  values,
  missingCount = 0,
}: {
  label: string;
  values: number[];
  missingCount?: number;
}) {
  const [tab, setTab] = useState<ResultTab>('apercu');
  const { benford, verdict, plainSummary, stats, outliers } = useDatasetAnalysis(
    label,
    values,
    missingCount,
  );

  if (!benford || !verdict || !plainSummary || !stats || !outliers) {
    return (
      <div className="panel rounded-xl p-6 text-accent text-sm">
        Échantillon trop faible ({values.length} valeurs numériques) pour une analyse fiable.
      </div>
    );
  }

  const anomalyCount = outliers.combined.length;

  return (
    <div className="space-y-6">
      <VerdictCard verdict={verdict} score={benford.overallScore} plainSummary={plainSummary} />

      <div className="flex gap-1 border-b border-line">
        {(
          [
            ['apercu', 'Aperçu'],
            ['anomalies', `Anomalies${anomalyCount ? ` (${anomalyCount})` : ''}`],
            ['details', 'Détails techniques'],
          ] as [ResultTab, string][]
        ).map(([key, tabLabel]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-accent text-ink-900'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="space-y-6">
          <BenfordChart result={benford.firstDigit} title="Répartition du premier chiffre" />
          <BenfordExplainer compact />
        </div>
      )}

      {tab === 'details' && (
        <div className="space-y-6">
          <div className="panel rounded-xl p-5">
            <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-3">
              Résumé technique — {benford.columnName}
            </h3>
            <ul className="space-y-1.5 text-sm text-ink-900 font-data">
              {benford.summary.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <BenfordChart result={benford.firstDigit} title="Premier chiffre" />
            <BenfordChart result={benford.secondDigit} title="Deuxième chiffre" />
            <BenfordChart result={benford.firstTwoDigits} title="Deux premiers chiffres" />
          </div>
          <StatsGrid stats={stats} />
        </div>
      )}

      {tab === 'anomalies' && <OutliersPanel report={outliers} values={values} />}
    </div>
  );
}
