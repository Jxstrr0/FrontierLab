// Branch awareness, city brand awareness and campaign effects (SIMULATION §7).
import {
  AWARENESS_DECAY,
  BRAND_DECAY,
  CAMPAIGN_COST_SCALE,
  BRAND_PASSIVE_PER_BRANCH,
  GRAND_OPENING_BONUS,
  GRAND_OPENING_WEEKS,
  MANAGER_MARKETING,
} from '../../config/balance';
import { CAMPAIGNS, type CampaignLevel } from '../../data/campaigns';
import { CITIES } from '../../data/cities';
import type { RatingCategory, SegmentId } from '../../data/types';
import { campaignMult } from '../hq';
import { clamp } from '../math';
import { listLevel } from '../nominal';
import type { Branch, GameState } from '../state';
import { sizeMult } from './officeSize';

export interface CampaignEffects {
  awareness: number;
  bumps: Record<RatingCategory, number>;
  segments: Record<SegmentId, number>;
  capacity: number;
  depositTakeUp: number;
  loanDesk: number;
  /** Weekly fixed cost after city.costIndex. */
  weeklyCost: number;
  perNewDepositAccount: number;
  perAccount: number;
  /** Strongest active sign-up churn multiplier. */
  churn?: { mult: number; weeks: number };
  activeIds: string[];
}

export function activeLevels(branch: Branch): { id: string; level: CampaignLevel }[] {
  const out: { id: string; level: CampaignLevel }[] = [];
  for (const [id, lvl] of Object.entries(branch.campaigns)) {
    const level = lvl > 0 ? CAMPAIGNS[id]?.levels[lvl - 1] : undefined;
    if (level) out.push({ id, level });
  }
  return out;
}

/**
 * What one unit of a weekly campaign cost costs this office: city costIndex ×
 * price list (§4.6) × office size mult × CAMPAIGN_COST_SCALE (CONTENT §8).
 */
export function campaignCostIndex(state: GameState, branch: Branch): number {
  const city = CITIES[branch.cityId]?.costIndex ?? 1;
  return city * listLevel(state, branch.cityId) * sizeMult(branch) * CAMPAIGN_COST_SCALE;
}

/** Sums every active campaign's effects at this branch (CONTENT §8). */
export function campaignEffects(state: GameState, branch: Branch): CampaignEffects {
  // Costs at the city's cost index and today's price list (§4.6).
  const priceLevel = listLevel(state, branch.cityId);
  const costIndex = campaignCostIndex(state, branch);
  const fx: CampaignEffects = {
    awareness: 0,
    bumps: { rates: 0, products: 0, service: 0, branch: 0 },
    segments: { STU: 1, YP: 1, FAM: 1, RET: 1, BIZ: 1 },
    capacity: 1,
    depositTakeUp: 1,
    loanDesk: 1,
    weeklyCost: 0,
    perNewDepositAccount: 0,
    perAccount: 0,
    activeIds: [],
  };
  for (const { id, level } of activeLevels(branch)) {
    fx.activeIds.push(id);
    fx.awareness += level.awareness ?? 0;
    for (const [cat, v] of Object.entries(level.bumps ?? {})) fx.bumps[cat as RatingCategory] += v;
    for (const [seg, v] of Object.entries(level.segments ?? {})) fx.segments[seg as SegmentId] *= v;
    fx.capacity *= level.capacity ?? 1;
    fx.depositTakeUp *= level.depositTakeUp ?? 1;
    fx.loanDesk *= level.loanDesk ?? 1;
    if (level.cost.type === 'weekly') fx.weeklyCost += level.cost.amount * costIndex;
    else if (level.cost.type === 'perNewDepositAccount')
      fx.perNewDepositAccount += level.cost.amount * priceLevel;
    else fx.perAccount += level.cost.amount * priceLevel;
    if (level.churn && (!fx.churn || level.churn.mult > fx.churn.mult)) fx.churn = level.churn;
  }
  return fx;
}

export function marketingMult(state: GameState, branch: Branch): number {
  const mgr = branch.managerId ? state.people.managers[branch.managerId] : undefined;
  const skill = mgr?.skills.marketing ?? 0;
  return (MANAGER_MARKETING.base + (MANAGER_MARKETING.slope * skill) / 100) * campaignMult(state);
}

/** Weekly branch awareness: a = a × (1 − decay) + Σ gain × (1 − a) × mktMult. */
export function updateAwareness(state: GameState, branch: Branch, fx: CampaignEffects): void {
  const a = branch.awareness;
  const gain = fx.awareness * (1 - a) * marketingMult(state, branch);
  branch.awareness = clamp(a * (1 - AWARENESS_DECAY) + gain, 0, 1);
  if (branch.grandOpeningWeeksLeft > 0) branch.grandOpeningWeeksLeft -= 1;
  // Sign-up churn cohort: held while the campaign runs, then decays linearly.
  if (fx.churn) {
    branch.signupChurn = {
      mult: fx.churn.mult,
      weeksLeft: fx.churn.weeks,
      weeksTotal: fx.churn.weeks,
    };
  } else if (branch.signupChurn.weeksLeft > 0) {
    branch.signupChurn.weeksLeft -= 1;
  }
}

export function signupChurnMult(branch: Branch): number {
  const s = branch.signupChurn;
  if (s.weeksLeft <= 0 || s.weeksTotal <= 0) return 1;
  return 1 + (s.mult - 1) * (s.weeksLeft / s.weeksTotal);
}

/** Effective awareness e = 1 − (1 − a)(1 − b), with the grand-opening bonus on a. */
export function effectiveAwareness(state: GameState, branch: Branch): number {
  const bonus = (GRAND_OPENING_BONUS * branch.grandOpeningWeeksLeft) / GRAND_OPENING_WEEKS;
  const a = clamp(branch.awareness + bonus, 0, 1);
  const b = state.world.cities[branch.cityId]?.brandAwareness ?? 0;
  return 1 - (1 - a) * (1 - b);
}

/** City brand awareness b: decays, with a passive gain per branch in the city. */
export function updateBrandAwareness(state: GameState): void {
  for (const city of Object.values(state.world.cities)) {
    const n = Object.values(state.branches).filter(
      (b) => b.cityId === city.id && b.status === 'open',
    ).length;
    const b = city.brandAwareness;
    city.brandAwareness = clamp(
      b * (1 - BRAND_DECAY) + BRAND_PASSIVE_PER_BRANCH * n * (1 - b),
      0,
      1,
    );
  }
}
