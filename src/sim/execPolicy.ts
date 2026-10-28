// Delegation dials (SCREENS §10.1): what each stop of the COO's morale target,
// the CMO's awareness target and the pay review cadence would mean for the
// company right now, for the tagline under each dial. Pure estimates that
// change nothing; the weekly routines in execDelegationsPeople.ts and
// payReviews.ts do the actual work with the same rules.
import {
  AWARENESS_FLOOR,
  EXEC_DELEGATION as X,
  MANAGER_PAY,
  PAY_REVIEW,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { BRAND_CAMPAIGNS } from '../data/brandCampaigns';
import { weeklyRevenue } from './execDelegationsFinance';
import {
  averageMorale,
  benefitStep,
  benefitsBudget,
  costOf,
  moraleFrom,
} from './execDelegationsPeople';
import { annualPayroll } from './hq';
import { brandCampaignCost, brandCampaignsWeeklyCost, hasMarketingFloor } from './hqMarketing';
import type { PayReviewCadence } from './marketsTypes';
import { nextReviewDelta, payReviewEveryWeeks } from './payReviews';
import type { GameState } from './state';

/** Most benefit steps the estimate walks (the routine takes one every 4 weeks). */
const MAX_STEPS = 40;

export interface MoraleEstimate {
  target: number;
  /** Average morale now (head-count weighted). */
  now: number;
  /** Where the COO's benefit steps would take it. */
  morale: number;
  /** Weekly benefits cost after those steps, and the change from today. */
  weeklyCost: number;
  deltaCost: number;
  /** Benefits as a share of annual payroll after the steps. */
  payrollShare: number;
  /** True when the benefits budget stops short of the target. */
  capped: boolean;
  /** False without an HR floor: the delegation has nothing to work with. */
  active: boolean;
}

/** Benefits the COO would buy (or trim) to hold morale at `target`, by the routine's own rule. */
export function moraleEstimate(state: GameState, target: number): MoraleEstimate {
  const { morale: now, hqShare } = averageMorale(state);
  const live = state.people.benefits;
  const benefits = { ...live };
  const base = moraleFrom(state, live, hqShare);
  const budget = benefitsBudget(state);
  const payroll = annualPayroll(state);
  let est = now;
  const at = () => now + moraleFrom(state, benefits, hqShare) - base;
  if (now < target) {
    for (let k = 0; k < MAX_STEPS && est < target; k++) {
      const step = benefitStep(state, benefits, hqShare, true, budget);
      if (!step) break;
      benefits[step.id] = step.value;
      est = at();
    }
  } else {
    for (let k = 0; k < MAX_STEPS && est > target + X.moraleSlack; k++) {
      const step = benefitStep(state, benefits, hqShare, false, budget);
      if (!step) break;
      benefits[step.id] = step.value;
      est = at();
    }
  }
  const weeklyCost = costOf(state, benefits);
  return {
    target,
    now,
    morale: est,
    weeklyCost,
    deltaCost: weeklyCost - costOf(state, live),
    payrollShare: payroll > 0 ? (weeklyCost * WEEKS_PER_YEAR) / payroll : 0,
    capped: now < target && est < target,
    active: !!state.departments.hr,
  };
}

export interface BrandEstimate {
  target: number;
  /** Cities with an open branch, and how many the CMO would be pushing. */
  cities: number;
  pushed: number;
  /** Weekly campaign spend at that target, and the change from today. */
  weeklyCost: number;
  deltaCost: number;
  /** Spend as a share of weekly revenue. */
  revenueShare: number;
  /** True when the 3%-of-revenue budget holds the spend back. */
  capped: boolean;
  /** Change in new-customer flow once awareness sits at the target (+0.04 = 4% more). */
  prospects: number;
  /** False without a Marketing floor. */
  active: boolean;
}

/** The new-customer factor from awareness (SIMULATION §9.1), for a branch at a and a city at b. */
const flow = (a: number, b: number) =>
  AWARENESS_FLOOR + (1 - AWARENESS_FLOOR) * (1 - (1 - a) * (1 - b));

/** Campaigns the CMO would run to hold every branch city near `target`, by the routine's own rule. */
export function brandEstimate(state: GameState, target: number): BrandEstimate {
  const open = Object.values(state.branches).filter((b) => b.status === 'open');
  const cities = [...new Set(open.map((b) => b.cityId))].sort();
  const cheapest = Object.values(BRAND_CAMPAIGNS)
    .filter((c) => c.scopes.includes('city') && !c.needsFranchise)
    .sort((a, b) => brandCampaignCost(state, a, 'city') - brandCampaignCost(state, b, 'city'));
  const current = brandCampaignsWeeklyCost(state, 'city');
  const revenue = weeklyRevenue(state);
  const budget = X.brandBudgetShare * revenue;
  let cost = current;
  let pushed = 0;
  let capped = false;
  const held: Record<string, number> = {};
  for (const cityId of cities) {
    const b = state.world.cities[cityId]?.brandAwareness ?? 0;
    held[cityId] = b;
    const running = state.marketing.campaigns.filter(
      (c) => c.scope === 'city' && c.targetId === cityId,
    );
    if (b > target + X.brandSlack) {
      for (const c of running) {
        const spec = BRAND_CAMPAIGNS[c.campaignId];
        if (spec) cost -= brandCampaignCost(state, spec, 'city');
      }
      held[cityId] = target;
    } else if (b < target - X.brandSlack) {
      // As the routine: a campaign starts only while the budget covers it.
      const next = cheapest.find((spec) => !running.some((c) => c.campaignId === spec.id));
      const add = next ? brandCampaignCost(state, next, 'city') : 0;
      if (next && cost + add > budget) {
        capped = true;
        continue;
      }
      cost += add;
      pushed += 1;
      held[cityId] = target;
    }
  }
  const weeklyCost = Math.max(0, cost);
  let nowFlow = 0;
  let thenFlow = 0;
  for (const br of open) {
    const b = state.world.cities[br.cityId]?.brandAwareness ?? 0;
    nowFlow += flow(br.awareness, b);
    thenFlow += flow(br.awareness, held[br.cityId] ?? b);
  }
  return {
    target,
    cities: cities.length,
    pushed,
    weeklyCost,
    deltaCost: weeklyCost - current,
    revenueShare: revenue > 0 ? weeklyCost / revenue : 0,
    capped,
    prospects: nowFlow > 0 ? thenFlow / nowFlow - 1 : 0,
    active: hasMarketingFloor(state),
  };
}

export interface CadenceEstimate {
  cadence: PayReviewCadence;
  everyWeeks: number;
  reviewsPerYear: number;
  /** How far pay can fall behind the market before the next review (market pay rises ~3% a year). */
  maxDrift: number;
  /** What the next review would add to annual pay, and for how many people. */
  next: { delta: number; people: number };
}

/** What a review cadence means: how often, how far pay drifts between reviews, and the next bill. */
export function cadenceEstimate(state: GameState, cadence: PayReviewCadence): CadenceEstimate {
  const everyWeeks = PAY_REVIEW.cadences[cadence];
  return {
    cadence,
    everyWeeks,
    reviewsPerYear: Math.round(WEEKS_PER_YEAR / everyWeeks),
    maxDrift: (MANAGER_PAY.tenureGrowth * everyWeeks) / WEEKS_PER_YEAR,
    next: nextReviewDelta(state),
  };
}

/** Weeks until the COO's next review on the current cadence (0 when due). */
export function weeksToNextReview(state: GameState): number {
  const last = state.executives.lastPayReviewWeek;
  if (last < 0) return 0;
  return Math.max(0, last + payReviewEveryWeeks(state) - state.clock.week);
}
