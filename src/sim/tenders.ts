// Public-sector tenders (SIMULATION §11.7, owner's review A4). Each quarter a
// city with your sales office may post a tender from one of its public bodies:
// a big yearly budget over a three-to-five-year term. Bids are sealed and the
// award is made a few weeks later. Public bodies only deal with a lab the AI
// regulator rates Adequate or better, judge bids mostly on the AI model's
// Safety axis, and cancel the contract if the rating falls to Restricted.
import { DEAL, TENDER, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { PUBLIC_BODIES } from '../data/publicBodies';
import { bestRival, cleanDiscount, dealsOffered, deskDelegated } from './branch/dealDesk';
import type { BranchWeek } from './branch/week';
import { pushEvent } from './events';
import { newId } from './ids';
import { clamp } from './math';
import { nominalIndex } from './nominal';
import { stream } from './rng';
import { isPaused } from './safety';
import type { Branch, GameState, Tender } from './state';
import { activeModel, inferenceMult, modelQuality, qualityBar, RADAR } from './underwriting';

/** Whether public bodies deal with the lab at its current safety tier. */
export const tenderEligible = (state: GameState): boolean =>
  TENDER.tiers.includes(state.company.tier);

/** Every tender, open or held, oldest first. */
export function allTenders(state: GameState): Tender[] {
  return Object.values(state.dealDesk.tenders).sort(
    (a, b) => a.openWeek - b.openWeek || (a.id < b.id ? -1 : 1),
  );
}

/** Tenders an office is bidding for or holds. */
export const officeTenders = (state: GameState, branchId: string): Tender[] =>
  allTenders(state).filter((t) => t.branchId === branchId);

/** Yearly value at a discount off the tender's budget, to $100. */
export const tenderValueAt = (t: Tender, discount: number): number =>
  Math.round((t.budget * (1 - discount)) / 100) * 100;

/**
 * §11.7: chance a sealed bid at `discount` wins. The model's Safety axis
 * carries the most weight, then the regulator's tier and the model's quality.
 */
export function tenderChance(state: GameState, discount: number): number {
  if (!tenderEligible(state)) return 0;
  const m = activeModel(state);
  const p =
    TENDER.winBase +
    TENDER.safetySlope * (m.radar[RADAR.safety] - 5) +
    TENDER.qualitySlope * (modelQuality(m) - qualityBar(state)) +
    (TENDER.tierEdge[state.company.tier] ?? 0) +
    TENDER.discountSlope * discount;
  return clamp(p, TENDER.winClamp[0], TENDER.winClamp[1]);
}

/** A delegated desk's sealed bid: the smallest step within the limit that reaches DEAL.delegateTarget. */
function delegatedBid(state: GameState, branch: Branch): number | undefined {
  const steps = Math.round(cleanDiscount(branch.discountLimit) / DEAL.discountStep);
  for (let i = 0; i <= steps; i++) {
    const d = i * DEAL.discountStep;
    if (tenderChance(state, d) >= DEAL.delegateTarget) return d;
  }
  const limit = steps * DEAL.discountStep;
  return tenderChance(state, limit) >= DEAL.delegateFloor ? limit : undefined;
}

const payload = (t: Tender) => ({ tenderId: t.id, name: t.name, city: t.cityId });

/** Settles the award on a tender whose bids close this week. */
function award(state: GameState, t: Tender): void {
  const branch = state.branches[t.branchId];
  if (t.bid === undefined && branch && deskDelegated(state, branch))
    t.bid = delegatedBid(state, branch);
  const bid = t.bid;
  if (bid === undefined || !branch || branch.status === 'closed' || !tenderEligible(state)) {
    delete state.dealDesk.tenders[t.id];
    if (bid !== undefined) pushEvent(state, 'TENDER_LOST', { ...payload(t), reason: 'tier' }, 3);
    return;
  }
  if (!stream(state, 'tenders').chance(tenderChance(state, bid))) {
    delete state.dealDesk.tenders[t.id];
    const rival = bestRival(state, t.cityId)?.name;
    pushEvent(
      state,
      'TENDER_LOST',
      { ...payload(t), reason: 'bid', ...(rival ? { rival } : {}) },
      3,
    );
    return;
  }
  t.status = 'active';
  t.value = tenderValueAt(t, bid);
  t.endWeek = state.clock.week + t.termWeeks;
  delete t.bid;
  const years = Math.round(t.termWeeks / WEEKS_PER_YEAR);
  pushEvent(state, 'TENDER_WON', { ...payload(t), value: t.value, years }, 2, t.branchId);
}

/**
 * Weekly, before the offices run: awards tenders whose bids close, ends those
 * whose term is up, and cancels every one when the tier falls to Restricted or
 * the office that holds it closes.
 */
export function runTenders(state: GameState): void {
  const week = state.clock.week;
  const cancel = TENDER.cancelTiers.includes(state.company.tier);
  for (const t of allTenders(state)) {
    if (t.status === 'open') {
      if (week >= t.closeWeek) award(state, t);
      continue;
    }
    const office = state.branches[t.branchId];
    const reason = cancel ? 'tier' : !office || office.status === 'closed' ? 'office' : null;
    if (reason) {
      delete state.dealDesk.tenders[t.id];
      pushEvent(state, 'TENDER_CANCELLED', { ...payload(t), value: t.value ?? 0, reason }, 2);
    } else if (week >= (t.endWeek ?? week)) {
      delete state.dealDesk.tenders[t.id];
      pushEvent(state, 'TENDER_ENDED', { ...payload(t), value: t.value ?? 0 }, 3);
    }
  }
}

/** Quarter start (tick step 13): each city with your office may post a tender. */
export function tendersQuarter(state: GameState): void {
  if (state.clock.week < TENDER.firstWeek || !tenderEligible(state) || isPaused(state)) return;
  const busy = new Set(allTenders(state).map((t) => t.cityId));
  const offices = Object.values(state.branches)
    .filter((b) => b.status === 'open' && dealsOffered(b))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const rng = stream(state, 'tenders');
  for (const branch of offices) {
    if (busy.has(branch.cityId) || !rng.chance(TENDER.quarterlyChance)) continue;
    busy.add(branch.cityId);
    const body = rng.pick(PUBLIC_BODIES);
    const size = TENDER.citySize[CITIES[branch.cityId]?.size ?? 'M'] ?? 1;
    const base = rng.range(...TENDER.budget) * body.budgetMult * size;
    const budget = Math.round((base * nominalIndex(state, branch.cityId)) / 10_000) * 10_000;
    const t: Tender = {
      id: newId(state, 'tender'),
      name: `${CITIES[branch.cityId]?.name ?? 'City'} ${body.title}`,
      bodyId: body.id,
      cityId: branch.cityId,
      branchId: branch.id,
      budget,
      termWeeks: rng.int(...TENDER.termYears) * WEEKS_PER_YEAR,
      status: 'open',
      openWeek: state.clock.week,
      closeWeek: state.clock.week + TENDER.bidWeeks,
    };
    state.dealDesk.tenders[t.id] = t;
    pushEvent(
      state,
      'TENDER_OPENED',
      { ...payload(t), budget, weeks: TENDER.bidWeeks },
      2,
      branch.id,
    );
  }
}

/** Yearly value of the tenders an office holds (ARR). */
export function officeTenderArr(state: GameState, branchId: string): number {
  let total = 0;
  for (const t of Object.values(state.dealDesk.tenders))
    if (t.status === 'active' && t.branchId === branchId) total += t.value ?? 0;
  return total;
}

/** Tick step 4.7: an office earns this week's share of its tenders, like its contracts (§11.5). */
export function earnTenders(state: GameState, branch: Branch, wk: BranchWeek): void {
  const weekly = officeTenderArr(state, branch.id) / WEEKS_PER_YEAR;
  if (weekly <= 0) return;
  wk.loanInterest += weekly;
  wk.compute += weekly * DEAL.computeShare * inferenceMult(state);
  wk.servicing += weekly * DEAL.serviceShare;
}
