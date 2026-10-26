// Read-only statement helpers for the Company panel (SIMULATION §14.2–14.5):
// Week, Quarter and Year statements sum the weekly records; the balance sheet
// is a point-in-time view of the current state.
import { WEEKS_PER_YEAR } from '../../config/balance';
import { balanceSheet } from '../../sim/balanceSheet';
import { PNL_LINES, summarize } from '../../sim/ledger';
import type { GameState, PnlLine, WeeklySnapshot } from '../../sim/state';

export type Period = 'week' | 'quarter' | 'year';

export const PERIOD_WEEKS: Record<Period, number> = {
  week: 1,
  quarter: WEEKS_PER_YEAR / 4,
  year: WEEKS_PER_YEAR,
};

/** One row of a statement. `total` rows are bold; `sub` rows are indented. */
export interface StatementLine {
  label: string;
  value: number;
  kind?: 'sub' | 'total';
}

/**
 * The weekly records a statement period sums. `delayWeeks` leaves out the
 * newest weeks, which a short-staffed Finance floor hasn't closed yet.
 */
export function periodSnapshots(s: GameState, period: Period, delayWeeks = 0): WeeklySnapshot[] {
  const closed = s.history.weekly.slice(0, Math.max(0, s.history.weekly.length - delayWeeks));
  return closed.slice(-PERIOD_WEEKS[period]);
}

function sumPnl(snaps: WeeklySnapshot[]): Record<PnlLine, number> {
  const out = {} as Record<PnlLine, number>;
  for (const line of PNL_LINES) out[line] = snaps.reduce((sum, w) => sum + w.pnl[line], 0);
  return out;
}

export function incomeStatement(snaps: WeeklySnapshot[]): StatementLine[] {
  const x = summarize(sumPnl(snaps));
  return [
    { label: 'Interest income', value: x.interestIncome, kind: 'sub' },
    { label: 'Interest expense', value: -x.interestExpense, kind: 'sub' },
    { label: 'Net interest income', value: x.netInterestIncome, kind: 'total' },
    { label: 'Fee and other income', value: x.feeIncome },
    { label: 'Operating expenses', value: -x.opex },
    { label: 'Loan losses', value: -x.loanLosses },
    { label: 'Depreciation', value: -x.depreciation },
    { label: 'Pre-tax income', value: x.preTax, kind: 'total' },
    { label: 'Tax', value: -x.tax },
    { label: 'Net income', value: x.netIncome, kind: 'total' },
  ];
}

export function cashFlowStatement(snaps: WeeklySnapshot[]): StatementLine[] {
  const sum = (pick: (w: WeeklySnapshot) => number) => snaps.reduce((t, w) => t + pick(w), 0);
  return [
    { label: 'Operations', value: sum((w) => w.cashFlow.ops), kind: 'sub' },
    { label: 'Investing', value: sum((w) => w.cashFlow.investing), kind: 'sub' },
    { label: 'Financing', value: sum((w) => w.cashFlow.financing), kind: 'sub' },
    { label: 'Net cash flow', value: sum((w) => w.cashFlow.net), kind: 'total' },
  ];
}

export function balanceSheetLines(s: GameState): StatementLine[] {
  const b = balanceSheet(s);
  // Retained earnings = equity − paid-in capital − AOCI (§14.4).
  const retained = b.equity - s.company.paidInCapital - b.aoci;
  // Lines that only appear once something is in them (later-stage assets and liabilities).
  const optional = (label: string, value: number): StatementLine[] =>
    Math.abs(value) >= 0.5 ? [{ label, value, kind: 'sub' }] : [];
  return [
    { label: 'Cash', value: b.cash, kind: 'sub' },
    { label: 'Reserves', value: b.reserves, kind: 'sub' },
    { label: 'Government bonds', value: b.bonds, kind: 'sub' },
    { label: 'Loans', value: b.loans, kind: 'sub' },
    { label: 'Foreclosed property', value: b.reo, kind: 'sub' },
    ...optional('Stocks', b.investments),
    ...optional('Ventures', b.ventures),
    ...optional('Compute credits', b.ventureDebt),
    ...optional('Real estate', b.realEstate),
    ...optional('Currencies', b.currencies),
    { label: 'Sales offices and equipment', value: b.fixedAssets, kind: 'sub' },
    { label: 'Lease deposits', value: b.leaseDeposits, kind: 'sub' },
    ...optional('Partnership fees', b.intangibles),
    ...optional('Goodwill', b.goodwill),
    { label: 'Total assets', value: b.assets, kind: 'total' },
    { label: 'Deposits', value: b.deposits, kind: 'sub' },
    { label: 'Wholesale funding', value: b.wholesale, kind: 'sub' },
    ...optional('Corporate debt', b.corporateDebt),
    ...optional('Dividends payable', b.dividendsPayable),
    { label: 'Taxes payable', value: b.taxPayable, kind: 'sub' },
    { label: 'Total liabilities', value: b.liabilities, kind: 'total' },
    { label: 'Paid-in capital', value: s.company.paidInCapital, kind: 'sub' },
    { label: 'Retained earnings', value: retained, kind: 'sub' },
    { label: 'Unrealised bond gains', value: b.aoci, kind: 'sub' },
    { label: 'Total equity', value: b.equity, kind: 'total' },
  ];
}
