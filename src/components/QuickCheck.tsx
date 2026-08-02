import { useMemo, useState } from 'react';
import ResultsView from './ResultsView';

function parseNumberList(text: string): number[] {
  return text
    .split(/[\s,;\n\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s.replace(',', '.')))
    .filter((n) => Number.isFinite(n));
}

const PLACEHOLDER = `Collez vos nombres ici, séparés par des espaces, virgules ou retours à la ligne.

Exemple :
1204.50, 89.20, 3400, 12.99
15600
742.30`;

export default function QuickCheck() {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const values = useMemo(() => parseNumberList(text), [text]);

  return (
    <div className="space-y-6">
      <div className="panel rounded-2xl p-6">
        <label className="text-sm text-ink-900 block mb-2">Vos nombres</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSubmitted(false);
          }}
          placeholder={PLACEHOLDER}
          rows={6}
          className="w-full rounded-lg border border-line bg-surface-0 p-3 text-sm font-data text-ink-900 focus:outline-none focus:border-accent resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-ink-300 font-data">
            {values.length} nombre{values.length !== 1 ? 's' : ''} détecté{values.length !== 1 ? 's' : ''}
            {values.length > 0 && values.length < 5 ? ' — minimum 5 requis' : ''}
          </span>
          <button
            onClick={() => setSubmitted(true)}
            disabled={values.length < 5}
            className="px-4 py-2 rounded-lg text-sm bg-accent-soft border border-accent text-accent-strong disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Analyser
          </button>
        </div>
      </div>

      {submitted && values.length >= 5 && (
        <ResultsView label="Nombres collés" values={values} missingCount={0} />
      )}
    </div>
  );
}
