import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  detectNumericColumns,
  extractDataset,
  parseFile,
  type ParsedTable,
} from '../core/fileParser';
import { generateBenfordReport } from '../core/benford';
import { computeDescriptiveStatistics } from '../core/statistics';

interface ComparisonSource {
  id: string;
  label: string;
  values: number[];
}

const PALETTE = ['#b5762a', '#5c7a5e', '#3d5a80', '#a3402f', '#7a5c9e', '#6f6c62'];

function useSourceAnalyses(sources: ComparisonSource[]) {
  return useMemo(
    () =>
      sources.map((s) => ({
        ...s,
        benford: s.values.length >= 5 ? generateBenfordReport(s.label, s.values) : null,
        stats: s.values.length > 0 ? computeDescriptiveStatistics(s.values) : null,
      })),
    [sources],
  );
}

export default function ComparisonView({
  currentTable,
  currentNumericColumns,
}: {
  currentTable: ParsedTable | null;
  currentNumericColumns: string[];
}) {
  const [mode, setMode] = useState<'fichiers' | 'colonnes'>(currentTable ? 'colonnes' : 'fichiers');
  const [fileSources, setFileSources] = useState<ComparisonSource[]>([]);
  const [columnSources, setColumnSources] = useState<string[]>(
    currentNumericColumns.slice(0, 2),
  );
  const [pendingError, setPendingError] = useState<string | null>(null);

  async function handleAddFile(file: File) {
    setPendingError(null);
    try {
      const parsed = await parseFile(file);
      const numeric = detectNumericColumns(parsed);
      if (numeric.length === 0) {
        setPendingError(`Aucune colonne numérique dans "${file.name}".`);
        return;
      }
      const dataset = extractDataset(parsed, numeric[0]);
      setFileSources((prev) => [
        ...prev,
        { id: `${file.name}-${Date.now()}`, label: `${file.name} · ${numeric[0]}`, values: dataset.values },
      ]);
    } catch (e) {
      setPendingError(e instanceof Error ? e.message : 'Erreur lors de l\'import.');
    }
  }

  const columnComparisonSources: ComparisonSource[] = useMemo(() => {
    if (!currentTable) return [];
    return columnSources.map((col) => {
      const dataset = extractDataset(currentTable, col);
      return { id: col, label: col, values: dataset.values };
    });
  }, [currentTable, columnSources]);

  const sources = mode === 'fichiers' ? fileSources : columnComparisonSources;
  const analyses = useSourceAnalyses(sources);

  const firstDigitChartData = useMemo(() => {
    const validAnalyses = analyses.filter((a) => a.benford);
    if (validAnalyses.length === 0) return [];
    return Array.from({ length: 9 }, (_, i) => {
      const digit = i + 1;
      const row: Record<string, number> = { digit };
      for (const a of validAnalyses) {
        const bucket = a.benford!.firstDigit.distribution.find((d) => d.digit === digit);
        row[a.label] = bucket ? +(bucket.observedFrequency * 100).toFixed(3) : 0;
      }
      row['Théorique'] = +(Math.log10(1 + 1 / digit) * 100).toFixed(3);
      return row;
    });
  }, [analyses]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setMode('colonnes')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            mode === 'colonnes'
              ? 'bg-accent-soft border-accent text-accent-strong'
              : 'border-line text-ink-500'
          }`}
        >
          Entre colonnes (fichier courant)
        </button>
        <button
          onClick={() => setMode('fichiers')}
          className={`px-3 py-1.5 rounded-lg text-sm border ${
            mode === 'fichiers'
              ? 'bg-accent-soft border-accent text-accent-strong'
              : 'border-line text-ink-500'
          }`}
        >
          Entre plusieurs fichiers
        </button>
      </div>

      {mode === 'colonnes' && (
        <div className="panel rounded-xl p-5">
          {!currentTable ? (
            <p className="text-sm text-ink-500">
              Importez d'abord un fichier dans l'onglet Analyse pour comparer ses colonnes.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {currentNumericColumns.map((col) => {
                const active = columnSources.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() =>
                      setColumnSources((prev) =>
                        active ? prev.filter((c) => c !== col) : [...prev, col],
                      )
                    }
                    className={`px-3 py-1.5 rounded-lg text-sm font-data border ${
                      active ? 'bg-accent-soft border-accent text-accent-strong' : 'border-line text-ink-500'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'fichiers' && (
        <div className="panel rounded-xl p-5">
          <label className="inline-block cursor-pointer text-sm px-4 py-2 rounded-lg bg-accent-soft text-accent-strong border border-accent">
            + Ajouter un fichier
            <input
              type="file"
              className="hidden"
              accept=".csv,.tsv,.json,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAddFile(file);
                e.target.value = '';
              }}
            />
          </label>
          {pendingError && <p className="text-sm text-critical mt-2">{pendingError}</p>}
          {fileSources.length > 0 && (
            <ul className="mt-4 space-y-2">
              {fileSources.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm font-data">
                  <span className="text-ink-900">{s.label}</span>
                  <button
                    onClick={() => setFileSources((prev) => prev.filter((x) => x.id !== s.id))}
                    className="text-ink-300 hover:text-critical text-xs"
                  >
                    retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {analyses.length === 0 && (
        <p className="text-sm text-ink-500">
          Sélectionnez au moins une source ci-dessus pour lancer la comparaison.
        </p>
      )}

      {analyses.length > 0 && (
        <>
          <div className="panel rounded-xl p-5">
            <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">
              Premier chiffre — comparaison des distributions
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={firstDigitChartData} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#e6e3db" vertical={false} />
                <XAxis
                  dataKey="digit"
                  tick={{ fill: '#6f6c62', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#e6e3db' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6f6c62', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#e6e3db' }}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid #e6e3db',
                    borderRadius: 8,
                    fontFamily: 'JetBrains Mono',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#6f6c62' }} />
                <Line
                  type="monotone"
                  dataKey="Théorique"
                  stroke="#1c1b18"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  dot={false}
                />
                {analyses.map((a, i) => (
                  <Line
                    key={a.id}
                    type="monotone"
                    dataKey={a.label}
                    stroke={PALETTE[i % PALETTE.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="panel rounded-xl p-5 overflow-x-auto">
            <h3 className="text-sm uppercase tracking-wider text-ink-500 mb-4">
              Synthèse comparative
            </h3>
            <table className="w-full text-sm font-data">
              <thead>
                <tr className="text-left text-ink-300 text-xs uppercase tracking-wider">
                  <th className="pb-2 pr-4">Source</th>
                  <th className="pb-2 pr-4">n</th>
                  <th className="pb-2 pr-4">DataLens Score</th>
                  <th className="pb-2 pr-4">MAD (1er chiffre)</th>
                  <th className="pb-2 pr-4">Moyenne</th>
                  <th className="pb-2">Écart-type</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a) => (
                  <tr key={a.id} className="border-t border-line">
                    <td className="py-2 pr-4 text-ink-900">{a.label}</td>
                    <td className="py-2 pr-4 text-ink-500">{a.stats?.count ?? '—'}</td>
                    <td className="py-2 pr-4 text-ink-900">
                      {a.benford ? a.benford.overallScore : '—'}
                    </td>
                    <td className="py-2 pr-4 text-ink-500">
                      {a.benford ? a.benford.firstDigit.mad.value.toFixed(4) : '—'}
                    </td>
                    <td className="py-2 pr-4 text-ink-500">{a.stats?.mean.toFixed(3) ?? '—'}</td>
                    <td className="py-2 text-ink-500">{a.stats?.stdDev.toFixed(3) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
