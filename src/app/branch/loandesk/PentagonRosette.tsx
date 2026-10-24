// Five-axis rosette for a loan application (ART_DIRECTION §5, RadarRosette):
// four concentric wave rings instead of straight polygon grids, a brass data
// polygon at 25% fill with a 1.5 px stroke, 3 px vertex dots and labels outside.
// Default axes: Management, Track record, Market, Competitiveness, Financial
// health. Other five-axis radars (underwriting models) pass their own axes.
import type { Pentagon } from '../../../data/types';
import './loandesk.css';

/** Axis labels, one array of lines per axis. */
export type RosetteAxes = readonly (readonly string[])[];

const LOAN_AXES: RosetteAxes = [
  ['Management'],
  ['Track', 'record'],
  ['Market'],
  ['Competitiveness'],
  ['Financial', 'health'],
];
const AXIS_COUNT = 5;

const W = 330;
const H = 160;
const CX = W / 2;
const CY = 84;
const R = 60;
const MAX_SCORE = 10;
const RINGS = 4;
const WAVES = 30;
const WAVE_DEPTH = 1.1;
const RING_STEPS = 120;
const LABEL_GAP = 9;
const LINE_HEIGHT = 14;

/** Angle of axis i, starting at the top and going clockwise. */
const angle = (i: number) => (Math.PI * 2 * i) / AXIS_COUNT - Math.PI / 2;

const at = (i: number, r: number): [number, number] => [
  CX + r * Math.cos(angle(i)),
  CY + r * Math.sin(angle(i)),
];

/** A closed ring with a small sine ripple, like guilloche engraving. */
function waveRing(r: number): string {
  const pts: string[] = [];
  for (let k = 0; k <= RING_STEPS; k++) {
    const t = (Math.PI * 2 * k) / RING_STEPS;
    const rr = r + WAVE_DEPTH * Math.sin(WAVES * t);
    pts.push(`${(CX + rr * Math.cos(t)).toFixed(2)},${(CY + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const RING_PATHS = Array.from({ length: RINGS }, (_, i) => waveRing((R * (i + 1)) / RINGS));

export function PentagonRosette(p: {
  scores: Pentagon;
  axes?: RosetteAxes;
  /** Start of the accessible label, e.g. "Model profile". */
  label?: string;
  format?: (v: number) => string;
}) {
  const axes = p.axes ?? LOAN_AXES;
  const fmt = p.format ?? String;
  const points = p.scores.map((v, i) =>
    at(i, (R * Math.max(0, Math.min(MAX_SCORE, v))) / MAX_SCORE),
  );
  const polygon = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const summary = axes.map((a, i) => `${a.join(' ')} ${fmt(p.scores[i] ?? 0)}`).join(', ');
  return (
    <svg
      class="rosette"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${p.label ?? 'Application profile'}: ${summary}`}
    >
      <g class="rosette-grid">
        {RING_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        {axes.map((a, i) => {
          const [x, y] = at(i, R);
          return <line key={a.join()} x1={CX} y1={CY} x2={x} y2={y} />;
        })}
      </g>
      <polygon points={polygon} class="rosette-data" />
      {points.map(([x, y], i) => (
        <circle key={axes[i]!.join()} cx={x} cy={y} r="3" class="rosette-dot" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = at(i, R + LABEL_GAP);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        const lines = a.length;
        // The top label sits above its vertex; the others are centred on theirs.
        const first =
          i === 0 ? y - 4 - (lines - 1) * LINE_HEIGHT : y - ((lines - 1) * LINE_HEIGHT) / 2 + 4;
        return (
          <text key={a.join()} x={x} y={first} text-anchor={anchor} class="rosette-label">
            {a.map((line, n) => (
              <tspan key={line} x={x} dy={n === 0 ? 0 : LINE_HEIGHT}>
                {line}
                {n === lines - 1 && <tspan class="rosette-score"> {fmt(p.scores[i] ?? 0)}</tspan>}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}
