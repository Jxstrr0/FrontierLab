// Executive delegations for people, brand and risk (SIMULATION §17.2 table),
// each a small weekly routine that only uses the player's own commands:
//   COO  branchOps   hires the best candidate for an open branch with no manager
//                    and turns on default delegation (EXEC_DELEGATION.cooDelegation)
//   COO  hrBenefits  one benefit step a week to hold average morale at or over
//                    the target you dial (executives.moraleTarget) at least cost
//   COO  hrDivision  sets every HQ team's target to cover its requirement
//   CMO  brand       starts or stops city brand campaigns to hold awareness near
//                    the target you dial (executives.brandTarget) within 3% of revenue
//   CSO  appetite    every few weeks, one launch posture step: down while the safety
//                    tier is weak, up while Strong, no higher than the posture
//                    ceiling you dial (executives.postureCeiling)
// The CRO's Loan Desk policy runs inside the Loan Desk (branch/loanDesk.ts).
import { DEPT_DEFAULT_EFF, EXEC_DELEGATION as X, WEEKS_PER_YEAR } from '../config/balance';
import { BENEFITS } from '../data/benefits';
import { BRAND_CAMPAIGNS } from '../data/brandCampaigns';
import { HQ_DEPTS } from '../data/departments';
import { setBenefit, setDeptTarget } from './commands/hq';
import { startBrandCampaign, stopBrandCampaign } from './commands/marketing';
import { setRiskAppetite } from './commands/products';
import { hireManager } from './commands/staff';
import { execMult } from './execSeats';
import { strongestCandidate, unstaffedBranches } from './hrHiring';
import {
  annualPayroll,
  benefitsWeeklyCost,
  benefitWeeklyCost,
  deptDesks,
  requiredStaff,
  staffEff,
  staffMods,
} from './hq';
import { brandCampaignCost, brandCampaignsWeeklyCost, hasMarketingFloor } from './hqMarketing';
import { companyLossRate } from './riskFloor';
import type { GameState } from './state';
import { weeklyRevenue } from './execDelegationsFinance';

export { companyLossRate };

// ─── COO ──────────────────────────────────────────────────────────────────────

/** Branch operations: a manager for every open branch, with default delegation on. */
export function cooBranchOps(state: GameState): void {
  for (const branch of unstaffedBranches(state)) {
    const best = strongestCandidate(state.people.managerCandidates[branch.cityId] ?? []);
    if (!best || !hireManager(state, branch.id, best.id).ok) continue;
    branch.delegation = { ...X.cooDelegation };
  }
}

/** Head-count weighted average morale across branches and HQ, and HQ's share of heads. */
export function averageMorale(state: GameState): { morale: number; hqShare: number } {
  let heads = 0;
  let hqHeads = 0;
  let total = 0;
  for (const b of Object.values(state.branches)) {
    if (b.status !== 'open') continue;
    heads += b.staff.count;
    total += b.staff.count * b.staff.morale;
  }
  for (const d of Object.values(state.departments)) {
    if (!d) continue;
    heads += d.staff;
    hqHeads += d.staff;
    total += d.staff * d.morale;
  }
  return heads > 0
    ? { morale: total / heads, hqShare: hqHeads / heads }
    : { morale: 100, hqShare: 0 };
}

/** Morale points a benefits map adds across the company (HQ-only benefits weighted by HQ share). */
export function moraleFrom(
  state: GameState,
  benefits: Record<string, number>,
  hqShare: number,
): number {
  const mods = staffMods(state, benefits);
  return mods.morale + mods.hqMorale * hqShare;
}

/** Weekly cost of a benefits map (benefitsWeeklyCost for the live one). */
export function costOf(state: GameState, benefits: Record<string, number>): number {
  let sum = 0;
  for (const [id, v] of Object.entries(benefits)) sum += benefitWeeklyCost(state, id, v);
  return sum;
}

/** The COO's weekly benefits budget: benefitsBudgetShare of annual payroll. */
export function benefitsBudget(state: GameState): number {
  return (X.benefitsBudgetShare * annualPayroll(state)) / WEEKS_PER_YEAR;
}

/**
 * The one benefit step the COO would take from a benefits map: up for the most
 * morale per dollar when raising (staying inside the budget), down for the
 * least morale lost per dollar saved when cutting. Pure: nothing is changed.
 */
export function benefitStep(
  state: GameState,
  benefits: Record<string, number>,
  hqShare: number,
  raise: boolean,
  budget: number,
): { id: string; value: number } | undefined {
  const spent = costOf(state, benefits);
  let best: { id: string; value: number; score: number } | undefined;
  for (const spec of Object.values(BENEFITS)) {
    if (spec.publicOnly || spec.control === 'toggle') continue;
    const v = benefits[spec.id] ?? 0;
    const next = raise ? Math.min(spec.max, v + spec.step) : Math.max(spec.min, v - spec.step);
    if (next === v) continue;
    const dMorale = Math.abs(
      moraleFrom(state, { ...benefits, [spec.id]: next }, hqShare) -
        moraleFrom(state, benefits, hqShare),
    );
    const dCost = Math.abs(
      benefitWeeklyCost(state, spec.id, next) - benefitWeeklyCost(state, spec.id, v),
    );
    if (dCost <= 0 || dMorale <= 0 || (raise && spent + dCost > budget)) continue;
    // Raising: most morale per dollar. Cutting: least morale lost per dollar saved.
    const score = raise ? dMorale / dCost : dCost / dMorale;
    if (!best || score > best.score) best = { id: spec.id, value: next, score };
  }
  return best && { id: best.id, value: best.value };
}

