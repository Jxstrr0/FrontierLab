// Data visuals (ART_DIRECTION §5): CoinRating, StatBar, RingGauge, BarChart
// (values on tap) and the bank Medallion.
import { useId, useState } from 'preact/hooks';

/**
 * Five 18 px brass coins (ART_DIRECTION §5) with a milled rim and a tiny
 * embossed star; the fill is clipped to the rating, so partial coins show,
 * and the clip eases when the rating changes. Empty coins are a brass
 * outline at 35%.
 */
export function CoinRating(p: { value: number; showNumber?: boolean; size?: number }) {
  const size = p.size ?? 18;
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const v = Math.max(0, Math.min(5, p.value));
  const r = size / 2 - 1;
  return (
    <span class="coins" role="img" aria-label={`${v.toFixed(1)} out of 5`}>
      <svg
        width={size * 5 + 16}
        height={size}
        viewBox={`0 0 ${size * 5 + 16} ${size}`}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`clip${id}`}>
            <rect class="coin-clip" x="0" y="0" width={coinFillWidth(v, size)} height={size} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle cx={i * (size + 4) + size / 2} cy={size / 2} r={r} class="coin-empty" />
        ))}
        <g clip-path={`url(#clip${id})`}>
          {[0, 1, 2, 3, 4].map((i) => {
            const cx = i * (size + 4) + size / 2;
            return (
              <g>
                <circle cx={cx} cy={size / 2} r={r} class="coin-full" />
                <circle cx={cx} cy={size / 2} r={r - size * 0.12} class="coin-rim" />
                <path d={starPath(cx, size / 2, size * 0.24)} class="coin-star" />
              </g>
            );
          })}
        </g>
      </svg>
      {p.showNumber !== false && (
        <span class="coins-num" aria-hidden="true">
          {v.toFixed(1)}
        </span>
      )}
    </span>
  );
}

function coinFillWidth(v: number, size: number): number {
  const whole = Math.floor(v);
  return whole * (size + 4) + (v - whole) * size;
}

