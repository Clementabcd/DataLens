import type { DescriptiveStatistics } from '../types';

function fmt(n: number, decimals = 3): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('fr-FR', { maximumFractionDigits: decimals, minimumFractionDigits: 0 });
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className="font-data text-lg text-ink-900">{value}</div>
    </div>
  );
}

export default function StatsGrid({ stats }: { stats: DescriptiveStatistics }) {
  return (
    <div className="panel rounded-xl p-5">
      <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">Statistiques descriptives</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cell label="Effectif" value={fmt(stats.count, 0)} />
        <Cell label="Moyenne" value={fmt(stats.mean)} />
        <Cell label="Médiane" value={fmt(stats.median)} />
        <Cell label="Mode" value={stats.mode.length ? stats.mode.map((m) => fmt(m)).join(', ') : '—'} />
        <Cell label="Min" value={fmt(stats.min)} />
        <Cell label="Max" value={fmt(stats.max)} />
        <Cell label="Étendue" value={fmt(stats.range)} />
        <Cell label="Écart-type (éch.)" value={fmt(stats.stdDev)} />
        <Cell label="Variance (éch.)" value={fmt(stats.variance)} />
        <Cell label="Coeff. variation" value={`${fmt(stats.coefficientOfVariation, 1)} %`} />
        <Cell label="Q1 / Q3" value={`${fmt(stats.quartiles.q1)} / ${fmt(stats.quartiles.q3)}`} />
        <Cell label="IQR" value={fmt(stats.quartiles.iqr)} />
        <Cell label="Asymétrie (skew)" value={fmt(stats.skewness)} />
        <Cell label="Kurtosis (excès)" value={fmt(stats.kurtosis)} />
        <Cell label="Entropie" value={`${fmt(stats.entropy)} bits`} />
        <Cell label="Somme" value={fmt(stats.sum)} />
      </div>
    </div>
  );
}
