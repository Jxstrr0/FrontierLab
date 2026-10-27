// A rival lab's finances read from its books (SIMULATION §18.1, §18.5, §19.8):
// an office's mature customers, ARR per customer and weekly costs; ARR and
// customers across its offices; the replacement value of those offices and
// equity = cash + that value; runway in weeks of running costs and the tier it
// puts the lab in; and the fair value per share (ARR × the §19.2 multiple, at
// least book) that M&A reference prices and listed prices build on.
import {
  RIVAL_BOOKS,
  RIVAL_EXPANSION,
  RIVAL_QUALITY_REF,
  RIVAL_RUNWAY_TIERS,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { ACQUIRED_PLAN_MIX } from '../data/mergers';
import { PRODUCTS } from '../data/products';
import type { Tier } from '../data/types';
import { periodsPerYear } from './branch/books';
import { listLevel, nominalIndex } from './nominal';
import { rivalPriceInCity } from './rivalPrices';
import type { GameState, RivalBank, RivalBranch } from './state';
import { rivalMult } from './rivalOffices';
import { multipleFor, quarterlyGrowth } from './valuation';

/**
 * A rival office's mature customers (§18.1): RIVAL_BOOKS.matureCustomers × its
 * size multiplier (C2b) × the city's income index × quality ÷ RIVAL_QUALITY_REF.
 */
export function matureCustomers(office: Pick<RivalBranch, 'cityId' | 'overall' | 'size'>): number {
  const income = CITIES[office.cityId]?.incomeIndex ?? 1;
  return (
    RIVAL_BOOKS.matureCustomers * rivalMult(office) * income * (office.overall / RIVAL_QUALITY_REF)
  );
}

/**
 * ARR one customer pays a rival in a city (§18.1): its plan prices there,
 * weighted by ACQUIRED_PLAN_MIX and billed over the year, plus API and app
 * usage at RIVAL_BOOKS.usagePerCustomer × the nominal index (§4.6).
 */
export function arrPerCustomer(state: GameState, bank: RivalBank, cityId: string): number {
  let plans = 0;
  for (const [pid, share] of Object.entries(ACQUIRED_PLAN_MIX)) {
    const spec = PRODUCTS[pid];
    const price = rivalPriceInCity(state, bank, pid, cityId);
    if (!spec || price === undefined) continue;
    plans += share * price * periodsPerYear(spec);
  }
  return plans + RIVAL_BOOKS.usagePerCustomer * nominalIndex(state, cityId);
}

export interface OfficeCosts {
  /** This week's revenue: ARR ÷ 52. */
  revenue: number;
  compute: number;
  offices: number;
  training: number;
  total: number;
}

/**
 * One office's weekly revenue and costs (§18.5): compute at computeShare of
 * revenue × the compute index, staff and rent at officeCost per unit × the
 * city's cost index × the price list, and training at trainingShare of
 * revenue, each × the strategy's multiplier.
 */
export function officeCosts(state: GameState, bank: RivalBank, office: RivalBranch): OfficeCosts {
  const s = RIVAL_BOOKS.strategy[bank.strategy];
  const revenue = office.arr / WEEKS_PER_YEAR;
  const compute = RIVAL_BOOKS.computeShare * revenue * state.compute.index * s.computeMult;
  const costIndex = (CITIES[office.cityId]?.costIndex ?? 1) * listLevel(state, office.cityId);
  const offices = RIVAL_BOOKS.officeCost * rivalMult(office) * costIndex * s.costMult;
  const training = RIVAL_BOOKS.trainingShare * revenue * s.trainingMult;
  return { revenue, compute, offices, training, total: compute + offices + training };
}

/** A rival's running costs this week across every office. */
export function rivalWeeklyCosts(state: GameState, bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + officeCosts(state, bank, b).total, 0);
}

/** ARR across a rival's offices. */
export function rivalArr(bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + b.arr, 0);
}

/** Customers across a rival's offices. */
export function rivalCustomers(bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + b.customers, 0);
}

/** One office unit's build cost in a city, × cost index × the nominal index (§18.4). */
export function unitBuildCost(state: GameState, cityId: string): number {
  return RIVAL_EXPANSION.buildCost * (CITIES[cityId]?.costIndex ?? 1) * nominalIndex(state, cityId);
}

/** What an office is worth on the lab's books: its replacement cost today (§18.1). */
export function officeBookValue(state: GameState, office: RivalBranch): number {
  return unitBuildCost(state, office.cityId) * rivalMult(office);
}

/** The replacement value of every office a rival holds. */
export function rivalBookAssets(state: GameState, bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + officeBookValue(state, b), 0);
}

/** equity = cash + offices at replacement value; stored so panels and prices can read it. */
export function syncRivalEquity(state: GameState, bank: RivalBank): void {
  bank.equity = bank.cash + rivalBookAssets(state, bank);
}

/** Weeks of running costs the cash covers: Infinity with cash and no costs, 0 without cash. */
export function rivalRunwayWeeks(bank: RivalBank): number {
  if (bank.costs > 0) return bank.cash / bank.costs;
  return bank.cash > 0 ? Infinity : 0;
}

/** The tier a rival's runway puts it in, on the same scale as yours (RIVAL_RUNWAY_TIERS). */
export function rivalTier(bank: RivalBank): Tier {
  const weeks = rivalRunwayWeeks(bank);
  for (const band of RIVAL_RUNWAY_TIERS) if (weeks >= band.minWeeks) return band.tier;
  return 'critical';
}

/** Book value per share (0 when equity is gone). */
export function rivalBookPerShare(bank: RivalBank): number {
  return Math.max(0, bank.equity) / Math.max(1, bank.shares);
}

/** §19.2 revenue growth from a rival's reported quarters (0 before two reports). */
export function rivalGrowth(bank: RivalBank): number {
  return quarterlyGrowth(bank.quarters);
}

/**
 * Fair value per share (§19.2 for rivals, §19.8): max(book per share,
 * ARR × multiple(growth, model lead) ÷ shares). The lead defaults to 0 where
 * the caller has no state (private reference prices, funding rounds).
 */
export function rivalFairPerShare(bank: RivalBank, lead = 0): number {
  const byRevenue =
    (rivalArr(bank) * multipleFor(rivalGrowth(bank), lead)) / Math.max(1, bank.shares);
  return Math.max(rivalBookPerShare(bank), byRevenue);
}
