// Business contracts over time (stage C5b, SIMULATION §11.2): the quarterly
// renewal season (owner decision A7) settles every contract due, using the
// offers set on the Deal Desk; rival labs sign businesses that have no vendor;
// and each week a contract can end mid-term only when its business fails (more
// often in a downturn) or walks during a compute outage.
import { DEAL, WEEKS_PER_YEAR } from '../config/balance';
import {
  bestRival,
  contractValueAt,
  currentDiscount,
  keepChance,
  recordDesk,
  signContract,
  winChance,
} from './branch/dealDesk';
import { replaceBusiness, rivalsIn, sectorOf, signRival } from './businesses';
import { quarterStartWeek } from './calendar';
import { dexp } from './detmath';
import { pushEvent } from './events';
import { creditCycle } from './macro';
import { countryOfCity } from './rates';
import { stream, type Rng } from './rng';
import type { Business, GameState, Rfp } from './state';

export type LossReason = 'renewal' | 'outage' | 'failed' | 'office';

const byId = (a: Business, b: Business) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function sortedBusinesses(state: GameState): Business[] {
  return Object.values(state.businesses).sort(byId);
}

/** The open RFP on a business, if any. */
function rfpFor(state: GameState, businessId: string): Rfp | undefined {
  return Object.values(state.dealDesk.rfps).find((r) => r.businessId === businessId);
}

function dropRfps(state: GameState, businessId: string): void {
  for (const r of Object.values(state.dealDesk.rfps))
    if (r.businessId === businessId) delete state.dealDesk.rfps[r.id];
}

/**
 * Your contract with `b` ends. Unless the business failed, it moves to the
 * best rival lab in the city when there is one; otherwise it goes without.
 */
export function loseContract(state: GameState, rng: Rng, b: Business, reason: LossReason): void {
  if (b.vendor?.type !== 'player') return;
  const branchId = b.vendor.id;
  const value = b.contractValue ?? 0;
  const rival = reason === 'failed' ? undefined : bestRival(state, b.cityId);
  if (rival) signRival(state, rng, b, rival.id, sectorOf(b).termQuarters);
  else {
    delete b.vendor;
    delete b.contractValue;
    delete b.renewalWeek;
    delete b.startWeek;
  }
  dropRfps(state, b.id);
  pushEvent(
    state,
    'CONTRACT_LOST',
    {
      branchId,
      businessId: b.id,
      business: b.name,
      sector: b.sector,
      value,
      reason,
      ...(rival ? { to: rival.name } : {}),
    },
    value >= DEAL.bigDeal ? 2 : 3,
    branchId,
  );
}

/** Ends every contract an office holds (it closed). */
export function endOfficeContracts(state: GameState, branchId: string): void {
  const rng = stream(state, 'contracts');
  for (const b of sortedBusinesses(state))
    if (b.vendor?.type === 'player' && b.vendor.id === branchId)
      loseContract(state, rng, b, 'office');
  for (const r of Object.values(state.dealDesk.rfps))
    if (r.branchId === branchId) delete state.dealDesk.rfps[r.id];
}

/** Moves an office's contracts and RFPs to another office in the same city (offices folding, C2b). */
export function moveOfficeContracts(state: GameState, fromId: string, toId: string): void {
  for (const b of Object.values(state.businesses))
    if (b.vendor?.type === 'player' && b.vendor.id === fromId) b.vendor = { type: 'player', id: toId };
  for (const r of Object.values(state.dealDesk.rfps)) if (r.branchId === fromId) r.branchId = toId;
}

/** A rival vendor bought by another rival hands its contracts to the buyer. */
function followMerger(state: GameState, b: Business): void {
  if (b.vendor?.type !== 'rival') return;
  const rival = state.rivals[b.vendor.id];
  if (rival?.status === 'merged' && rival.mergedInto && state.rivals[rival.mergedInto])
    b.vendor = { type: 'rival', id: rival.mergedInto };
}

function rivalPresent(state: GameState, b: Business): boolean {
  if (b.vendor?.type !== 'rival') return false;
  const rival = state.rivals[b.vendor.id];
  return rival?.status === 'active' && rival.branches.some((r) => r.cityId === b.cityId);
}

