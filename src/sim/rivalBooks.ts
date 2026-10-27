// Rival office books and weekly financials (SIMULATION §18.1, §18.5). Each
// office's customers move toward its mature size, trimmed by local competition
// (crowding and your strong offices nearby), the ramp of a young office and the
// business cycle (a downturn shrinks the customer pool); its ARR is customers ×
// what each pays. Weekly earnings are ARR ÷ 52 less compute, offices and
// training; the lab banks the after-tax result as cash and its equity follows.
import {
  DISTANCE_FALLOFF,
  RIVAL_BOOKS,
  RIVAL_COMPETITION,
  RIVAL_RADIUS,
  RIVAL_RAMP_WEEKS,
  RIVAL_REVIEWS_PER_WEEK,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import type { Strategy } from '../data/rivals';
import { tileDistance } from './citygen';
import { creditCycle } from './macro';
import { clamp } from './math';
import { countryOfCity } from './rates';
import {
  arrPerCustomer,
  matureCustomers,
  officeCosts,
  rivalWeeklyCosts,
  syncRivalEquity,
} from './rivalFinance';
import { rivalOverall } from './rivalMarketing';
import { rivalMult } from './rivalOffices';
import { sizeMult } from './branch/officeSize';
import type { CountryState, GameState, Lot, RivalBank, RivalBranch } from './state';

/** Distance weight from the share formula: w = 1 / (1 + d / 6) (§9.3). */
const weight = (d: number) => 1 / (1 + d / DISTANCE_FALLOFF);

/**
 * Competition factor on a rival office's target (assumption, DESIGN §7):
 * crowding by every other office within RIVAL_RADIUS, weighted by its size
 * (C2b), plus pressure from your open offices in the city that win a strong
 * share of prospects. AI customers shop city-wide (one office per city, C2a),
 * so your share presses on every rival office in the city, not just the
 * nearby ones (2026-10-27).
 */
export function competitionFactor(state: GameState, branch: RivalBranch): number {
  const lot = state.world.lots[branch.lotId];
  if (!lot) return 1;
  const c = RIVAL_COMPETITION;
  let crowd = 0;
  for (const rival of Object.values(state.rivals)) {
    if (rival.status !== 'active') continue;
    for (const rb of rival.branches) {
      if (rb.id === branch.id || rb.cityId !== branch.cityId) continue;
      crowd += rivalMult(rb) * nearWeight(lot, state.world.lots[rb.lotId]);
    }
  }
  let pressure = 0;
  for (const own of Object.values(state.branches)) {
    if (own.status !== 'open' || own.cityId !== branch.cityId) continue;
    crowd += sizeMult(own) * nearWeight(lot, state.world.lots[own.lotId]);
    pressure += Math.max(0, own.last.share - c.playerShareRef);
  }
  const crowding = 1 / (1 + c.crowdK * Math.max(0, crowd - c.crowdFree));
  return clamp(crowding - c.playerK * pressure, c.min, 1);
}

function nearWeight(a: Lot, b: Lot | undefined): number {
  if (!b) return 0;
  const d = tileDistance(a, b);
  return d <= RIVAL_RADIUS ? weight(d) : 0;
}

/**
 * Share of mature size a branch opened after the start has reached: a concave
 * ramp, 1 − (1 − age/156)^3, so it grows fastest early like yours (§25: about
 * 70% by week 52) and is mature at 156 weeks (§18.1).
 */
export function rampShare(age: number): number {
  const left = 1 - Math.min(1, Math.max(0, age) / RIVAL_RAMP_WEEKS);
  return 1 - left * left * left;
}

/**
 * §18.1: a downturn shrinks the customer pool: max(min, 1 − sens × cycleMult ×
 * (creditCycle − 1)), so the credit cycle (§4.5) still reaches every lab, and
 * thin-margin disruptors feel it most.
 */
export function downturnFactor(c: CountryState, strategy: Strategy): number {
  const cycle = RIVAL_BOOKS.cycle;
  const sens = cycle.sens * RIVAL_BOOKS.strategy[strategy].cycleMult;
  return Math.max(cycle.min, 1 - sens * (creditCycle(c) - 1));
}

/** The customers an office is heading for this week (§18.1). */
export function customerTarget(state: GameState, bank: RivalBank, branch: RivalBranch): number {
  const c = countryOfCity(state, branch.cityId);
  const age = state.clock.week - branch.openedWeek;
  const ramp = branch.openedWeek > 0 ? rampShare(age) : 1;
  // A running campaign (§18.9) lifts the rating its customers mature toward.
  const rated = { cityId: branch.cityId, size: branch.size, overall: rivalOverall(bank, branch) };
  return (
    matureCustomers(rated) *
    competitionFactor(state, branch) *
    ramp *
    downturnFactor(c, bank.strategy)
  );
}

/**
 * Customers move RIVAL_BOOKS.ema of the gap to their target; ARR follows
 * (§18.1). A downturn also cuts what each customer pays at once (downgrades
 * and less usage), so a recession reaches revenue before the customer count
 * has drifted down.
 */
export function updateOfficeBooks(state: GameState, bank: RivalBank, branch: RivalBranch): void {
  const target = customerTarget(state, bank, branch);
  branch.customers += RIVAL_BOOKS.ema * (target - branch.customers);
  const c = countryOfCity(state, branch.cityId);
  branch.arr =
    branch.customers *
    arrPerCustomer(state, bank, branch.cityId) *
    downturnFactor(c, bank.strategy);
  branch.reviewCount += RIVAL_REVIEWS_PER_WEEK;
}

export interface OfficeEarnings {
  revenue: number;
  costs: number;
  contribution: number;
}

/** One office's week: ARR ÷ 52 − compute − offices − training (§18.5). */
export function officeEarnings(
  state: GameState,
  bank: RivalBank,
  branch: RivalBranch,
): OfficeEarnings {
  const c = officeCosts(state, bank, branch);
  return { revenue: c.revenue, costs: c.total, contribution: c.revenue - c.total };
}

/** Weekly books and financials for every active rival (tick step 3). */
export function runRivalFinancials(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'active') continue;
    let revenue = 0;
    let costs = 0;
    let preTax = 0;
    for (const branch of bank.branches) {
      updateOfficeBooks(state, bank, branch);
      const e = officeEarnings(state, bank, branch);
      branch.contribution = e.contribution;
      revenue += e.revenue;
      costs += e.costs;
      preTax += e.contribution;
    }
    const home = bank.cities[0];
    const taxRate = home ? COUNTRIES[countryOfCity(state, home).id].corpTax : 0;
    const netIncome = preTax > 0 ? preTax * (1 - taxRate) : preTax;
    bank.qtd.revenue += revenue;
    bank.qtd.netIncome += netIncome;
    bank.cash += netIncome;
    bank.costs = costs;
    syncRivalEquity(state, bank);
  }
}

/** Sets a rival's running costs and equity from its books now (seeding, migration, mergers). */
export function refreshRivalFinances(state: GameState, bank: RivalBank): void {
  bank.costs = rivalWeeklyCosts(state, bank);
  syncRivalEquity(state, bank);
}
