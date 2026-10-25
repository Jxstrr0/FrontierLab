// Executive delegations for people, brand and risk (SIMULATION §17.2 table),
// each a small weekly routine that only uses the player's own commands:
//   COO  branchOps   hires the best candidate for an open branch with no manager
//                    and turns on default delegation (EXEC_DELEGATION.cooDelegation)
//   COO  hrBenefits  one benefit step a week to hold average morale ≥ 70 at least cost
//   COO  hrDivision  sets every HQ team's target to cover its requirement
//   CMO  brand       starts or stops city brand campaigns to hold awareness near 0.5
//                    within 3% of weekly revenue
//   CRO  appetite    every few weeks, one appetite step toward CR ≥ 12% and losses ≤ 1.2%
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
  for (const branch of Object.values(state.branches)) {
    if (branch.status !== 'open' || branch.managerId) continue;
    const pool = state.people.managerCandidates[branch.cityId] ?? [];
    const avg = (m: (typeof pool)[number]) =>
      m.skills.people + m.skills.product + m.skills.marketing + m.skills.ethics;
    const best = [...pool].sort((a, b) => avg(b) - avg(a))[0];
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

/** Morale points a benefit level adds across the company (HQ-only benefits weighted by HQ share). */
function moraleAt(state: GameState, id: string, value: number, hqShare: number): number {
  const benefits = state.people.benefits;
  const before = benefits[id];
  benefits[id] = value;
  const mods = staffMods(state);
  if (before === undefined) delete benefits[id];
  else benefits[id] = before;
  return mods.morale + mods.hqMorale * hqShare;
}

/**
 * HR benefits: one step up for the cheapest morale when below target (within
 * the benefits budget), one step down when well above target or over budget.
 */
export function cooBenefits(state: GameState): void {
  if (!state.departments.hr || state.clock.week % X.benefitsEveryWeeks !== 0) return;
  const { morale, hqShare } = averageMorale(state);
  const budget = (X.benefitsBudgetShare * annualPayroll(state)) / WEEKS_PER_YEAR;
  const spent = benefitsWeeklyCost(state);
  const raise = morale < X.moraleTarget && spent < budget;
  if (!raise && morale <= X.moraleTarget + X.moraleSlack && spent <= budget) return;
  let best: { id: string; value: number; score: number } | undefined;
  for (const spec of Object.values(BENEFITS)) {
    if (spec.publicOnly || spec.control === 'toggle') continue;
    const v = state.people.benefits[spec.id] ?? 0;
    const next = raise ? Math.min(spec.max, v + spec.step) : Math.max(spec.min, v - spec.step);
    if (next === v) continue;
    const dMorale = Math.abs(
      moraleAt(state, spec.id, next, hqShare) - moraleAt(state, spec.id, v, hqShare),
    );
    const dCost = Math.abs(
      benefitWeeklyCost(state, spec.id, next) - benefitWeeklyCost(state, spec.id, v),
    );
    if (dCost <= 0 || dMorale <= 0 || (raise && spent + dCost > budget)) continue;
    // Raising: most morale per dollar. Cutting: least morale lost per dollar saved.
    const score = raise ? dMorale / dCost : dCost / dMorale;
    if (!best || score > best.score) best = { id: spec.id, value: next, score };
  }
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

/** Brand: city campaigns to hold awareness near target in every city with a branch, within budget. */
export function cmoBrand(state: GameState): void {
  if (!hasMarketingFloor(state)) return;
  const budget = X.brandBudgetShare * weeklyRevenue(state);
  const cities = [
    ...new Set(
      Object.values(state.branches)
        .filter((b) => b.status === 'open')
        .map((b) => b.cityId),
    ),
  ].sort();
  const cityCampaigns = Object.values(BRAND_CAMPAIGNS)
    .filter((c) => c.scopes.includes('city') && !c.needsFranchise)
    .sort((a, b) => brandCampaignCost(a, 'city') - brandCampaignCost(b, 'city'));
  for (const cityId of cities) {
    const b = state.world.cities[cityId]?.brandAwareness ?? 0;
    const running = state.marketing.campaigns.filter(
      (c) => c.scope === 'city' && c.targetId === cityId,
    );
    if (b > X.brandTarget + X.brandSlack) {
      for (const c of running) stopBrandCampaign(state, c.id);
    } else if (b < X.brandTarget - X.brandSlack) {
      const next = cityCampaigns.find((spec) => !running.some((c) => c.campaignId === spec.id));
      if (next && brandCampaignsWeeklyCost(state) + brandCampaignCost(next, 'city') <= budget)
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

/** Risk appetite: one step at a time toward the CR and loss-rate targets. */
export function croAppetite(state: GameState): void {
  if (state.clock.week % X.croEveryWeeks !== 0) return;
  const cr = state.company.capitalRatio;
  const loss = companyLossRate(state);
  const level = state.company.riskAppetite;
  if ((cr < X.croMinCr || loss > X.croMaxLoss) && level > 1) setRiskAppetite(state, level - 1);
  else if (cr >= X.croRaiseCr && loss <= X.croRaiseLoss && level < X.croMaxAppetite)
    setRiskAppetite(state, level + 1);
}
