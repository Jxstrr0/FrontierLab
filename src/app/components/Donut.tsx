// Donut (SCREENS §0.5, ART_DIRECTION §5): engraved ring segments, each a tint
// derived from the city inks with fine diagonal engraving lines inside, the
// total in the middle and a legend with values (so nothing is hover-only).
// `id` picks the colour class `inv-slice-{id}` (investment floor, wealth).
import { useMemo } from 'preact/hooks';
import { hatch, poly, type Pt } from '../../art/engrave';

export type DonutSlice = { id: string; label: string; value: number };

const C = 70;
const R_OUT = 60;
const R_IN = 44;
/** Gap between segments, in radians. */
const GAP = 0.025;
/** Engraving line spacing inside the segments. */
const ENGRAVE = 2.4;

/** An annular sector from angle a0 to a1 (clockwise from 12 o'clock) as a polygon. */
export function sectorPts(a0: number, a1: number, rOut = R_OUT, rIn = R_IN): Pt[] {
  const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 72));
  const at = (a: number, r: number): Pt => [
    C + r * Math.cos(a - Math.PI / 2),
    C + r * Math.sin(a - Math.PI / 2),
  ];
  const outer = Array.from({ length: steps + 1 }, (_, i) => at(a0 + ((a1 - a0) * i) / steps, rOut));
  const inner = Array.from({ length: steps + 1 }, (_, i) => at(a1 - ((a1 - a0) * i) / steps, rIn));
  return [...outer, ...inner];
}

export function Donut(p: {
  slices: DonutSlice[];
  total: number;
  centre: string;
  caption: string;
  format: (v: number) => string;
  /** Start of the accessible label. */
  label?: string;
}) {
  const sum = p.slices.reduce((t, x) => t + Math.max(0, x.value), 0);
  const key = p.slices.map((x) => `${x.id}:${x.value}`).join('|');
  const segs = useMemo(() => {
    let a = 0;
    return p.slices.map((x) => {
      const span = sum > 0 ? (Math.max(0, x.value) / sum) * Math.PI * 2 : 0;
      const a0 = a;
      a += span;
      if (span <= GAP * 2) return { id: x.id, d: '', lines: '' };
      // A lone slice is a full ring: no gap.
      const g = span >= Math.PI * 2 - 1e-6 ? 0 : GAP;
      const pts = sectorPts(a0 + g / 2, a0 + span - g / 2);
      return { id: x.id, d: poly(pts), lines: hatch(pts, ENGRAVE, -45) };
    });
  }, [key]);
  const label = p.slices.map((x) => `${x.label} ${p.format(x.value)}`).join(', ');
  return (
    <div class="inv-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`${p.label ?? 'Portfolio'}: ${label}`}>
        <circle
          cx={C}
          cy={C}
          r={(R_OUT + R_IN) / 2}
          class="inv-donut-track"
          stroke-width={R_OUT - R_IN}
        />
        <circle cx={C} cy={C} r={R_OUT + 3} class="inv-donut-rim" />
        <circle cx={C} cy={C} r={R_IN - 3} class="inv-donut-rim" />
        {segs.map((s) =>
          s.d ? (
            <g class={`inv-slice-${s.id}`}>
              <path d={s.d} class="inv-donut-seg" />
              <path d={s.lines} class="inv-donut-engrave" />
            </g>
          ) : null,
        )}
        <text x={C} y={C - 2} text-anchor="middle" class="inv-donut-total">
          {p.centre}
        </text>
        <text x={C} y={C + 15} text-anchor="middle" class="inv-donut-caption">
          {p.caption}
        </text>
      </svg>
      <ul class="inv-legend">
        {p.slices.map((x) => (
          <li>
            <span class={`inv-swatch inv-slice-${x.id}`} aria-hidden="true" />
            <span class="inv-legend-label">{x.label}</span>
            <span class="inv-legend-value">{p.format(x.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
