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
 * Share of a rival branch's deposits by product, as in a mature branch:
 * mostly savings, chequing and GICs, some business accounts. Sums to 1.
 */
export const ACQUIRED_DEPOSIT_MIX: Record<string, number> = {
  chequing: 0.28,
  savings: 0.34,
  gic1y: 0.26,
  business_acct: 0.1,
  student: 0.02,
};

/** Share of a rival branch's loans by product: mortgage-heavy like a mature branch. Sums to 1. */
export const ACQUIRED_LOAN_MIX: Record<string, number> = {
  mortgage: 0.62,
  personal_loan: 0.08,
  auto_loan: 0.12,
  loc: 0.08,
  credit_card: 0.1,
};
