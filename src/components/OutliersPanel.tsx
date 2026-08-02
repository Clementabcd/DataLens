import {
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { OutlierReport } from '../core/outliers';

const SEVERITY_COLOR: Record<string, string> = {
  faible: '#b5762a',
  modere: '#b5762a',
  eleve: '#a3402f',
};

interface OutliersPanelProps {
  report: OutlierReport;
  values: number[];
}

export default function OutliersPanel({ report, values }: OutliersPanelProps) {
  const iqrMethod = report.methods.find((m) => m.method === 'iqr');

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="panel rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm uppercase tracking-wider text-ink-500">
              Répartition des valeurs
            </h3>
            <span className="font-data text-xs text-ink-500">
              {report.combined.length} point(s) signalé(s)
            </span>
          </div>
          <ScatterChartWrapper report={report} values={values} />
          <p className="text-xs text-ink-300 mt-2">
            Zone verte : bornes de Tukey {iqrMethod ? `(${iqrMethod.description.split('=')[1]?.trim() ?? ''})` : ''}. Points cuivre/rouille : valeurs signalées par au moins une méthode.
          </p>
        </div>

        <div className="panel rounded-xl p-5">
          <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">Intégrité</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Valeurs manquantes/invalides</dt>
              <dd className="font-data text-ink-900">{report.integrity.missingCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Doublons (occurrences en trop)</dt>
              <dd className="font-data text-ink-900">{report.integrity.duplicateCount}</dd>
            </div>
          </dl>
          {report.integrity.duplicateValues.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-ink-300 mb-2">
                Valeurs les plus dupliquées
              </div>
              <ul className="font-data text-xs text-ink-500 space-y-1">
                {report.integrity.duplicateValues.slice(0, 5).map((d) => (
                  <li key={d.value} className="flex justify-between">
                    <span>{d.value}</span>
                    <span>× {d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="panel rounded-xl p-5">
        <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">
          Méthodes de détection
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.methods.map((m) => (
            <div key={m.method} className="border border-line rounded-lg p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-ink-900">{m.label}</span>
                <span className="font-data text-lg text-ink-900">{m.flaggedIndices.length}</span>
              </div>
              <p className="text-xs text-ink-300 mt-1 leading-relaxed">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {report.combined.length > 0 && (
        <div className="panel rounded-xl p-5 overflow-x-auto">
          <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">
            Valeurs signalées (triées par sévérité)
          </h3>
          <table className="w-full text-sm font-data">
            <thead>
              <tr className="text-left text-ink-300 text-xs uppercase tracking-wider">
                <th className="pb-2 pr-4">Index</th>
                <th className="pb-2 pr-4">Valeur</th>
                <th className="pb-2 pr-4">Sévérité</th>
                <th className="pb-2">Méthodes concordantes</th>
              </tr>
            </thead>
            <tbody>
              {report.combined.slice(0, 50).map((p) => (
                <tr key={p.index} className="border-t border-line">
                  <td className="py-2 pr-4 text-ink-500">{p.index}</td>
                  <td className="py-2 pr-4 text-ink-900">{p.value}</td>
                  <td className="py-2 pr-4" style={{ color: SEVERITY_COLOR[p.severity] }}>
                    {p.severity}
                  </td>
                  <td className="py-2 text-ink-500">{p.methods.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.combined.length > 50 && (
            <p className="text-xs text-ink-300 mt-3">
              {report.combined.length - 50} valeur(s) supplémentaire(s) non affichée(s).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ScatterChartWrapper({ report, values }: { report: OutlierReport; values: number[] }) {
  const iqrMethod = report.methods.find((m) => m.method === 'iqr');
  const fenceMatch = iqrMethod?.description.match(/\[(-?[\d.]+), (-?[\d.]+)\]/);
  const lowerFence = fenceMatch ? parseFloat(fenceMatch[1]) : undefined;
  const upperFence = fenceMatch ? parseFloat(fenceMatch[2]) : undefined;

  const flaggedIdx = new Set(report.combined.map((p) => p.index));
  // Échantillonnage pour rester lisible et performant sur de gros jeux de données
  const maxPlotted = 2000;
  const stride = Math.max(1, Math.floor(values.length / maxPlotted));

  const normalPoints: { x: number; y: number }[] = [];
  const flaggedPoints: { x: number; y: number }[] = [];
  values.forEach((v, i) => {
    if (flaggedIdx.has(i)) {
      flaggedPoints.push({ x: i, y: v });
    } else if (i % stride === 0) {
      normalPoints.push({ x: i, y: v });
    }
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#e6e3db" />
        <XAxis
          type="number"
          dataKey="x"
          name="index"
          tick={{ fill: '#6f6c62', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#e6e3db' }}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          name="valeur"
          tick={{ fill: '#6f6c62', fontSize: 11, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: '#e6e3db' }}
          tickLine={false}
        />
        {lowerFence !== undefined && upperFence !== undefined && (
          <ReferenceArea y1={lowerFence} y2={upperFence} fill="#5c7a5e" fillOpacity={0.08} />
        )}
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{
            background: '#ffffff',
            border: '1px solid #e6e3db',
            borderRadius: 8,
            fontFamily: 'JetBrains Mono',
            fontSize: 12,
          }}
        />
        <Scatter data={normalPoints} fill="#a6a297" />
        <Scatter data={flaggedPoints} fill="#a3402f" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
