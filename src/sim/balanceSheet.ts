// The company balance sheet (SIMULATION §14.4), computed from state on demand.
// Equity is assets minus liabilities; `expectedEquity` rolls paid-in capital,
// retained earnings and AOCI forward, and the two must agree (balance identity).
import { summarize } from './ledger';
import { franchiseValue, realEstateValue, ventureDebtValue, venturesValue } from './portfolio';
import { holdingsValue } from './securities';
import type { GameState } from './state';

export interface BalanceSheet {
  cash: number;
  fixedAssets: number;
  leaseDeposits: number;
  /** Unamortized partnership signing fees (deducted from CET1, §15). */
  intangibles: number;
  /** Stocks the company holds, at market (§19.7). */
  investments: number;
  /** Venture stakes at the latest round price (§20.6). */
  ventures: number;
  /** Venture debt the company has lent (§20.5). */
  ventureDebt: number;
  /** Company-owned buildings at estimated value (§21.2). */
  realEstate: number;
  /** A sports club the company owns, at value (Stage 9). */
  franchise: number;
  /** Goodwill from acquisitions (§19.8, deducted from CET1). */
  goodwill: number;
  assets: number;
  /** Venture debt and drawn credit lines from investment banks (§19.9). */
  corporateDebt: number;
  /** Dividends declared but not yet paid (§14.4). */
  dividendsPayable: number;
  taxPayable: number;
  liabilities: number;
  equity: number;
  expectedEquity: number;
}

/** Book value of a fixed asset: straight-line over its life. */
export function assetBookValue(a: { cost: number; lifeWeeks: number; ageWeeks: number }): number {
  return a.cost * Math.max(0, 1 - a.ageWeeks / a.lifeWeeks);
}

/** Unamortized partnership and power-deal signing fees. */
export function intangibleAssets(state: GameState): number {
  let total = 0;
  for (const p of Object.values(state.partnerships)) total += p.unamortized;
  for (const d of Object.values(state.powerDeals)) total += d.unamortized;
  return total;
}

/** Corporate debt owed to investment banks: loan balances plus drawn lines. */
export function corporateDebtTotal(state: GameState): number {
  const d = state.corporateDebt;
  let total = 0;
  for (const l of Object.values(d.loans)) total += l.balance;
  for (const l of Object.values(d.lines)) total += l.drawn;
  return total;
}

export function balanceSheet(state: GameState): BalanceSheet {
  const c = state.company;
  const fixedAssets = c.fixedAssets.reduce((sum, a) => sum + assetBookValue(a), 0);
  const intangibles = intangibleAssets(state);
  const investments = holdingsValue(state, 'company');
  const ventures = venturesValue(state, 'company');
  const ventureDebt = ventureDebtValue(state, 'company');
  const realEstate = realEstateValue(state, 'company');
  const franchise = franchiseValue(state, 'company');
  const assets =
    c.cash +
    fixedAssets +
    c.leaseDeposits +
    intangibles +
    investments +
    ventures +
    ventureDebt +
    realEstate +
    franchise +
    c.goodwill;
  const corporateDebt = corporateDebtTotal(state);
  const dividendsPayable = state.governance.pendingDividend?.total ?? 0;
  const liabilities = corporateDebt + dividendsPayable + c.taxPayable;
  return {
    cash: c.cash,
    fixedAssets,
    leaseDeposits: c.leaseDeposits,
    intangibles,
    investments,
    ventures,
    ventureDebt,
    realEstate,
    franchise,
    goodwill: c.goodwill,
    assets,
    corporateDebt,
    dividendsPayable,
    taxPayable: c.taxPayable,
    liabilities,
    equity: assets - liabilities,
    // Net income posted since the last weekly close hasn't reached retained earnings yet.
    expectedEquity: c.paidInCapital + c.retainedEarnings + summarize(state.ledger.pnl).netIncome,
  };
}
