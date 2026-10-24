// Data visuals (ART_DIRECTION §5): CoinRating, StatBar, RingGauge, BarChart and
// the bank Medallion.
import { useId } from 'preact/hooks';

/** Five brass coins with fractional fill, plus the number. */
export function CoinRating(p: { value: number; showNumber?: boolean; size?: number }) {
  const size = p.size ?? 18;
  const id = useId();
  const v = Math.max(0, Math.min(5, p.value));
  return (
    <span class="coins" role="img" aria-label={`${v.toFixed(1)} out of 5`}>
      <svg width={size * 5 + 16} height={size} viewBox={`0 0 ${size * 5 + 16} ${size}`}>
        <defs>
          <clipPath id={`clip${id}`}>
            <rect x="0" y="0" width={coinFillWidth(v, size)} height={size} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle
            cx={i * (size + 4) + size / 2}
            cy={size / 2}
            r={size / 2 - 1}
            class="coin-empty"
          />
        ))}
        <g clip-path={`url(#clip${id})`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <g>
              <circle
                cx={i * (size + 4) + size / 2}
                cy={size / 2}
                r={size / 2 - 1}
                class="coin-full"
              />
              <path
                d={starPath(i * (size + 4) + size / 2, size / 2, size * 0.22)}
                class="coin-star"
              />
            </g>
          ))}
        </g>
      </svg>
      {p.showNumber !== false && <span class="coins-num">{v.toFixed(1)}</span>}
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

/** Paired bars: revenue (ivory) and income (brass), last n weeks. */
export function BarChart(p: {
  data: { label: string; revenue: number; income: number }[];
  format?: (v: number) => string;
}) {
  const h = 120;
  const max = Math.max(1, ...p.data.flatMap((d) => [Math.abs(d.revenue), Math.abs(d.income)]));
  const min = Math.min(0, ...p.data.map((d) => d.income));
  const span = max - min || 1;
  const zero = h * (max / span);
  const w = 100 / Math.max(1, p.data.length);
  return (
    <div class="barchart">
      <svg
        viewBox={`0 0 100 ${h + 18}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Revenue and income bars"
      >
        <line x1="0" x2="100" y1={zero} y2={zero} class="barchart-axis" />
        {p.data.map((d, i) => {
          const x = i * w + w * 0.18;
          const bw = w * 0.3;
          const rh = (Math.abs(d.revenue) / span) * h;
          const ih = (Math.abs(d.income) / span) * h;
          return (
            <g>
              <rect x={x} y={zero - rh} width={bw} height={rh} class="bar-rev" rx="0.6">
                <title>{p.format ? p.format(d.revenue) : d.revenue}</title>
              </rect>
              <rect
                x={x + bw + w * 0.04}
                y={d.income >= 0 ? zero - ih : zero}
                width={bw}
                height={ih}
                class={d.income >= 0 ? 'bar-inc' : 'bar-loss'}
                rx="0.6"
              >
                <title>{p.format ? p.format(d.income) : d.income}</title>
              </rect>
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
