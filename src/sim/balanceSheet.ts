// The company balance sheet (SIMULATION §14.4), computed from state on demand.
// Equity is assets minus liabilities; `expectedEquity` rolls paid-in capital,
// retained earnings and AOCI forward, and the two must agree (balance identity).
import { isDeposit, isLoan, PRODUCTS } from '../data/products';
import { totalWholesale } from './fundingLots';
import { summarize } from './ledger';
import { fxValue } from './fx';
import { franchiseValue, realEstateValue, ventureDebtValue, venturesValue } from './portfolio';
import { holdingsValue } from './securities';
import { productSpec } from './products';
import type { GameState } from './state';

export interface BalanceSheet {
  cash: number;
  reserves: number;
  loans: number;
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
  /** Company currency positions at today's rates (§19.10). */
  currencies: number;
  /** A sports club the company owns, at value (Stage 9). */
  franchise: number;
  /** Goodwill from acquisitions (§19.8, deducted from CET1). */
  goodwill: number;
  assets: number;
  deposits: number;
  wholesale: number;
  /** Business loans and drawn credit lines from rival banks (§19.9). */
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

/** Branch deposit books (partnership mini-books hold ARR since C3a). */
export function totalDeposits(state: GameState): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    for (const [pid, book] of Object.entries(b.books)) {
      const spec = productSpec(state, pid);
      if (spec && isDeposit(spec)) total += book.balance;
    }
  }
  return total;
}

/** Unamortized partnership signing fees. */
export function intangibleAssets(state: GameState): number {
  let total = 0;
  for (const p of Object.values(state.partnerships)) total += p.unamortized;
  return total;
}

/** Corporate debt owed to rival banks: loan balances plus drawn lines. */
export function corporateDebtTotal(state: GameState): number {
  const d = state.corporateDebt;
  let total = 0;
  for (const l of Object.values(d.loans)) total += l.balance;
  for (const l of Object.values(d.lines)) total += l.drawn;
  return total;
}

/** Loan balances weighted by risk weight, and in total. */
export function loanTotals(state: GameState): { total: number; rwa: number } {
  let total = 0;
  let rwa = 0;
  for (const b of Object.values(state.branches)) {
    for (const [pid, book] of Object.entries(b.books)) {
      const spec = productSpec(state, pid);
      // SBL book totals mirror the individual loans below; skip them here.
      if (!spec || !isLoan(spec) || spec.kind === 'sbl') continue;
      total += book.balance;
      rwa += book.balance * spec.riskWeight;
    }
  }
  const sblWeight = PRODUCTS.sbl?.riskWeight ?? 1;
  for (const loan of Object.values(state.loanDesk.loans)) {
    if (loan.status !== 'current') continue;
    total += loan.balance;
    rwa += loan.balance * sblWeight;
  }
  return { total, rwa };
}

export function balanceSheet(state: GameState): BalanceSheet {
  const c = state.company;
  const t = state.treasury;
  const loans = loanTotals(state).total;
  const fixedAssets = c.fixedAssets.reduce((sum, a) => sum + assetBookValue(a), 0);
  const intangibles = intangibleAssets(state);
  const investments = holdingsValue(state, 'company');
  const ventures = venturesValue(state, 'company');
  const ventureDebt = ventureDebtValue(state, 'company');
  const realEstate = realEstateValue(state, 'company');
  const currencies = fxValue(state, 'company');
  const franchise = franchiseValue(state, 'company');
  const assets =
    c.cash +
    t.reserves +
    loans +
    fixedAssets +
    c.leaseDeposits +
    intangibles +
    investments +
    ventures +
    ventureDebt +
    realEstate +
    currencies +
    franchise +
    c.goodwill;
  const deposits = totalDeposits(state);
  const wholesale = totalWholesale(state);
  const corporateDebt = corporateDebtTotal(state);
  const dividendsPayable = state.governance.pendingDividend?.total ?? 0;
  const liabilities = deposits + wholesale + corporateDebt + dividendsPayable + c.taxPayable;
  return {
    cash: c.cash,
    reserves: t.reserves,
    loans,
    fixedAssets,
    leaseDeposits: c.leaseDeposits,
    intangibles,
    investments,
    ventures,
    ventureDebt,
    realEstate,
    currencies,
    franchise,
    goodwill: c.goodwill,
    assets,
    deposits,
    wholesale,
    corporateDebt,
    dividendsPayable,
    taxPayable: c.taxPayable,
    liabilities,
    equity: assets - liabilities,
    // Net income posted since the last weekly close hasn't reached retained earnings yet.
    expectedEquity: c.paidInCapital + c.retainedEarnings + summarize(state.ledger.pnl).netIncome,
  };
}
