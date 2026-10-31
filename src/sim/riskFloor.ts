// Safety & Alignment (SIMULATION §15, §16; SCREENS §10): the selectors behind
// the floor (regulator status, audit odds) and the quarterly safety audit.
import { HQ_EFFECTS, LICENCE, REGULATOR_REVIEW, WEEKS_PER_YEAR } from '../config/balance';
import type { Tier } from '../data/types';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { spend } from './ledger';
import { stream } from './rng';
import { safetyExposure, underStrictWatch } from './safety';
import type { GameState, RegulatorReview } from './state';

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Average ethics of the branch managers in post (or the default with none). */
export function avgManagerEthics(state: GameState): number {
  const ethics = Object.values(state.people.managers)
    .filter((m) => m.branchId)
    .map((m) => m.skills.ethics);
  if (ethics.length === 0) return REGULATOR_REVIEW.defaultEthics;
  return ethics.reduce((a, b) => a + b, 0) / ethics.length;
}

/**
 * §15: the quarterly safety audit's fail chance,
 * 0.02 × (1 + 3 × (1 − safetyCoverage′)) × (1.6 − avgManagerEthics/100) × exposure,
 * doubled under strict watch (C7a).
 */
export function reviewFailChance(state: GameState): number {
  const kPrime = Math.min(1, state.hq.coverage.risk?.kPrime ?? 1);
  return (
    REGULATOR_REVIEW.failBase *
    (1 + HQ_EFFECTS.riskFine * (1 - kPrime)) *
    (REGULATOR_REVIEW.ethicsBase - avgManagerEthics(state) / 100) *
    safetyExposure(state) *
    (underStrictWatch(state) ? LICENCE.watchAuditMult : 1)
  );
}

export interface RegulatorStatus {
  tier: Tier;
  safetyRatio: number;
  /** Chance the next quarterly review fails. */
  failChance: number;
  lastReview?: RegulatorReview;
  failedReviews: number;
}

export function regulatorStatus(state: GameState): RegulatorStatus {
  const status: RegulatorStatus = {
    tier: state.company.tier,
    safetyRatio: state.company.safetyRatio,
    failChance: reviewFailChance(state),
    failedReviews: state.risk.reviews.filter((r) => !r.passed).length,
  };
  const last = state.risk.reviews.at(-1);
  if (last) status.lastReview = last;
  return status;
}

// ─── Quarterly review (tick step 13) ─────────────────────────────────────────

/** Revenue (interest income + fee & other income) over the last 52 weekly closes. */
export function trailingRevenue(state: GameState): number {
  return state.history.weekly.slice(-WEEKS_PER_YEAR).reduce((sum, w) => sum + w.revenue, 0);
}

/**
 * §15: the regulator's quarterly review. A failure proposes a fine of 0.05–0.3% of
 * trailing revenue through the REGULATOR_AUDIT incident.
 */
export function regulatorReview(state: GameState): RegulatorReview {
  const rng = stream(state, 'regulator');
  const failed = rng.chance(reviewFailChance(state));
  const [lo, hi] = REGULATOR_REVIEW.fineRange;
  const fine = failed ? rng.range(lo, hi) * Math.max(0, trailingRevenue(state)) : 0;
  const review: RegulatorReview = { week: state.clock.week, passed: !failed, fine };
  state.risk.reviews.push(review);
  if (failed) {
    pushEvent(state, 'REGULATOR_AUDIT', { fine }, 1);
    // The fine waits on the REGULATOR_AUDIT incident's choice (pay, appeal or consultants).
    if (!raiseIncident(state, 'REGULATOR_AUDIT', 'company', 'company', { fine })) {
      spend(state, 'fines', fine);
    }
  }
  return review;
}