/** Settles one of your contracts that has come due. */
function settleOwn(state: GameState, rng: Rng, b: Business, rfp: Rfp | undefined): void {
  const branch = state.branches[b.vendor!.id];
  if (!branch || branch.status !== 'open') return loseContract(state, rng, b, 'office');
  const d = rfp?.offer ?? currentDiscount(b);
  if (!rng.chance(keepChance(state, branch, b, d))) {
    recordDesk(state, branch.id, 'lost');
    return loseContract(state, rng, b, 'renewal');
  }
  recordDesk(state, branch.id, 'won');
  b.contractValue = contractValueAt(b, d);
  b.renewalWeek = quarterStartWeek(
    state.meta.startDate,
    state.clock.week,
    rng.int(...sectorOf(b).termQuarters),
  );
}

/** Settles a rival's contract that has come due, with your bid when you made one. */
function settleRival(state: GameState, rng: Rng, b: Business, rfp: Rfp | undefined): void {
  followMerger(state, b);
  const branch = rfp ? state.branches[rfp.branchId] : undefined;
  const bid = branch?.status === 'open' && rfp?.offer !== undefined ? rfp.offer : undefined;
  if (!rivalPresent(state, b)) {
    delete b.vendor;
    delete b.contractValue;
    delete b.renewalWeek;
  }
  if (branch && bid !== undefined) {
    const from = b.vendor ? state.rivals[b.vendor.id]?.name : undefined;
    if (rng.chance(winChance(state, branch, b, bid))) {
      recordDesk(state, branch.id, 'won');
      return signContract(state, rng, branch, b, bid, from);
    }
    recordDesk(state, branch.id, 'lost');
  }
  if (b.vendor)
    b.renewalWeek = quarterStartWeek(state.meta.startDate, state.clock.week, sectorOf(b).termQuarters[0]);
}

/**
 * Tick step 13, a quarter start (A7): settle every contract due, then rival
 * labs sign some of the businesses that have no vendor.
 */
export function renewalSeason(state: GameState): void {
  const rng = stream(state, 'contracts');
  const week = state.clock.week;
  for (const b of sortedBusinesses(state)) {
    if (!b.vendor || b.renewalWeek === undefined || b.renewalWeek > week) continue;
    const rfp = rfpFor(state, b.id);
    if (rfp?.kind === 'renewal') delete state.dealDesk.rfps[rfp.id];
    if (b.vendor.type === 'player') settleOwn(state, rng, b, rfp);
    else settleRival(state, rng, b, rfp);
  }
  for (const b of sortedBusinesses(state)) {
    if (b.vendor || rfpFor(state, b.id)) continue;
    const rivals = rivalsIn(state, b.cityId);
    if (rivals.length === 0 || !rng.chance(DEAL.rivalSignQuarterly)) continue;
    signRival(state, rng, b, rng.pickWeighted(rivals), sectorOf(b).termQuarters);
  }
}

/**
 * Tick step 4 (after the offices): a storefront business under contract fails
 * at failYear × exp(−failSlope × (Financial health − 5)) × credit cycle a year,
 * and a new one moves in; during an outage your contracts may walk.
 */
export function runContracts(state: GameState): void {
  const rng = stream(state, 'contracts');
  const outage = state.compute.outageWeeksLeft > 0;
  for (const b of sortedBusinesses(state)) {
    if (!b.vendor) continue;
    if (b.size !== 'anchor') {
      const cycle = creditCycle(countryOfCity(state, b.cityId));
      const p = (DEAL.failYear * dexp(-DEAL.failSlope * (b.pentagon[4] - 5)) * cycle) / WEEKS_PER_YEAR;
      if (rng.chance(p)) {
        loseContract(state, rng, b, 'failed');
        dropRfps(state, b.id);
        replaceBusiness(state, stream(state, `businesses:${b.cityId}`), b);
        continue;
      }
    }
    if (outage && b.vendor.type === 'player') {
      const p = DEAL.outageLossWeekly * (1 + DEAL.sensitivitySlope * (b.pentagon[2] - 5));
      if (rng.chance(p)) loseContract(state, rng, b, 'outage');
    }
  }
}

/** Yearly value of every contract an office holds (ARR, C5b). */
export function officeContractArr(state: GameState, branchId: string): number {
  let total = 0;
  for (const b of Object.values(state.businesses))
    if (b.vendor?.type === 'player' && b.vendor.id === branchId) total += b.contractValue ?? 0;
  return total;
}

