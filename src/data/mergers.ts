// Content for acquired rival branches (SIMULATION §19.8, DESIGN §5.10): the
// build each rival strategy's branches convert to, and the mature product mix
// their aggregate books are split into when they join your bank.
import type { Strategy } from './rivals';
import { REFERENCE_BUILDS, type BuildSpec } from './equipment';

/** The fit-out an acquired branch keeps, by the seller's strategy (its quality profile). */
export const ACQUIRED_BUILDS: Record<Strategy, BuildSpec> = {
  premium: REFERENCE_BUILDS.premium,
  incumbent: REFERENCE_BUILDS.mid,
  community: REFERENCE_BUILDS.mid,
  disruptor: REFERENCE_BUILDS.basic,
};

/**
 * Plans an acquired office's customers move onto (C3a), by share of customers.
 * Sums to 1.
 */
export const ACQUIRED_PLAN_MIX: Record<string, number> = {
  plus: 0.6,
  pro: 0.15,
  team: 0.2,
  campus_plan: 0.05,
};
