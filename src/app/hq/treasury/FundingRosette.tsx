// Compact five-axis rosette for a funding lot or offer (ART_DIRECTION §5,
// RadarRosette; DESIGN §5.8.4): guilloche wave rings, a brass polygon at 25%
// fill with a 1.5 px stroke, 3 px vertex dots and the axis labels outside.
// Axis order follows FUNDING_TYPES: Cost, Term, Stability, Flexibility,
// Discretion (1–10; higher is better for the bank, so cheap funding scores
// high on Cost). Sized to sit under the card's figures on a phone.
import type { Pentagon } from '../../../data/types';

const AXES = ['Cost', 'Term', 'Stability', 'Flexibility', 'Discretion'] as const;

const W = 260;
const H = 140;
const CX = W / 2;
const CY = 74;
const R = 44;
const MAX_SCORE = 10;
const RINGS = 4;
const WAVES = 24;
const WAVE_DEPTH = 0.9;
const RING_STEPS = 96;
const LABEL_GAP = 8;

const angle = (i: number) => (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
const at = (i: number, r: number): [number, number] => [
  CX + r * Math.cos(angle(i)),
  CY + r * Math.sin(angle(i)),
];

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

export function FundingRosette(p: { radar: Pentagon }) {
  const points = p.radar.map((v, i) =>
    at(i, (R * Math.max(0, Math.min(MAX_SCORE, v))) / MAX_SCORE),
  );
  const polygon = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const summary = AXES.map((a, i) => `${a} ${p.radar[i]}`).join(', ');
  return (
    <svg class="fund-rosette" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      <g class="rosette-grid">
        {RING_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
        {AXES.map((a, i) => {
          const [x, y] = at(i, R);
          return <line key={a} x1={CX} y1={CY} x2={x} y2={y} />;
        })}
      </g>
      <polygon points={polygon} class="rosette-data" />
      {points.map(([x, y], i) => (
        <circle key={AXES[i]} cx={x} cy={y} r="3" class="rosette-dot" />
      ))}
      {AXES.map((a, i) => {
        const [x, y] = at(i, R + LABEL_GAP);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        const dy = i === 0 ? -4 : Math.sin(angle(i)) > 0.5 ? 10 : 4;
        return (
          <text key={a} x={x} y={y + dy} text-anchor={anchor} class="fund-rosette-label">
            {a}
            <tspan class="rosette-score"> {p.radar[i]}</tspan>
          </text>
        );
      })}
    </svg>
  );
}
