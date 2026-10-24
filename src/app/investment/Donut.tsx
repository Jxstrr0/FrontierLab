// Portfolio donut (SCREENS §10, ART_DIRECTION charts): one ring segment per
// category on a hairline track, the total in the middle, and a legend with
// values below (the legend carries the numbers, so nothing is hover-only).
/** Any slice set: `id` picks the colour class `inv-slice-{id}` (the Personal Wealth donut reuses it). */
type Slice = { id: string; label: string; value: number };

const R = 52;
const STROKE = 16;
const C = 2 * Math.PI * R;
const GAP = 1.5;

export function Donut(p: {
  slices: Slice[];
  total: number;
  centre: string;
  caption: string;
  format: (v: number) => string;
}) {
  const sum = p.slices.reduce((t, x) => t + x.value, 0);
  let offset = 0;
  const label = p.slices.map((x) => `${x.label} ${p.format(x.value)}`).join(', ');
  return (
    <div class="inv-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`Portfolio: ${label}`}>
        <circle cx="70" cy="70" r={R} class="inv-donut-track" stroke-width={STROKE} />
        {sum > 0 &&
          p.slices.map((x) => {
            const len = (x.value / sum) * C;
            const seg = (
              <circle
                cx="70"
                cy="70"
                r={R}
                class={`inv-donut-seg inv-slice-${x.id}`}
                stroke-width={STROKE}
                stroke-dasharray={`${Math.max(0, len - GAP)} ${C}`}
                stroke-dashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += len;
            return x.value > 0 ? seg : null;
          })}
        <text x="70" y="68" text-anchor="middle" class="inv-donut-total">
          {p.centre}
        </text>
        <text x="70" y="86" text-anchor="middle" class="inv-donut-caption">
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
