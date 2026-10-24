// What the company or the founder owns outside banking (SIMULATION §14.4,
// §20.6, §21): listed stocks, venture stakes at the latest round price, venture
// debt balances and buildings at value. The balance sheet, capital (RWA) and the
// Investment floor donut all read these, so the portfolio always ties out. Also
// the mark rule for ventures and buildings: revaluations run inside
// `withAssetMarks`, which posts the change to P&L in the same step.
import { fxValue } from './fx';
import { postPnl } from './ledger';
import { holdingsValue, securityPrice } from './securities';
import type { GameState, Property, Startup } from './state';

// Saves upgrading through older migrations call the balance sheet before the
// 7 → 8 step adds these records, so read them defensively.
const startupsOf = (state: GameState): Startup[] => Object.values(state.ventures?.startups ?? {});
const propertiesOf = (state: GameState): Property[] =>
  Object.values(state.realEstate?.properties ?? {});

export type Account = 'company' | 'personal';

/** Price per share a startup stake is marked at (§20.6): last round, market once public, 0 once failed. */
export function startupMark(state: GameState, s: Startup): number {
  if (s.stage === 'failed' || s.stage === 'acquired') return 0;
  if (s.stage === 'public' && s.listedCompanyId) return securityPrice(state, s.listedCompanyId);
  return s.lastPrice;
}

/** Shares of a startup held by the company or the founder. */
export function startupShares(s: Startup, account: Account): number {
  return s.holders.find((h) => h.id === account)?.shares ?? 0;
}

/**
 * Venture stakes at their marks. Public startups move into market holdings when
 * they list, so only private stages count here.
 */
export function venturesValue(state: GameState, account: Account): number {
  let total = 0;
  for (const s of startupsOf(state)) {
    if (s.stage === 'public') continue;
    total += startupShares(s, account) * startupMark(state, s);
  }
  return total;
}

/** Outstanding venture debt the company or the founder has lent. */
export function ventureDebtValue(state: GameState, account: Account): number {
  let total = 0;
  for (const s of startupsOf(state)) {
    const d = s.ventureDebt;
    if (d && d.lender === account) total += d.balance;
  }
  return total;
}

/** Owned buildings at their estimated value. */
export function realEstateValue(state: GameState, account: Account): number {
  let total = 0;
  for (const p of propertiesOf(state)) {
    if (p.owner === account) total += p.value;
  }
  return total;
}

export interface PortfolioBreakdown {
  stocks: number;
  ventures: number;
  realEstate: number;
  ventureDebt: number;
  /** Currency positions at today's rates (§19.10). */
  currencies: number;
  total: number;
}

/** The Investment floor donut (SCREENS §10): Stocks, Ventures, Real estate, Venture debt, Currencies. */
export function portfolioBreakdown(state: GameState, account: Account): PortfolioBreakdown {
  const stocks = holdingsValue(state, account);
  const ventures = venturesValue(state, account);
  const realEstate = realEstateValue(state, account);
  const ventureDebt = ventureDebtValue(state, account);
  const currencies = fxValue(state, account);
  return {
    stocks,
    ventures,
    realEstate,
    ventureDebt,
    currencies,
    total: stocks + ventures + realEstate + ventureDebt + currencies,
  };
}

/**
 * Runs `change` (which revalues ventures or buildings: a new round price, a
 * failure, a cre move) and posts the change in the company's marked value:
 * ventures to `investmentGains`, buildings to `propertyGains`. Never wrap
 * purchases or sales in it; those move cash instead.
 */
export function withAssetMarks(state: GameState, change: () => void): void {
  const ventures = venturesValue(state, 'company');
  const buildings = realEstateValue(state, 'company');
  change();
  const dv = venturesValue(state, 'company') - ventures;
  const db = realEstateValue(state, 'company') - buildings;
  if (dv !== 0) postPnl(state, 'investmentGains', dv);
  if (db !== 0) postPnl(state, 'propertyGains', db);
}
