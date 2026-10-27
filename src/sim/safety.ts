// The safety ratio and the AI regulator's tiers (stage C7a, SIMULATION §15):
// how well the Safety & Alignment floor covers the risk your model carries,
// the tier it sets (Strong → Critical), the pause that halts sales and
// training, strict watch after a revoked licence, and the deal-win edge a
// strong record gives with data-sensitive businesses. The bank's capital
// ratio lives on in capital.ts as the lenders' credit ratio.
import {
  CAPITAL_GATE,
  HQ_COVERAGE,
  LICENCE,
  SAFETY,
  SAFETY_TIER_THRESHOLDS,
} from '../config/balance';
import type { Tier } from '../data/types';
import { capitalBufferPp } from './capital';
import { clamp } from './math';
import type { Business, GameState } from './state';
import { RADAR, activeModel, modelQuality, qualityBar } from './underwriting';

export interface SafetySnapshot {
  /** Safety coverage′ plus any staffing above the requirement. */
  strength: number;
  /** How much risk the model in use carries (1 = a model at the bar). */
  exposure: number;
  ratio: number;
  tier: Tier;
}

/** §15: Safety floor coverage′ plus staffing above full (k up to kMax). */
export function safetyStrength(state: GameState): number {
  const c = state.hq.coverage.risk;
  if (!c) return 1;
  return Math.min(1, c.kPrime) + clamp(c.k - 1, 0, HQ_COVERAGE.kMax - 1);
}

/** §15: 1 + frontierWeight × lead over the bar − modelSafetyWeight × (Safety axis − 5). */
export function safetyExposure(state: GameState): number {
  const m = activeModel(state);
  const lead = Math.max(0, modelQuality(m) - qualityBar(state));
  return Math.max(
    SAFETY.minExposure,
    1 + SAFETY.frontierWeight * lead - SAFETY.modelSafetyWeight * (m.radar[RADAR.safety] - 5),
  );
}

/** True while the lab is under strict watch after a revoked licence. */
export function underStrictWatch(state: GameState): boolean {
  const until = state.company.watchUntilWeek;
  return until !== undefined && state.clock.week < until;
}

/** How far every tier line sits above its base: a policy buffer plus strict watch. */
export function tierLift(state: GameState): number {
  return (
    capitalBufferPp(state) * SAFETY.bufferPerPp +
    (underStrictWatch(state) ? LICENCE.watchBuffer : 0)
  );
}

/** The safety tier for a ratio, with every line raised by `lift`. */
export function safetyTierFor(ratio: number, lift = 0): Tier {
  for (const t of SAFETY_TIER_THRESHOLDS) if (ratio >= t.minSr + lift) return t.tier;
  return 'critical';
}

export function safetySnapshot(state: GameState): SafetySnapshot {
  const strength = safetyStrength(state);
  const exposure = safetyExposure(state);
  const ratio = strength / exposure;
  return { strength, exposure, ratio, tier: safetyTierFor(ratio, tierLift(state)) };
}

/** Tick step 10: updates the safety ratio and the regulator tier. */
export function evaluateSafety(state: GameState): SafetySnapshot {
  const snap = safetySnapshot(state);
  const c = state.company;
  if (snap.tier === c.tier) c.tierWeeks += 1;
  else {
    c.tier = snap.tier;
    c.tierWeeks = 0;
  }
  c.safetyRatio = snap.ratio;
  return snap;
}

/** True during a mandated pause (voluntary or after a revoked licence). */
export function isPaused(state: GameState): boolean {
  const p = state.company.pause;
  return p !== undefined && state.clock.week < p.untilWeek;
}

/** Why new deals and training are blocked, or undefined when they aren't. */
export function pauseBlock(state: GameState): string | undefined {
  const p = state.company.pause;
  if (!p || state.clock.week >= p.untilWeek) return undefined;
  return p.reason === 'revoked'
    ? 'The regulator has revoked our licence: no new customers or training until it is restored.'
    : 'We are in a mandated pause: no new customers or training until it ends.';
}

/** Share of new customers the regulator lets in: the tier's gate, 0 while paused. */
export function salesGate(state: GameState): number {
  return isPaused(state) ? 0 : CAPITAL_GATE[state.company.tier];
}

/** §15: data-sensitive businesses (sensitivity over 5) favour a lab with a strong safety record. */
export function safetyDealEdge(state: GameState, b: Business): number {
  return (SAFETY.dealEdge[state.company.tier] * Math.max(0, b.pentagon[2] - 5)) / 5;
}
