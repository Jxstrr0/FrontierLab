// Non-bank listed companies (SIMULATION §19.1): the weekly shared market shock,
// each company's return, price history and 52-week range; quarterly earnings
// with a surprise and a sector-phase tilt; and quarterly dividends at the
// stated yield, paid to your company (P&L dividend income, cash) and to you
// (personal cash). Randomness from the `market` stream.
import {
  EQUITY_MARKET_DRIFT,
  QUARTERS_PER_YEAR,
  STOCK_MARKET,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { SECTOR_MU } from '../data/stocks';
import type { Phase } from '../data/types';
import { pushEvent } from './events';
import { earn } from './ledger';
import type { Rng } from './rng';
import type { GameState, ListedCompany } from './state';

/** Appends a weekly close, trims to the history window and refreshes the 52-week range. */
export function recordClose(
  item: { history: number[]; high52: number; low52: number },
  price: number,
): void {
  item.history.push(price);
  if (item.history.length > STOCK_MARKET.historyWeeks)
    item.history.splice(0, item.history.length - STOCK_MARKET.historyWeeks);
  const window = item.history.slice(-STOCK_MARKET.rangeWeeks);
  item.high52 = Math.max(...window);
  item.low52 = Math.min(...window);
}

/** §19.1: marketShock ~ normal(equityMarketDrift/52, 0.018). */
export function drawMarketShock(rng: Rng, phase: Phase): number {
  return rng.normal(EQUITY_MARKET_DRIFT[phase] / WEEKS_PER_YEAR, STOCK_MARKET.shockSigma);
}

/** §19.1: r = μ_sector(phase)/52 + β × marketShock + σ/√52 × z. */
export function companyReturn(c: ListedCompany, phase: Phase, shock: number, z: number): number {
  return (
    SECTOR_MU[c.sector][phase] / WEEKS_PER_YEAR +
    c.beta * shock +
    (c.vol / Math.sqrt(WEEKS_PER_YEAR)) * z
  );
}

/** Companies in a fixed order, so draws never depend on object key order. */
export function sortedCompanies(state: GameState): ListedCompany[] {
  return Object.values(state.market.companies).sort((a, b) => (a.id < b.id ? -1 : 1));
}

/** Weekly: every listed company moves with the market shock and its own noise. */
export function moveCompanies(state: GameState, rng: Rng, phase: Phase, shock: number): void {
  for (const c of sortedCompanies(state)) {
    const r = companyReturn(c, phase, shock, rng.normal(0, 1));
    c.price = Math.max(STOCK_MARKET.priceFloor, c.price * (1 + r));
    recordClose(c, c.price);
  }
}

/** §19.1 earnings tilt: a tenth of the sector's annual μ for the phase. */
export function earningsTilt(c: ListedCompany, phase: Phase): number {
  return STOCK_MARKET.earningsTilt * SECTOR_MU[c.sector][phase];
}

/**
 * Quarter-end: each company reports. The surprise (normal plus the phase tilt)
 * moves the price, and EPS grows by a quarter of its growth rate plus the
 * surprise. Every report is logged; the paper only runs notable ones.
 */
export function reportEarnings(state: GameState, rng: Rng, phase: Phase, quarter: string): void {
  for (const c of sortedCompanies(state)) {
    const surprise = rng.normal(0, STOCK_MARKET.earningsSurprise) + earningsTilt(c, phase);
    c.price = Math.max(STOCK_MARKET.priceFloor, c.price * (1 + surprise));
    c.history[c.history.length - 1] = c.price;
    c.high52 = Math.max(c.high52, c.price);
    c.low52 = Math.min(c.low52, c.price);
    c.eps *= Math.max(0, 1 + c.growth / QUARTERS_PER_YEAR + surprise);
    pushEvent(
      state,
      'COMPANY_EARNINGS',
      {
        companyId: c.id,
        company: c.name,
        ticker: c.ticker,
        eps: c.eps,
        surprisePct: surprise * 100,
        quarter,
      },
      Math.abs(surprise) >= STOCK_MARKET.notableSurprise ? 2 : 0,
    );
  }
}

/** Pays a dividend per share on a security to the company and personal holders. */
export function payHolders(state: GameState, id: string, dps: number): void {
  if (dps <= 0) return;
  const co = state.market.holdings.company[id];
  if (co && co.shares > 0) earn(state, 'dividendIncome', co.shares * dps);
  const me = state.market.holdings.personal[id];
  if (me && me.shares > 0) state.personal.cash += me.shares * dps;
}

/** Quarter-end: each company pays a quarter of its yield on the current price. */
export function payCompanyDividends(state: GameState): void {
  for (const c of sortedCompanies(state)) {
    payHolders(state, c.id, (c.price * c.divYield) / QUARTERS_PER_YEAR);
  }
}

/** The index's move over the last week, as a decimal. */
export function indexWeeklyMove(state: GameState): number {
  const h = state.market.indexHistory;
  return h.length >= 2 ? h[h.length - 1]! / h[h.length - 2]! - 1 : 0;
}

/** Price ÷ trailing EPS, or undefined when earnings are nil or negative. */
export function priceEarnings(price: number, eps: number): number | undefined {
  return eps > 0 ? price / eps : undefined;
}
