interface ScoreGaugeProps {
  score: number; // 0-100
  label: string;
}

// Demi-cercle de 180° à 0°, aiguille façon instrument analogique
export default function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const angleDeg = 180 - (clamped / 100) * 180; // 180° (0) -> 0° (100)
  const angleRad = (angleDeg * Math.PI) / 180;
  const cx = 100;
  const cy = 100;
  const r = 78;
  const needleX = cx + r * Math.cos(angleRad);
  const needleY = cy - r * Math.sin(angleRad);

  const arcPath = (from: number, to: number, radius: number) => {
    const p1 = {
      x: cx + radius * Math.cos((from * Math.PI) / 180),
      y: cy - radius * Math.sin((from * Math.PI) / 180),
    };
    const p2 = {
      x: cx + radius * Math.cos((to * Math.PI) / 180),
      y: cy - radius * Math.sin((to * Math.PI) / 180),
    };
    return `M ${p1.x} ${p1.y} A ${radius} ${radius} 0 0 0 ${p2.x} ${p2.y}`;
  };

  const color = clamped >= 80 ? '#5c7a5e' : clamped >= 50 ? '#b5762a' : '#a3402f';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[220px]">
        {/* Piste de fond */}
        <path d={arcPath(180, 0, 78)} fill="none" stroke="#e6e3db" strokeWidth={10} strokeLinecap="round" />
        {/* Progression */}
        <path
          d={arcPath(180, angleDeg, 78)}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Graduations */}
        {Array.from({ length: 11 }, (_, i) => i * 18).map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = cx + 66 * Math.cos(rad);
          const y1 = cy - 66 * Math.sin(rad);
          const x2 = cx + 72 * Math.cos(rad);
          const y2 = cy - 72 * Math.sin(rad);
          return (
            <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a6a297" strokeWidth={1} />
          );
        })}
        {/* Aiguille */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1c1b18" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={4} fill="#1c1b18" />
      </svg>
      <div className="font-data text-4xl text-ink-900 -mt-4">{Math.round(clamped)}</div>
      <div className="text-xs uppercase tracking-wider text-ink-500 mt-1">{label}</div>
    </div>
  );
}
