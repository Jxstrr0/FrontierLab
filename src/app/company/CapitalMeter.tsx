// Capital ratio meter (SCREENS §24): five tier bands (Critical, Restricted,
// Watch, Adequate, Strong) with a marker at the current ratio. Band edges come
// from TIER_THRESHOLDS so the meter always matches the regulator rules.
import { TIER_THRESHOLDS } from '../../config/balance';
import type { Tier } from '../../data/types';
import { capitalRatioText } from '../format/format';

export const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  watch: 'Watch',
  restricted: 'Restricted',
  critical: 'Critical',
};

export const TIER_TONE: Record<Tier, 'good' | 'warn' | 'bad'> = {
  strong: 'good',
  adequate: 'good',
  watch: 'warn',
  restricted: 'bad',
  critical: 'bad',
};

/** Upper end of the meter. The Strong band stretches from its threshold to here. */
const METER_MAX = 0.18;

/** A band edge as a short percentage: 0.105 → "10.5%", 0.06 → "6%". */
const edge = (x: number) => `${Number((x * 100).toFixed(1))}%`;

interface Band {
  tier: Tier;
  from: number;
  to: number;
}

/** Bands from low to high, derived from the thresholds (listed high to low). */
function bands(): Band[] {
  const edges = [...TIER_THRESHOLDS].reverse();
  return edges.map((t, i) => ({
    tier: t.tier,
    from: Number.isFinite(t.minCr) ? t.minCr : 0,
    to: edges[i + 1]?.minCr ?? METER_MAX,
  }));
}

export function CapitalMeter(p: { ratio: number; tier: Tier }) {
  const all = bands();
  const marker = Math.max(0, Math.min(1, p.ratio / METER_MAX));
  return (
    <div class="meter">
      <div
        class="meter-bar"
        role="img"
        aria-label={`Capital ratio ${capitalRatioText(p.ratio)}, ${p.tier}`}
      >
        {all.map((b) => (
          <span
            key={b.tier}
            class={`meter-band meter-${b.tier}${b.tier === p.tier ? ' is-current' : ''}`}
            style={{ width: `${((b.to - b.from) / METER_MAX) * 100}%` }}
          />
        ))}
        <span class="meter-marker" style={{ left: `${marker * 100}%` }} />
      </div>
      <div class="meter-ticks" aria-hidden="true">
        {all.slice(1).map((b) => (
          <span key={b.tier} style={{ left: `${(b.from / METER_MAX) * 100}%` }}>
            {edge(b.from)}
          </span>
        ))}
      </div>
      <ul class="meter-legend">
        {[...all].reverse().map((b) => (
          <li key={b.tier} class={b.tier === p.tier ? 'is-current' : ''}>
            <span>{TIER_LABEL[b.tier]}</span>
            <span class="muted">
              {b.tier === 'critical'
                ? `below ${edge(b.to)}`
                : b.tier === 'strong'
                  ? `${edge(b.from)} and above`
                  : `${edge(b.from)} to ${edge(b.to)}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
