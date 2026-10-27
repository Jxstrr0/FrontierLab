// The Deal Desk (stage C5b, SIMULATION §11): the businesses on the map ask your
// sales office in their city for proposals. A new RFP (no AI vendor) is bid
// now at a discount off the business's budget and won or lost at once. A
// contract due at the next quarter start shows as a renewal four weeks ahead;
// its offer is settled in the renewal season (contracts.ts). Won contracts
// earn their yearly value weekly and run partly on compute.
import { AWARENESS_FLOOR, DEAL, WEEKS_PER_YEAR } from '../../config/balance';
import { sectorOf } from '../businesses';
import { quarterStartWeek } from '../calendar';
import { pushEvent } from '../events';
import { delegationOn } from '../execSeats';
import { newId } from '../ids';
import { clamp } from '../math';
import { stream, type Rng } from '../rng';
import type { Branch, Business, DeskWeek, GameState, Rfp } from '../state';
import { effectiveAwareness, type CampaignEffects } from './marketing';
import type { BranchWeek } from './week';

const emptyDesk = (week: number): DeskWeek => ({
  week,
  arrived: 0,
  won: 0,
  lost: 0,
  declined: 0,
  expired: 0,
});

/** Counts a Deal Desk outcome in the office's tally for the current week. */
export function recordDesk(
  state: GameState,
  branchId: string,
  what: Exclude<keyof DeskWeek, 'week'>,
): void {
  const branch = state.branches[branchId];
  if (!branch) return;
  if (branch.desk.week !== state.clock.week) branch.desk = emptyDesk(state.clock.week);
  branch.desk[what] += 1;
}

/** This week's Deal Desk outcomes for an office (zeros if nothing happened yet). */
export function deskWeek(state: GameState, branch: Branch): DeskWeek {
  return branch.desk.week === state.clock.week ? branch.desk : emptyDesk(state.clock.week);
}

/** Whether the office takes new enterprise work (the Enterprise contracts product is on). */
export const dealsOffered = (branch: Branch): boolean => branch.offered.sbl?.on === true;

/** The rival office in the city with the best overall rating, if any. */
export function bestRival(
  state: GameState,
  cityId: string,
): { id: string; name: string; stars: number } | undefined {
  let best: { id: string; name: string; stars: number } | undefined;
  for (const r of Object.values(state.rivals).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    if (r.status !== 'active') continue;
    const office = r.branches.find((o) => o.cityId === cityId);
    if (office && (!best || office.overall > best.stars))
      best = { id: r.id, name: r.name, stars: office.overall };
  }
  return best;
}

/** A rival vendor's office rating in the business's city. */
function incumbentStars(state: GameState, b: Business): number | undefined {
  if (b.vendor?.type !== 'rival') return undefined;
  const rival = state.rivals[b.vendor.id];
  if (rival?.status !== 'active') return undefined;
  return rival.branches.find((o) => o.cityId === b.cityId)?.overall;
}

const clampChance = (p: number) => clamp(p, DEAL.winClamp[0], DEAL.winClamp[1]);

/**
 * §11: chance a bid at `discount` wins `b`. Against its rival vendor (a
 * renewal) the incumbent's stars count and Switching cost works against you;
 * otherwise the best rival in the city is the competition.
 */
export function winChance(
  state: GameState,
  branch: Branch,
  b: Business,
  discount: number,
): number {
  const incumbent = incumbentStars(state, b);
  const rival = incumbent ?? bestRival(state, b.cityId)?.stars;
  let p = DEAL.winBase + DEAL.discountSlope * discount;
  p += rival === undefined ? DEAL.noRivalBonus : DEAL.starSlope * (branch.ratings.overall - rival);
  if (incumbent !== undefined) p -= DEAL.switchSlope * (b.pentagon[3] - 5);
  return clampChance(p);
}

/** §11: chance you keep your own contract at renewal, offering `discount` off its budget. */
export function keepChance(
  state: GameState,
  branch: Branch,
  b: Business,
  discount: number,
): number {
  const rival = bestRival(state, b.cityId)?.stars;
  let p = DEAL.keepBase + DEAL.discountSlope * discount + DEAL.switchSlope * (b.pentagon[3] - 5);
  p += rival === undefined ? DEAL.noRivalBonus : DEAL.starSlope * (branch.ratings.overall - rival);
  return clampChance(p);
}

/** The chance an RFP's offer succeeds: keeping your contract, or winning the business. */
export function rfpChance(state: GameState, rfp: Rfp, discount: number): number {
  const b = state.businesses[rfp.businessId];
  const branch = state.branches[rfp.branchId];
  if (!b || !branch) return 0;
  return isOwnRenewal(rfp, b)
    ? keepChance(state, branch, b, discount)
    : winChance(state, branch, b, discount);
}

