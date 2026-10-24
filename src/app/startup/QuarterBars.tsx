// Quarterly paired bars for a startup (SCREENS §11 Financial): revenue and net
// income, or cash and debt, with a zero line, quarter labels and a legend.
// Values are listed for screen readers in the label (no hover needed).
import type { QuarterBar } from './startupView';

const H = 110;

export function QuarterBars(p: {
  data: QuarterBar[];
  labels: [string, string];
  format: (v: number) => string;
}) {
  const vals = p.data.flatMap((d) => [d.a, d.b]);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const zero = H * (max / span);
  const w = 100 / Math.max(1, p.data.length);
  const label = p.data
    .map((d) => `${d.label}: ${p.labels[0]} ${p.format(d.a)}, ${p.labels[1]} ${p.format(d.b)}`)
    .join('; ');
  const bar = (v: number, x: number, bw: number, cls: string) => {
    const h = (Math.abs(v) / span) * H;
    return <rect x={x} y={v >= 0 ? zero - h : zero} width={bw} height={h} class={cls} rx="0.6" />;
  };
  return (
    <div class="barchart">
      <svg viewBox={`0 0 100 ${H + 4}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <line x1="0" x2="100" y1={zero} y2={zero} class="barchart-axis" />
        {p.data.map((d, i) => {
          const x = i * w + w * 0.18;
          const bw = w * 0.3;
          return (
            <g>
              {bar(d.a, x, bw, d.a >= 0 ? 'bar-rev' : 'bar-loss')}
              {bar(d.b, x + bw + w * 0.04, bw, d.b >= 0 ? 'bar-inc' : 'bar-loss')}
            </g>
          );
        })}
      </svg>
      <div class="barchart-labels">
        {p.data.map((d) => (
          <span>{d.label}</span>
        ))}
      </div>
      <div class="barchart-legend">
        <span class="lg-rev">{p.labels[0]}</span>
        <span class="lg-inc">{p.labels[1]}</span>
      </div>
    </div>
  );
}
