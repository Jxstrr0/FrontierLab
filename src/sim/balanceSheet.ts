// The company balance sheet (SIMULATION §14.4), computed from state on demand.
// Equity is assets minus liabilities; `expectedEquity` rolls paid-in capital,
// retained earnings and AOCI forward, and the two must agree (balance identity).
import { isDeposit, isLoan, PRODUCTS } from '../data/products';
import { totalWholesale } from './fundingLots';
import { summarize } from './ledger';
import { productSpec } from './products';
import type { GameState } from './state';

export interface BalanceSheet {
  cash: number;
  reserves: number;
  bonds: number;
  loans: number;
  reo: number;
  fixedAssets: number;
  leaseDeposits: number;
  assets: number;
  deposits: number;
  wholesale: number;
  taxPayable: number;
  liabilities: number;
  equity: number;
  aoci: number;
  expectedEquity: number;
}

/** Book value of a fixed asset: straight-line over its life. */
export function assetBookValue(a: { cost: number; lifeWeeks: number; ageWeeks: number }): number {
  return a.cost * Math.max(0, 1 - a.ageWeeks / a.lifeWeeks);
}

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
  const reo = Object.values(state.reo).reduce((sum, p) => sum + p.value, 0);
  const fixedAssets = c.fixedAssets.reduce((sum, a) => sum + assetBookValue(a), 0);
  const assets = c.cash + t.reserves + t.bondsMarket + loans + reo + fixedAssets + c.leaseDeposits;
  const deposits = totalDeposits(state);
  const wholesale = totalWholesale(state);
  const liabilities = deposits + wholesale + c.taxPayable;
  const aoci = t.bondsMarket - t.bondsBook;
  return {
    cash: c.cash,
    reserves: t.reserves,
    bonds: t.bondsMarket,
    loans,
    reo,
    fixedAssets,
    leaseDeposits: c.leaseDeposits,
    assets,
    deposits,
    wholesale,
    taxPayable: c.taxPayable,
    liabilities,
    equity: assets - liabilities,
    aoci,
    // Net income posted since the last weekly close hasn't reached retained earnings yet.
    expectedEquity:
      c.paidInCapital + c.retainedEarnings + aoci + summarize(state.ledger.pnl).netIncome,
  };
}
