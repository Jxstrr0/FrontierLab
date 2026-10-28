// RadarRosette (SCREENS §0.5, ART_DIRECTION §5): a five-axis radar on a
// guilloche grid — four concentric wave-rings instead of straight polygons —
// with the data polygon in brass at 25% fill and a 1.5 px stroke, 3 px vertex
// dots and Public Sans 12 px labels outside the shape. Two sizes: 'full'
// (businesses, AI models, startups) and 'compact' (funding lots, Deal Desk
// cards).
import type { Pentagon } from '../../data/types';
import { waveOval } from '../../art/engrave';

/** Axis labels, one array of lines per axis. */
export type RosetteAxes = readonly (readonly string[])[];

const MAX_SCORE = 10;
const RINGS = 4;
const LINE_HEIGHT = 14;

const SIZES = {
  full: { w: 330, h: 160, cy: 84, r: 60, waves: 30, depth: 1.1, gap: 9 },
  compact: { w: 260, h: 140, cy: 74, r: 44, waves: 24, depth: 0.9, gap: 8 },
} as const;
type Size = keyof typeof SIZES;

/** Angle of axis i of n, starting at the top and going clockwise. */
const angle = (i: number, n: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

/** The guilloche grid rings for a size (memoised by waveOval). */
function ringPaths(size: Size): string[] {
  const g = SIZES[size];
  return Array.from({ length: RINGS }, (_, i) => {
    const r = (g.r * (i + 1)) / RINGS;
    return waveOval(g.w / 2, g.cy, r, r, g.waves, g.depth);
  });
}

export function RadarRosette(p: {
  scores: Pentagon;
  axes: RosetteAxes;
  size?: Size;
  /** Start of the accessible label, e.g. "Model profile". */
  label?: string;
  format?: (v: number) => string;
  class?: string;
  /** The score at the outer ring (10 unless a model's ceiling has risen). */
  max?: number;
}) {
  const size = p.size ?? 'full';
  const g = SIZES[size];
  const cx = g.w / 2;
  const n = p.axes.length;
  const at = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i, n)),
    g.cy + r * Math.sin(angle(i, n)),
  ];
  const fmt = p.format ?? String;
  const max = p.max ?? MAX_SCORE;
  const points = p.scores.map((v, i) => at(i, (g.r * Math.max(0, Math.min(max, v))) / max));
  const polygon = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const summary = p.axes.map((a, i) => `${a.join(' ')} ${fmt(p.scores[i] ?? 0)}`).join(', ');
  return (
    <svg
      class={p.class ?? (size === 'full' ? 'rosette' : 'fund-rosette')}
      viewBox={`0 0 ${g.w} ${g.h}`}
      role="img"
      aria-label={p.label ? `${p.label}: ${summary}` : summary}
    >
      <g class="rosette-grid">
        {ringPaths(size).map((d) => (
          <path key={d} d={d} />
        ))}
        {p.axes.map((a, i) => {
          const [x, y] = at(i, g.r);
          return <line key={a.join()} x1={cx} y1={g.cy} x2={x} y2={y} />;
        })}
      </g>
      <polygon points={polygon} class="rosette-data" />
      {points.map(([x, y], i) => (
        <circle key={p.axes[i]!.join()} cx={x} cy={y} r="3" class="rosette-dot" />
      ))}
      {p.axes.map((a, i) => {
        const [x, y] = at(i, g.r + g.gap);
        const cos = Math.cos(angle(i, n));
        const sin = Math.sin(angle(i, n));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        const lines = a.length;
        // The top label sits above its vertex; low labels hang below; the rest are centred.
        const first =
          i === 0
            ? y - 4 - (lines - 1) * LINE_HEIGHT
            : size === 'compact' && sin > 0.5
              ? y + 10
              : y - ((lines - 1) * LINE_HEIGHT) / 2 + 4;
        return (
          <text
            key={a.join()}
            x={x}
            y={first}
            text-anchor={anchor}
            class={size === 'full' ? 'rosette-label' : 'fund-rosette-label'}
          >
            {a.map((line, k) => (
              <tspan key={line} x={x} dy={k === 0 ? 0 : LINE_HEIGHT}>
                {line}
                {k === lines - 1 && <tspan class="rosette-score"> {fmt(p.scores[i] ?? 0)}</tspan>}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
