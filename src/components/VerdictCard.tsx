import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Verdict } from '../core/benford';
import ScoreGauge from './ScoreGauge';

const TIER_STYLES = {
  naturel: {
    icon: CheckCircle2,
    color: '#5c7a5e',
    bg: '#eef3ee',
  },
  'a-surveiller': {
    icon: AlertTriangle,
    color: '#b5762a',
    bg: '#faf1e3',
  },
  suspect: {
    icon: AlertOctagon,
    color: '#a3402f',
    bg: '#f8e9e6',
  },
} as const;

export default function VerdictCard({
  verdict,
  score,
  plainSummary,
}: {
  verdict: Verdict;
  score: number;
  plainSummary: string[];
}) {
  const style = TIER_STYLES[verdict.tier];
  const Icon = style.icon;

  return (
    <div className="panel rounded-2xl p-6 md:p-8">
      <div className="grid md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
        <ScoreGauge score={score} label="Score de confiance" />
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3"
            style={{ background: style.bg, color: style.color }}
          >
            <Icon size={16} />
            <span className="text-sm font-medium">{verdict.title}</span>
          </div>
          <p className="text-ink-900 leading-relaxed mb-4">{verdict.message}</p>
          <ul className="space-y-1.5">
            {plainSummary.map((line, i) => (
              <li key={i} className="text-sm text-ink-500 flex gap-2">
                <span className="text-ink-300">—</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