function starPath(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Label, bar and value (0–100 by default). */
export function StatBar(p: { label: string; value: number; max?: number; display?: string }) {
  const frac = Math.max(0, Math.min(1, p.value / (p.max ?? 100)));
  return (
    <div class="statbar">
      <span class="statbar-label">{p.label}</span>
      <span class="statbar-track">
        <span class="statbar-fill" style={{ width: `${frac * 100}%` }} />
      </span>
      <span class="statbar-value">{p.display ?? Math.round(p.value)}</span>
    </div>
  );
}

/** Brass ring on a raised track with a % in the centre. `value` is 0–1. */
export function RingGauge(p: { value: number; label?: string; caption?: string; size?: number }) {
  const size = p.size ?? 72;
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, p.value));
  return (
    <div class="ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} class="ring-track" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          class="ring-fill"
          stroke-dasharray={`${c * frac} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" class="ring-text" dominant-baseline="central" text-anchor="middle">
          {p.label ?? `${Math.round(frac * 100)}%`}
        </text>
      </svg>
      {p.caption && <div class="ring-caption">{p.caption}</div>}
    </div>
  );
}

/** A bar with 2 px rounded corners on its outer end only (top, or bottom for a loss). */
export function barPath(x: number, y: number, w: number, h: number, down = false): string {
  const r = Math.min(2, w / 2, h);
  if (h <= 0) return '';
  if (down) {
    return `M${x} ${y}h${w}v${h - r}q0 ${r} ${-r} ${r}h${-(w - 2 * r)}q${-r} 0 ${-r} ${-r}z`;
  }
  return `M${x} ${y + h}v${-(h - r)}q0 ${-r} ${r} ${-r}h${w - 2 * r}q${r} 0 ${r} ${r}v${h - r}z`;
}

const BAR = { slot: 64, h: 110, top: 30 } as const;

/**
 * Paired bars (ART_DIRECTION §5): revenue in ivory, income in brass (a loss in
 * oxblood below the axis), 2 px rounded tops, last n weeks. Tap a week to show
 * its values above the bars; tap again to hide them.
 */
export function BarChart(p: {
  data: { label: string; revenue: number; income: number }[];
  format?: (v: number) => string;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const fmt = p.format ?? ((v: number) => String(Math.round(v)));
  const n = Math.max(1, p.data.length);
  const w = n * BAR.slot;
  const max = Math.max(1, ...p.data.flatMap((d) => [Math.abs(d.revenue), Math.max(0, d.income)]));
  const min = Math.min(0, ...p.data.map((d) => d.income));
  const span = max - min || 1;
  const zero = BAR.top + BAR.h * (max / span);
  const bw = BAR.slot * 0.3;
  return (
    <div class="barchart">
      <svg
        viewBox={`0 0 ${w} ${BAR.top + BAR.h + 4}`}
        role="img"
        aria-label="Weekly revenue and income"
      >
        <line x1="0" x2={w} y1={zero} y2={zero} class="barchart-axis" />
        {p.data.map((d, i) => {
          const x = i * BAR.slot + BAR.slot * 0.18;
          const rh = (Math.abs(d.revenue) / span) * BAR.h;
          const ih = (Math.abs(d.income) / span) * BAR.h;
          const on = picked === i;
          const dim = picked !== null && !on;
          return (
            <g
              class={`bar-pair${dim ? ' is-dim' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${d.label}: revenue ${fmt(d.revenue)}, income ${fmt(d.income)}`}
              onClick={() => setPicked(on ? null : i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPicked(on ? null : i);
                }
              }}
            >
              <rect
                x={i * BAR.slot}
                y="0"
                width={BAR.slot}
                height={BAR.top + BAR.h + 4}
                class="bar-hit"
              />
              <path d={barPath(x, zero - rh, bw, rh)} class="bar-rev" />
              <path
                d={
                  d.income >= 0
                    ? barPath(x + bw + 2, zero - ih, bw, ih)
                    : barPath(x + bw + 2, zero, bw, ih, true)
                }
                class={d.income >= 0 ? 'bar-inc' : 'bar-loss'}
              />
              {on && (
                <text
                  x={i * BAR.slot + BAR.slot / 2}
                  y={BAR.top - 4}
                  text-anchor="middle"
                  class="bar-value"
                >
                  <tspan class="bar-value-rev">{fmt(d.revenue)}</tspan>
                  <tspan class="bar-value-inc" x={i * BAR.slot + BAR.slot / 2} dy="-11">
                    {fmt(d.income)}
                  </tspan>
                </text>
              )}
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
        <span class="lg-rev">Revenue</span>
        <span class="lg-inc">Income</span>
        <span class="barchart-hint">Tap a week for values</span>
      </div>
    </div>
  );
}

/** Round bank medallion: brass rim, brand ink fill and a monogram. */
export function Medallion(p: { ink: string; monogram: string; size?: number; ring?: boolean }) {
  const size = p.size ?? 30;
  return (
    <svg class="medallion" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle
        cx="15"
        cy="15"
        r="14"
        fill={p.ring ? 'var(--ivory)' : p.ink}
        stroke="var(--brass)"
        stroke-width="1.5"
      />
      <circle
        cx="15"
        cy="15"
        r="11"
        fill="none"
        stroke={p.ring ? p.ink : 'var(--brass-light)'}
        stroke-width={p.ring ? 2 : 0.6}
        stroke-dasharray={p.ring ? undefined : '1 1.2'}
      />
      <text
        x="15"
        y="15.5"
        text-anchor="middle"
        dominant-baseline="central"
        class="medallion-text"
        fill={p.ring ? p.ink : 'var(--ivory)'}
      >
        {p.monogram}
      </text>
    </svg>
  );
}
