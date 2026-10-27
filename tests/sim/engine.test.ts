// Whole-engine checks: the balance identity and cash-flow reconciliation hold
// every week of a scripted run (SIMULATION §1, §14.3).
import { describe, expect, it } from 'vitest';
import { START_CASH } from '../../src/config/balance';
import { branchArr } from '../../src/sim/arr';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { FEE_INCOME, NON_CASH, summarize } from '../../src/sim/ledger';
import { runScript } from '../helpers/scenario';

describe('engine', () => {
  it('keeps assets = liabilities + equity and reconciles cash every week', () => {
    let lastCash = START_CASH;
    let lastTaxPayable = 0;
    let weeksChecked = 0;
    const s = runScript(156, (state, week) => {
      const bs = balanceSheet(state);
      expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
      const snap = state.history.weekly.at(-1)!;
      expect(snap.week).toBe(week);
      // Net cash flow equals the change in corporate cash between closes.
      const open = state.ledger.cash;
      const cashAtClose = state.company.cash - (open.ops + open.investing + open.financing);
      expect(snap.cashFlow.net).toBeCloseTo(cashAtClose - lastCash, 2);
      // Operations = net income + non-cash items + change in taxes payable.
      const sum = summarize(snap.pnl);
      // Non-cash expenses add back, non-cash gains (realized, property marks…) come off.
      const nonCash = NON_CASH.reduce(
        (t, l) => t + (FEE_INCOME.includes(l) ? -snap.pnl[l] : snap.pnl[l]),
        0,
      );
      const dTax = snap.totals.taxPayable - lastTaxPayable;
      expect(snap.cashFlow.ops).toBeCloseTo(sum.netIncome + nonCash + dTax, 2);
      lastCash = cashAtClose;
      lastTaxPayable = snap.totals.taxPayable;
      weeksChecked += 1;
    });
    expect(weeksChecked).toBe(156);
    expect(Object.keys(s.branches).length).toBeGreaterThanOrEqual(1);
    expect(s.history.quarterly.length).toBeGreaterThanOrEqual(11);
  });

  it('opens a branch after a one-week fit-out and grows its books', () => {
    const s = runScript(30);
    const b = Object.values(s.branches)[0]!;
    expect(b.status).toBe('open');
    expect(b.openedWeek).toBe(1);
    expect(b.customers).toBeGreaterThan(500);
    expect(b.books.plus!.balance).toBeGreaterThan(0);
    expect(branchArr(s, b)).toBeGreaterThan(250_000);
    expect(b.pnl).toHaveLength(30);
  });
});
