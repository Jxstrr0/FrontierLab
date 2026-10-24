// Yield-curve mini-chart for the central bank panel (SCREENS §8): overnight,
// 2y, 5y and 10y on an evenly spaced axis, a 1.5 px brass line with a rate
// label over each point (ART_DIRECTION §5: no area fills).
import type { CurvePoint } from '../../sim/centralBank';
import { pct } from '../format/format';

const W = 300;
const H = 120;
const PAD_X = 28;
const TOP = 26;
const BOTTOM = 92;
/** The vertical axis spans at least this much, so a flat curve doesn't look steep. */
const MIN_SPAN = 0.01;

export function YieldCurveChart(p: { curve: CurvePoint[] }) {
  const rates = p.curve.map((c) => c.rate);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  const span = Math.max(MIN_SPAN, hi - lo);
  const mid = (lo + hi) / 2;
  const x = (i: number) => PAD_X + (i * (W - 2 * PAD_X)) / Math.max(1, p.curve.length - 1);
  const y = (r: number) => BOTTOM - ((r - (mid - span / 2)) / span) * (BOTTOM - TOP);
  const points = p.curve.map((c, i) => `${x(i).toFixed(1)},${y(c.rate).toFixed(1)}`).join(' ');
  const label = p.curve.map((c) => `${c.label} ${pct(c.rate)}`).join(', ');
  return (
    <svg
      class="yield-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Yield curve: ${label}`}
    >
      <path d={`M${PAD_X - 8} ${BOTTOM + 8}H${W - PAD_X + 8}`} class="yield-axis" />
      <polyline points={points} class="yield-line" />
      {p.curve.map((c, i) => (
        <g key={c.label}>
          <circle cx={x(i)} cy={y(c.rate)} r="3" class="yield-dot" />
          <text x={x(i)} y={y(c.rate) - 9} class="yield-rate" text-anchor="middle">
            {pct(c.rate)}
          </text>
          <text x={x(i)} y={H - 4} class="yield-tenor" text-anchor="middle">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