/** A renewal of a contract your office already holds. */
export const isOwnRenewal = (rfp: Rfp, b: Business): boolean =>
  rfp.kind === 'renewal' && b.vendor?.type === 'player';

/** Yearly contract value at a discount off the budget, to $100. */
export function contractValueAt(b: Business, discount: number): number {
  return Math.round((b.budget * (1 - discount)) / 100) * 100;
}

/** The discount your current contract gives off the budget (0 without one). */
export function currentDiscount(b: Business): number {
  if (!b.contractValue || b.budget <= 0) return 0;
  const d = 1 - b.contractValue / b.budget;
  return clamp(Math.round(d / DEAL.discountStep) * DEAL.discountStep, 0, DEAL.discountMax);
}

/** Clamps a discount to the stepper's range and step. */
export function cleanDiscount(d: number): number {
  return clamp(Math.round(d / DEAL.discountStep) * DEAL.discountStep, 0, DEAL.discountMax);
}

/** Open RFPs by business id, and every business by city: built once per tick. */
export interface DealIndex {
  rfpByBusiness: Map<string, Rfp>;
  byCity: Map<string, Business[]>;
}

export function dealIndex(state: GameState): DealIndex {
  const rfpByBusiness = new Map<string, Rfp>();
  for (const r of Object.values(state.dealDesk.rfps)) rfpByBusiness.set(r.businessId, r);
  const byCity = new Map<string, Business[]>();
  const all = Object.values(state.businesses).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const b of all) {
    const list = byCity.get(b.cityId);
    if (list) list.push(b);
    else byCity.set(b.cityId, [b]);
  }
  return { rfpByBusiness, byCity };
}

/** Signs a contract with your office at `discount`, renewing in U{term} quarters. */
export function signContract(
  state: GameState,
  rng: Rng,
  branch: Branch,
  b: Business,
  discount: number,
  from?: string,
): void {
  b.vendor = { type: 'player', id: branch.id };
  b.contractValue = contractValueAt(b, discount);
  b.startWeek = state.clock.week;
  b.renewalWeek = quarterStartWeek(
    state.meta.startDate,
    state.clock.week,
    rng.int(...sectorOf(b).termQuarters),
  );
  delete b.quietUntil;
  // The AI model's Internal History grows with every contract won (the bank's loan count).
  state.underwriting.loansBooked += 1;
  pushEvent(
    state,
    'CONTRACT_WON',
    {
      branchId: branch.id,
      businessId: b.id,
      business: b.name,
      sector: b.sector,
      value: b.contractValue,
      ...(from ? { from } : {}),
    },
    b.contractValue >= DEAL.bigDeal ? 2 : 3,
    branch.id,
  );
}

/** Bids on a new RFP at `discount`; won or lost at once. Removes the RFP. */
export function bidRfp(state: GameState, rfp: Rfp, discount: number): boolean {
  delete state.dealDesk.rfps[rfp.id];
  const b = state.businesses[rfp.businessId];
  const branch = state.branches[rfp.branchId];
  if (!b || !branch) return false;
  const rng = stream(state, 'dealDesk');
  if (!rng.chance(winChance(state, branch, b, discount))) {
    b.quietUntil = state.clock.week + DEAL.cooldownWeeks;
    recordDesk(state, branch.id, 'lost');
    return false;
  }
  signContract(state, rng, branch, b, discount);
  recordDesk(state, branch.id, 'won');
  return true;
}

/** Declines a new RFP; the business waits a while before asking again. */
export function declineRfp(state: GameState, rfp: Rfp): void {
  delete state.dealDesk.rfps[rfp.id];
  const b = state.businesses[rfp.businessId];
  if (b) b.quietUntil = state.clock.week + DEAL.cooldownWeeks;
  recordDesk(state, rfp.branchId, 'declined');
}

/**
 * A delegated manager's discount (§11): the smallest step within the office's
 * limit that reaches DEAL.delegateTarget, else the limit if that clears
 * DEAL.delegateFloor; undefined when not worth bidding.
 */
export function delegatedDiscount(state: GameState, branch: Branch, rfp: Rfp): number | undefined {
  const steps = Math.round(cleanDiscount(branch.discountLimit) / DEAL.discountStep);
  for (let i = 0; i <= steps; i++) {
    const d = i * DEAL.discountStep;
    if (rfpChance(state, rfp, d) >= DEAL.delegateTarget) return d;
  }
  const limit = steps * DEAL.discountStep;
  return rfpChance(state, rfp, limit) >= DEAL.delegateFloor ? limit : undefined;
}

/** Whether a manager (or the CRO's Deal Desk policy, §17.2) decides this office's RFPs. */
export function deskDelegated(state: GameState, branch: Branch): boolean {
  return (
    (branch.delegation.loans && branch.managerId !== undefined) ||
    delegationOn(state, 'cro', 'loanPolicy')
  );
}

