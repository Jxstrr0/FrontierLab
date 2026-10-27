// Runway meter (SCREENS §24, SIMULATION §15): four bands (Critical, Tight,
// Comfortable, Strong) in months of cash at the current net burn, with a marker
// at today's runway. Band edges come from RUNWAY.tiers; a lab with no burn sits
// at the right end. Also holds the runway tier's label and tone.
import { RUNWAY } from '../../config/balance';
import type { RunwayTier } from '../../data/types';
import { runwayText } from '../format/format';

export const RUNWAY_LABEL: Record<RunwayTier, string> = {
  strong: 'Strong',
  comfortable: 'Comfortable',
  tight: 'Tight',
  critical: 'Critical',
};

export const RUNWAY_TONE: Record<RunwayTier, 'good' | 'warn' | 'bad'> = {
  strong: 'good',
  comfortable: 'good',
  tight: 'warn',
  critical: 'bad',
};

const MAX = RUNWAY.meterMonths;
const months = (m: number) => `${m} mo`;

/** Bands from low to high, from the tier lines (listed high to low). */
function bands(): { tier: RunwayTier; from: number; to: number }[] {
  const edges = [...RUNWAY.tiers].reverse();
  return edges.map((t, i) => ({
    tier: t.tier,
    from: Number.isFinite(t.minMonths) ? t.minMonths : 0,
    to: edges[i + 1] ? edges[i + 1]!.minMonths : MAX,
  }));
}

export function RunwayMeter(p: { months: number | null; tier: RunwayTier }) {
  const all = bands();
  const at = p.months === null ? MAX : Math.min(MAX, p.months);
  return (
    <div class="meter">
      <div class="meter-bar" role="img" aria-label={`Runway ${runwayText(p.months)}, ${p.tier}`}>
        {all.map((b) => (
          <span
            key={b.tier}
            class={`meter-band meter-${b.tier}${b.tier === p.tier ? ' is-current' : ''}`}
            style={{ width: `${((b.to - b.from) / MAX) * 100}%` }}
          />
        ))}
        <span class="meter-marker" style={{ left: `${(at / MAX) * 100}%` }} />
      </div>
      <div class="meter-ticks" aria-hidden="true">
        {all.slice(1).map((b) => (
          <span key={b.tier} style={{ left: `${(b.from / MAX) * 100}%` }}>
            {months(b.from)}
          </span>
        ))}
      </div>
      <ul class="meter-legend">
        {[...all].reverse().map((b) => (
          <li key={b.tier} class={b.tier === p.tier ? 'is-current' : ''}>
            <span>{RUNWAY_LABEL[b.tier]}</span>
            <span class="muted">
              {b.tier === 'critical'
                ? `under ${b.to} months`
                : b.tier === 'strong'
                  ? `${b.from} months or more, or not burning cash`
                  : `${b.from} to ${b.to} months`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
