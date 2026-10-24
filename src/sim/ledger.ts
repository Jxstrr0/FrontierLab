// The running ledger between weekly closes. Every P&L line and every movement
// of corporate cash is posted here, so the weekly statements and the cash-flow
// reconciliation (SIMULATION §14.3) read from one place.
import type { CashCategory, GameState, Ledger, PnlLine } from './state';

const total = (pnl: Record<PnlLine, number>, lines: readonly PnlLine[]) =>
  lines.reduce((s, l) => s + pnl[l], 0);

export const PNL_LINES: readonly PnlLine[] = [
  'loanInterest',
  'reserveInterest',
  'bondCoupon',
  'depositInterest',
  'wholesaleInterest',
  'accountFees',
  'cardFees',
  'wealthFees',
  'serviceFees',
  'atmFees',
  'originationFees',
  'realizedGains',
  'branchStaff',
  'managers',
  'rent',
  'marketing',
  'equipment',
  'overhead',
  'servicing',
  'underwriting',
  'hqStaff',
  'benefits',
  'development',
  'fines',
  'incidents',
  'corporateInterest',
  'amortization',
  'execPay',
  'grantExpense',
  'integration',
  'commissions',
  'dividendIncome',
  'investmentGains',
  'acquisitionGain',
  'ventureDebtInterest',
  'rentalIncome',
  'propertyGains',
  'propertyCosts',
  'lobbying',
  'loanLosses',
  'depreciation',
  'tax',
];

export const INTEREST_INCOME: readonly PnlLine[] = [
  'loanInterest',
  'reserveInterest',
  'bondCoupon',
  'ventureDebtInterest',
];
export const INTEREST_EXPENSE: readonly PnlLine[] = ['depositInterest', 'wholesaleInterest'];
export const FEE_INCOME: readonly PnlLine[] = [
  'accountFees',
  'cardFees',
  'wealthFees',
  'serviceFees',
  'atmFees',
  'originationFees',
  'realizedGains',
  'dividendIncome',
  'investmentGains',
  'acquisitionGain',
  'rentalIncome',
  'propertyGains',
];
export const OPEX: readonly PnlLine[] = [
  'branchStaff',
  'managers',
  'rent',
  'marketing',
  'equipment',
  'overhead',
  'servicing',
  'underwriting',
  'hqStaff',
  'benefits',
  'development',
  'fines',
  'incidents',
  'corporateInterest',
  'amortization',
  'execPay',
  'grantExpense',
  'integration',
  'commissions',
  'propertyCosts',
  'lobbying',
];
/** Lines that don't move corporate cash (§14.3). */
export const NON_CASH: readonly PnlLine[] = [
  'loanLosses',
  'depreciation',
  'amortization',
  'realizedGains',
  'grantExpense',
  'investmentGains',
  'acquisitionGain',
  'propertyGains',
];

export function emptyLedger(): Ledger {
  const pnl = {} as Record<PnlLine, number>;
  for (const line of PNL_LINES) pnl[line] = 0;
  return { pnl, cash: { ops: 0, investing: 0, financing: 0 } };
}

/** Adds an amount to a P&L line. All lines hold positive magnitudes. */
export function postPnl(state: GameState, line: PnlLine, amount: number): void {
  state.ledger.pnl[line] += amount;
}

/** Moves corporate cash (signed) and records it in the cash-flow category. */
export function postCash(state: GameState, amount: number, category: CashCategory): void {
  state.company.cash += amount;
  state.ledger.cash[category] += amount;
}

/** An income line received in corporate cash. */
export function earn(state: GameState, line: PnlLine, amount: number): void {
  postPnl(state, line, amount);
  postCash(state, amount, 'ops');
}

/** An expense line paid from corporate cash. */
export function spend(state: GameState, line: PnlLine, amount: number): void {
  postPnl(state, line, amount);
  postCash(state, -amount, 'ops');
}

export interface IncomeSummary {
  interestIncome: number;
  interestExpense: number;
  netInterestIncome: number;
  feeIncome: number;
  opex: number;
  loanLosses: number;
  depreciation: number;
  preTax: number;
  tax: number;
  netIncome: number;
  revenue: number;
  netRevenue: number;
}

export function summarize(pnl: Record<PnlLine, number>): IncomeSummary {
  const interestIncome = total(pnl, INTEREST_INCOME);
  const interestExpense = total(pnl, INTEREST_EXPENSE);
  const feeIncome = total(pnl, FEE_INCOME);
  const opex = total(pnl, OPEX);
  const preTax =
    interestIncome - interestExpense + feeIncome - opex - pnl.loanLosses - pnl.depreciation;
  return {
    interestIncome,
    interestExpense,
    netInterestIncome: interestIncome - interestExpense,
    feeIncome,
    opex,
    loanLosses: pnl.loanLosses,
    depreciation: pnl.depreciation,
    preTax,
    tax: pnl.tax,
    netIncome: preTax - pnl.tax,
    revenue: interestIncome + feeIncome,
    netRevenue: interestIncome - interestExpense + feeIncome,
  };
}
