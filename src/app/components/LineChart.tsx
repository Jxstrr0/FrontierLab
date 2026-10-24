// LineChart (SCREENS §0.5, ART_DIRECTION §5): a multi-series weekly trend with
// 1.5 px strokes, no area fills, a dotted brass marker on the latest week
// ("now", or any point via markerIndex), first and last date labels and a
// legend. Each series gets its own tone class so colours stay in the CSS tokens.
export interface LineSeries {
  label: string;
  values: number[];
  /** CSS modifier: 'ivory' | 'brass' | 'jade'. */
  tone: 'ivory' | 'brass' | 'jade';
}

const W = 100;
const H = 100;
const PAD = 4;

/** SVG polyline points for one series on a shared 0…max scale. */
export function linePoints(values: number[], max: number, count: number): string {
  const span = Math.max(1, count - 1);
  const top = max > 0 ? max : 1;
  return values
    .map((v, i) => {
      const x = (i / span) * W;
      const y = H - PAD - (Math.max(0, v) / top) * (H - 2 * PAD);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function LineChart(p: {
  series: LineSeries[];
  /** Labels for the first and last point. */
  startLabel?: string;
  endLabel?: string;
  label: string;
  /** Index of the dotted "now" marker; defaults to the latest point. */
  markerIndex?: number;
}) {
  const count = Math.max(0, ...p.series.map((s) => s.values.length));
  const max = Math.max(0, ...p.series.flatMap((s) => s.values));
  const nowX =
    p.markerIndex === undefined
      ? W
      : (Math.min(p.markerIndex, count - 1) / Math.max(1, count - 1)) * W;
  return (
    <div class="linechart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={p.label}>
        <line x1="0" x2={W} y1={H - PAD} y2={H - PAD} class="linechart-axis" />
        {count > 1 && <line x1={nowX} x2={nowX} y1="0" y2={H} class="linechart-now" />}
        {p.series.map((s) => (
          <polyline
            points={linePoints(s.values, max, count)}
            class={`linechart-line linechart-${s.tone}`}
          />
        ))}
      </svg>
      {(p.startLabel || p.endLabel) && (
        <div class="linechart-labels">
          <span>{p.startLabel}</span>
          <span>{p.endLabel}</span>
        </div>
      )}
      <div class="linechart-legend">
        {p.series.map((s) => (
          <span class={`lg-line lg-line-${s.tone}`}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}
