import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BenfordAnalysisResult } from '../types';

interface BenfordChartProps {
  result: BenfordAnalysisResult;
  title: string;
}

export default function BenfordChart({ result, title }: BenfordChartProps) {
  const data = result.distribution.map((d) => ({
    digit: d.digit,
    observe: +(d.observedFrequency * 100).toFixed(3),
    attendu: +(d.expectedFrequency * 100).toFixed(3),
  }));

  return (
    <div className="panel rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm uppercase tracking-wider text-ink-500">{title}</h3>
        <span className="font-data text-xs text-ink-500">
          n = {result.sampleSize} · χ² = {result.chiSquare.statistic.toFixed(2)} · MAD ={' '}
          {result.mad.value.toFixed(4)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
            labelStyle={{ color: '#1c1b18' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#6f6c62' }} />
          <Bar dataKey="observe" name="Observé" fill="#b5762a" radius={[3, 3, 0, 0]} />
          <Line
            type="monotone"
            dataKey="attendu"
            name="Théorique (Benford)"
            stroke="#1c1b18"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