/**
 * HR benefits: one step up for the cheapest morale when below the target you
 * dialled (within the benefits budget), one step down when well above it or
 * over budget.
 */
export function cooBenefits(state: GameState): void {
  if (!state.departments.hr || state.clock.week % X.benefitsEveryWeeks !== 0) return;
  const { morale, hqShare } = averageMorale(state);
  const target = state.executives.moraleTarget;
  const budget = benefitsBudget(state);
  const spent = benefitsWeeklyCost(state);
  const raise = morale < target && spent < budget;
  if (!raise && morale <= target + X.moraleSlack && spent <= budget) return;
  const best = benefitStep(state, state.people.benefits, hqShare, raise, budget);
  if (best) setBenefit(state, best.id, best.value);
}

/** HR division: every HQ team's target set to cover its requirement. */
export function cooDivision(state: GameState): void {
  for (const id of HQ_DEPTS) {
    const d = state.departments[id];
    if (!d) continue;
    const perStaff =
      d.staff > 0 ? staffEff(state, d) / d.staff : DEPT_DEFAULT_EFF * execMult(state, id);
    const target = Math.min(
      deptDesks(state, id),
      Math.ceil(requiredStaff(state, id) / Math.max(perStaff, 1e-6)),
    );
    if (target !== d.target) setDeptTarget(state, id, target);
  }
}

// ─── CMO ──────────────────────────────────────────────────────────────────────

/** Brand: city campaigns to hold awareness near your target in every city with a branch, within budget. */
export function cmoBrand(state: GameState): void {
  if (!hasMarketingFloor(state)) return;
  const budget = X.brandBudgetShare * weeklyRevenue(state);
  const target = state.executives.brandTarget;
  const cities = [
    ...new Set(
      Object.values(state.branches)
        .filter((b) => b.status === 'open')
        .map((b) => b.cityId),
    ),
  ].sort();
  const cityCampaigns = Object.values(BRAND_CAMPAIGNS)
    .filter((c) => c.scopes.includes('city') && !c.needsFranchise)
    .sort((a, b) => brandCampaignCost(state, a, 'city') - brandCampaignCost(state, b, 'city'));
  for (const cityId of cities) {
    const b = state.world.cities[cityId]?.brandAwareness ?? 0;
    const running = state.marketing.campaigns.filter(
      (c) => c.scope === 'city' && c.targetId === cityId,
    );
    if (b > target + X.brandSlack) {
      for (const c of running) stopBrandCampaign(state, c.id);
    } else if (b < target - X.brandSlack) {
      const next = cityCampaigns.find((spec) => !running.some((c) => c.campaignId === spec.id));
      if (
        next &&
        brandCampaignsWeeklyCost(state) + brandCampaignCost(state, next, 'city') <= budget
      )
        startBrandCampaign(state, { campaignId: next.id, scope: 'city', targetId: cityId });
    }
  }
  // Over budget (revenue fell): drop the dearest city campaign.
  if (brandCampaignsWeeklyCost(state) > budget) {
    const dearest = state.marketing.campaigns
      .filter((c) => c.scope === 'city')
      .sort(
        (a, b) =>
          (BRAND_CAMPAIGNS[b.campaignId]?.costPerWeek.city ?? 0) -
          (BRAND_CAMPAIGNS[a.campaignId]?.costPerWeek.city ?? 0),
      )[0];
    if (dearest) stopBrandCampaign(state, dearest.id);
  }
}

// ─── CRO ──────────────────────────────────────────────────────────────────────

export interface PosturePlan {
  level: number;
  ceiling: number;
  tier: GameState['company']['tier'];
  /** The step the CSO's next check would take. */
  next: 'up' | 'down' | 'hold';
  /** Weeks until that check (croEveryWeeks when it ran this week). */
  weeksTo: number;
}

/** The CSO's next posture step under `ceiling`, for the dial's tagline. Changes nothing. */
export function posturePlan(state: GameState, ceiling: number): PosturePlan {
  const tier = state.company.tier;
  const level = state.company.riskAppetite;
  const next =
    CSO_STEP_DOWN.has(tier) && level > 1
      ? 'down'
      : tier === 'strong' && level < ceiling
        ? 'up'
        : 'hold';
  const rem = state.clock.week % X.croEveryWeeks;
  return {
    level,
    ceiling,
    tier,
    next,
    weeksTo: rem === 0 ? X.croEveryWeeks : X.croEveryWeeks - rem,
  };
}

/** Launch posture (C8f): one step down while the safety tier is weak, up while it is Strong, up to the dialled ceiling. */
export function croAppetite(state: GameState): void {
  if (state.clock.week % X.croEveryWeeks !== 0) return;
  const { level, next } = posturePlan(state, state.executives.postureCeiling);
  if (next === 'down') setRiskAppetite(state, level - 1);
  else if (next === 'up') setRiskAppetite(state, level + 1);
}

const CSO_STEP_DOWN = new Set(['watch', 'restricted', 'critical']);
