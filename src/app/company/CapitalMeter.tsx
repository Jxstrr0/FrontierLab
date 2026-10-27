// Safety ratio meter (SCREENS §24): five tier bands (Critical, Restricted,
// Watch, Adequate, Strong) with a marker at the regulator's safety ratio, on
// SAFETY_TIER_THRESHOLDS. Band edges come from the config so the meter always
// matches the rules. (Runway has its own meter, RunwayMeter.tsx.)
import { SAFETY_TIER_THRESHOLDS } from '../../config/balance';
import type { Tier } from '../../data/types';
import { safetyRatioText } from '../format/format';

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

export type MeterKind = 'safety';

interface Scale {
  max: number;
  label: string;
  edges: { tier: Tier; min: number }[];
  text: (x: number) => string;
}

/** Upper end of each meter. The Strong band stretches from its threshold to here. */
const SCALES: Record<MeterKind, Scale> = {
  safety: {
    max: 1.4,
    label: 'Safety ratio',
    edges: SAFETY_TIER_THRESHOLDS.map((t) => ({ tier: t.tier, min: t.minSr })),
    text: safetyRatioText,
  },
};

interface Band {
  tier: Tier;
  from: number;
  to: number;
}

/** Bands from low to high, derived from the thresholds (listed high to low), raised by `lift`. */
function bands(sc: Scale, lift: number): Band[] {
  const edges = [...sc.edges].reverse();
  return edges.map((t, i) => ({
    tier: t.tier,
    from: Number.isFinite(t.min) ? t.min + lift : 0,
    to: edges[i + 1] ? edges[i + 1]!.min + lift : sc.max,
  }));
}

/** `lift` raises every tier line (policy buffer and strict watch). */
export function CapitalMeter(p: { ratio: number; tier: Tier; kind?: MeterKind; lift?: number }) {
  const sc = SCALES[p.kind ?? 'safety'];
  const all = bands(sc, p.lift ?? 0);
  const marker = Math.max(0, Math.min(1, p.ratio / sc.max));
  const edge = sc.text;
  return (
    <div class="meter">
      <div class="meter-bar" role="img" aria-label={`${sc.label} ${edge(p.ratio)}, ${p.tier}`}>
        {all.map((b) => (
          <span
            key={b.tier}
            class={`meter-band meter-${b.tier}${b.tier === p.tier ? ' is-current' : ''}`}
            style={{ width: `${((b.to - b.from) / sc.max) * 100}%` }}
          />
        ))}
        <span class="meter-marker" style={{ left: `${marker * 100}%` }} />
      </div>
      <div class="meter-ticks" aria-hidden="true">
        {all.slice(1).map((b) => (
          <span key={b.tier} style={{ left: `${(b.from / sc.max) * 100}%` }}>
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
