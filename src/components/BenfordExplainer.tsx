import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MINI_BARS = Array.from({ length: 9 }, (_, i) => {
  const d = i + 1;
  return { d, p: Math.log10(1 + 1 / d) };
});
const maxP = MINI_BARS[0].p;

export default function BenfordExplainer({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);

  return (
    <div className="panel rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm text-ink-900">Qu'est-ce que la loi de Benford ?</span>
        <ChevronDown
          size={18}
          className={`text-ink-300 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-6 grid md:grid-cols-[1fr_260px] gap-6 items-center">
          <div className="text-sm text-ink-500 leading-relaxed space-y-2">
            <p>
              Dans presque tous les jeux de nombres "naturels" — populations de villes, factures,
              résultats scientifiques — le premier chiffre n'est pas réparti au hasard. Il commence
              beaucoup plus souvent par <strong className="text-ink-900">1</strong> que par{' '}
              <strong className="text-ink-900">9</strong>.
            </p>
            <p>
              C'est une régularité mathématique connue depuis 1938, utilisée par les auditeurs et les
              enquêteurs financiers. DataLens compare la répartition réelle de vos données à cette
              référence : un grand écart peut signaler des valeurs arrondies, inventées ou modifiées.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-ink-300 mb-2">
              Fréquence théorique du premier chiffre
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {MINI_BARS.map(({ d, p }) => (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-accent/70"
                    style={{ height: `${(p / maxP) * 100}%` }}
                  />
                  <span className="text-[10px] font-data text-ink-300">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