function openRfp(
  state: GameState,
  index: DealIndex,
  branch: Branch,
  b: Business,
  kind: Rfp['kind'],
  dueWeek: number,
): Rfp {
  const rfp: Rfp = {
    id: newId(state, 'rfp'),
    branchId: branch.id,
    businessId: b.id,
    kind,
    createdWeek: state.clock.week,
    dueWeek,
  };
  if (kind === 'renewal' && b.vendor?.type === 'player') rfp.offer = currentDiscount(b);
  state.dealDesk.rfps[rfp.id] = rfp;
  index.rfpByBusiness.set(b.id, rfp);
  recordDesk(state, branch.id, 'arrived');
  return rfp;
}

/** Drops this office's RFPs that expired or no longer match their business. */
function expireRfps(state: GameState, index: DealIndex, branch: Branch): void {
  const week = state.clock.week;
  for (const rfp of Object.values(state.dealDesk.rfps)) {
    if (rfp.branchId !== branch.id) continue;
    const b = state.businesses[rfp.businessId];
    const stale =
      !b ||
      (rfp.kind === 'renewal' && b.renewalWeek !== rfp.dueWeek) ||
      (rfp.kind === 'new' && b.vendor !== undefined);
    if (!stale && !(rfp.kind === 'new' && week >= rfp.dueWeek)) continue;
    delete state.dealDesk.rfps[rfp.id];
    index.rfpByBusiness.delete(rfp.businessId);
    if (b && !stale) {
      b.quietUntil = week + DEAL.cooldownWeeks;
      recordDesk(state, branch.id, 'expired');
    }
  }
}

/**
 * Tick step 4.7 for one open office: expire RFPs, take new ones and the
 * renewals due, let a delegated manager decide, then earn this week's share of
 * every contract the office holds.
 */
export function runDealDesk(
  state: GameState,
  branch: Branch,
  fx: CampaignEffects,
  wk: BranchWeek,
  index: DealIndex,
): void {
  const rng = stream(state, 'dealDesk');
  const week = state.clock.week;
  expireRfps(state, index, branch);
  const here = index.byCity.get(branch.cityId) ?? [];
  const offered = dealsOffered(branch);
  const reach = AWARENESS_FLOOR + (1 - AWARENESS_FLOOR) * effectiveAwareness(state, branch);
  for (const b of here) {
    if (index.rfpByBusiness.has(b.id)) continue;
    if (b.vendor && b.renewalWeek !== undefined) {
      const due = b.renewalWeek - week <= DEAL.renewalNoticeWeeks && b.renewalWeek > week;
      const mine = b.vendor.type === 'player' && b.vendor.id === branch.id;
      if (due && (mine || (b.vendor.type === 'rival' && offered)))
        openRfp(state, index, branch, b, 'renewal', b.renewalWeek);
      continue;
    }
    if (b.vendor || !offered || (b.quietUntil ?? 0) > week) continue;
    const odds =
      DEAL.rfpWeekly * reach * (1 + DEAL.readinessSlope * (b.pentagon[0] - 5)) * fx.loanDesk;
    if (rng.chance(Math.max(0, odds)))
      openRfp(state, index, branch, b, 'new', week + DEAL.expiryWeeks);
  }

  if (deskDelegated(state, branch)) {
    for (const rfp of Object.values(state.dealDesk.rfps)) {
      if (rfp.branchId !== branch.id) continue;
      if (rfp.kind === 'renewal') {
        // A manager sets each renewal offer once, the week it comes due.
        if (rfp.createdWeek !== week) continue;
        const d = delegatedDiscount(state, branch, rfp);
        if (d !== undefined) rfp.offer = d;
        continue;
      }
      const d = delegatedDiscount(state, branch, rfp);
      index.rfpByBusiness.delete(rfp.businessId);
      if (d === undefined) declineRfp(state, rfp);
      else bidRfp(state, rfp, d);
    }
  }

  for (const b of here) {
    if (b.vendor?.type !== 'player' || b.vendor.id !== branch.id || !b.contractValue) continue;
    const weekly = b.contractValue / WEEKS_PER_YEAR;
    wk.loanInterest += weekly;
    wk.compute += weekly * DEAL.computeShare;
    wk.servicing += weekly * DEAL.serviceShare;
  }
}

/** Contracts an office holds, largest first. */
export function contractsOf(state: GameState, branchId: string): Business[] {
  return Object.values(state.businesses)
    .filter((b) => b.vendor?.type === 'player' && b.vendor.id === branchId)
    .sort((a, b) => (b.contractValue ?? 0) - (a.contractValue ?? 0) || (a.id < b.id ? -1 : 1));
}
