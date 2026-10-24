// Price sparkline (SCREENS §12 company card): weekly closes scaled between
// their own low and high, a 1.5 px stroke in jade when the line ends above
// where it started and oxblood when below (ART_DIRECTION §5: no area fill).
const W = 100;
const H = 32;
const PAD = 2;

/** SVG polyline points for a series on its own min…max scale. */
export function sparkPoints(values: number[]): string {
  if (values.length === 0) return '';
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = values.length > 1 ? W / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = values.length > 1 ? i * step : W / 2;
      const y = H - PAD - ((v - lo) / span) * (H - 2 * PAD);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function Sparkline(p: { values: number[]; label: string; weeks?: number }) {
  const values = p.values.slice(-(p.weeks ?? 52));
  const up = values.length < 2 || values[values.length - 1]! >= values[0]!;
  return (
    <svg
      class="ib-spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={p.label}
    >
      <polyline points={sparkPoints(values)} class={up ? 'ib-spark-up' : 'ib-spark-down'} />
    </svg>
  );
}
