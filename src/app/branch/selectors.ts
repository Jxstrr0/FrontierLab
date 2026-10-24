// Read-only views of one branch for the branch panel (SCREENS §5): the advisor
// line, opening date, wait label, per-product unit economics, balances and
// summed income statements. Nothing here mutates GameState.
import {
  DAYS_PER_WEEK,
  FITOUT_DAYS,
  INTEREST_PERIODS,
  MANAGER_BASE_SALARY,
  MANAGER_SALARY_RANGE,
  MAX_STAFF_MULT,
  WAGE_RANGE,
  WAGE_STEP,
  WAIT_LABELS,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import type { CampaignCost } from '../../data/campaigns';
import { CITIES } from '../../data/cities';
import { isDeposit, isLoan, type ProductSpec } from '../../data/products';
import { marketWage, staffNeeded } from '../../sim/branch/staff';
import type { Book, Branch, BranchPnl, BranchPnlLine, GameState } from '../../sim/state';
import { delta, money, pct, percentText } from '../format/format';

/** UI-only thresholds for the advisor's contextual line (not simulation tuning). */
const ADVISOR = {
  lowMorale: 40,
  weakRates: 2.6,
  quietWait: 0.35,
  strongWeekGain: 0.05,
} as const;

/** UI-only morale bands for the staff mood figures (jade / brass / oxblood). */
const MOOD_BANDS = { good: 60, warn: 40 } as const;

/** Manager salary stepper step, in currency units. */
export const SALARY_STEP = 1000;

const MONTHS_PER_YEAR = INTEREST_PERIODS.monthsPerYear;

/** The game day a branch in fit-out opens. */
export function openingDay(state: GameState, branch: Branch): number {
  const e = state.events.scheduled.find(
    (x) => x.type === 'fitoutDone' && x.payload.branchId === branch.id,
  );
  return e?.day ?? branch.builtDay + FITOUT_DAYS;
}

export type WaitLabel = { text: 'Short' | 'Busy' | 'Long'; tone: 'good' | 'warn' | 'bad' };

/** SIMULATION §6.4: Short below 0.8, Busy to 1.1, Long above. */
export function waitLabel(w: number): WaitLabel {
  if (w > WAIT_LABELS.long) return { text: 'Long', tone: 'bad' };
  if (w >= WAIT_LABELS.busy) return { text: 'Busy', tone: 'warn' };
  return { text: 'Short', tone: 'good' };
}

export function moodTone(morale: number): 'good' | 'warn' | 'bad' {
  if (morale >= MOOD_BANDS.good) return 'good';
  return morale >= MOOD_BANDS.warn ? 'warn' : 'bad';
}

/**
 * Everything the advisor could say right now, most pressing first (CONTENT §25).
 * The panel shows the first; tapping the bar cycles through the rest.
 */
export function advisorLines(state: GameState, branch: Branch, openingDate: string): string[] {
  const sym = state.settings.currency;
  if (branch.status === 'fitout') {
    return [`We open on ${openingDate}. Set our rates and staff before the doors open.`];
  }
  const lines: string[] = [];
  const needed = staffNeeded(branch);
  const s = branch.staff;
  if (s.count < needed && s.target < needed) {
    lines.push(`We're short-handed: ${s.count} of ${needed} desks covered. Can we hire?`);
  }
  if (branch.waitIndex > WAIT_LABELS.long) lines.push("We're slammed. The line's out the door.");
  if (s.morale < ADVISOR.lowMorale) lines.push("The team's frustrated about pay.");
  if (branch.ratings.rates < ADVISOR.weakRates) {
    lines.push('Customers keep quoting better rates from down the street.');
  }
  const [prev, last] = branch.pnl.slice(-2);
  if (last && last.income < 0) {
    lines.push(`We lost ${money(-last.income, sym)} last week. Worth a look at the numbers.`);
  }
  if (last && prev && last.income > prev.income * (1 + ADVISOR.strongWeekGain) && prev.income > 0) {
    lines.push(`Strong week: income up ${delta(last.income, prev.income, sym).text}.`);
  }
  const waiting = Object.values(state.loanDesk.applications).filter(
    (a) => a.branchId === branch.id,
  ).length;
  if (waiting > 0) {
    lines.push(
      `${waiting} loan application${waiting === 1 ? ' is' : 's are'} waiting at the Loan Desk.`,
    );
  }
  if (branch.waitIndex < ADVISOR.quietWait) lines.push('Quiet week. Want to sharpen our rates?');
  if (lines.length === 0) lines.push("Morning, boss. Drawers are balanced and the coffee's on.");
  return lines;
}

/** Staff stepper bounds (setStaffTarget). */
export function staffBounds(branch: Branch) {
  const needed = staffNeeded(branch);
  return { needed, max: needed * MAX_STAFF_MULT };
}

/** Wage stepper bounds, snapped inside the allowed range so every value is valid (setWage). */
export function wageBounds(cityId: string) {
  const mkt = marketWage(cityId);
  return {
    market: mkt,
    min: Math.ceil((mkt * WAGE_RANGE[0]) / WAGE_STEP) * WAGE_STEP,
    max: Math.floor((mkt * WAGE_RANGE[1]) / WAGE_STEP) * WAGE_STEP,
    step: WAGE_STEP,
  };
}

/** Manager salary stepper bounds (setManagerSalary). */
export function salaryBounds(cityId: string) {
  const ref = (CITIES[cityId]?.wageIndex ?? 1) * MANAGER_BASE_SALARY;
  return {
    min: Math.ceil((ref * MANAGER_SALARY_RANGE[0]) / SALARY_STEP) * SALARY_STEP,
    max: Math.floor((ref * MANAGER_SALARY_RANGE[1]) / SALARY_STEP) * SALARY_STEP,
  };
}

/** Formats a product price: a rate, a monthly or annual fee, or a % fee. */
export function priceText(spec: ProductSpec, v: number, sym: string): string {
  switch (spec.priceType) {
    case 'rate':
    case 'pctFee':
      return pct(v);
    case 'feeMonthly':
      return `${sym}${Math.round(v)}/mo`;
    case 'feeAnnual':
      return `${sym}${Math.round(v)}/yr`;
  }
}

/** Allowed price range for the stepper hint: "0.00–8.00%" or "$0–$30". */
export function rangeText(spec: ProductSpec, sym: string): string {
  if (spec.priceType === 'rate' || spec.priceType === 'pctFee') {
    return `${(spec.min * 100).toFixed(2)}–${pct(spec.max)}`;
  }
  return `${sym}${spec.min}–${sym}${spec.max}`;
}

/**
 * Parses a typed price. Rates and % fees accept "3.25" or "3.25%" as percent;
 * a value already inside the product's range (e.g. 0.0325) is taken as is.
 */
/** Reads a typed price: rates and % fees are typed as percents ("3.25"), fees as whole money. */
export function parsePrice(spec: ProductSpec, s: string): number {
  const n = Number(s.replace(/[%$\s,]|\/mo|\/yr/g, ''));
  if (spec.priceType === 'feeMonthly' || spec.priceType === 'feeAnnual') return n;
  return n / 100;
}

/** The editable text for a price, in the units parsePrice expects. */
export function editPrice(spec: ProductSpec, v: number): string {
  if (spec.priceType === 'feeMonthly' || spec.priceType === 'feeAnnual')
    return String(Math.round(v));
  return percentText(v);
}

export interface UnitView {
  /** Share of each revenue dollar kept after funding, servicing and expected losses. */
  margin: number;
  caption: string;
  /** "Funding cost (FTP)" or "Unit cost" row. */
  costLabel: string;
  costText: string;
}

/**
 * Per-account economics behind the margin ring (SCREENS §5.2), using the
 * branch's average balance when it has accounts and the product ticket otherwise.
 */
export function unitView(
  spec: ProductSpec,
  price: number,
  ftp: number,
  book: Book | undefined,
  sym: string,
): UnitView {
  const perYear = spec.servicing * WEEKS_PER_YEAR;
  const avg = book && book.accounts > 0 ? book.balance / book.accounts : spec.ticket;
  const ratio = (keep: number, rev: number) => (rev > 0 ? keep / rev : 0);
  if (spec.priceType === 'rate' && isDeposit(spec)) {
    const spread = ftp - price;
    return {
      margin: ratio(spread, ftp),
      caption: `Spread ${signed(spread)}`,
      costLabel: 'Funding credit (FTP)',
      costText: pct(ftp),
    };
  }
  if (spec.priceType === 'rate' && isLoan(spec)) {
    const spread = price - ftp;
    const loss = (spec.basePd ?? 0) * (spec.lgd ?? 0);
    return {
      margin: ratio(spread - loss, price),
      caption: `Spread ${signed(spread)}`,
      costLabel: 'Funding cost (FTP)',
      costText: pct(ftp),
    };
  }
  if (isDeposit(spec)) {
    // Fee accounts: the monthly fee plus the funding credit on balances above the pay rate.
    const pay = spec.payRate ?? 0;
    const rev = price * MONTHS_PER_YEAR + avg * ftp;
    const keep = rev - avg * pay - perYear;
    return {
      margin: ratio(keep, rev),
      caption: `Spread ${signed(ftp - pay)}`,
      costLabel: 'Unit cost',
      costText: `${sym}${(perYear / MONTHS_PER_YEAR).toFixed(2)}/mo`,
    };
  }
  if (spec.kind === 'wealth') {
    const rev = avg * price;
    return {
      margin: ratio(rev - perYear, rev),
      caption: `Fee ${pct(price)} of assets`,
      costLabel: 'Unit cost',
      costText: `${sym}${(perYear / MONTHS_PER_YEAR).toFixed(2)}/mo`,
    };
  }
  if (spec.kind === 'fx') {
    return { margin: 1, caption: `Markup ${pct(price)}`, costLabel: 'Unit cost', costText: 'None' };
  }
  const rev = spec.priceType === 'feeAnnual' ? price : price * MONTHS_PER_YEAR;
  return {
    margin: ratio(rev - perYear, rev),
    caption: `Fee ${priceText(spec, price, sym)}`,
    costLabel: 'Unit cost',
    costText: `${sym}${perYear.toFixed(2)}/yr`,
  };
}

function signed(r: number): string {
  return `${r >= 0 ? '+' : '−'}${pct(Math.abs(r))}`;
}

/** Deposits, loans (including Loan Desk business loans) and customers at a branch. */
export function branchBalances(state: GameState, branch: Branch, specs: ProductSpec[]) {
  let deposits = 0;
  let loans = 0;
  let aum = 0;
  for (const spec of specs) {
    const b = branch.books[spec.id]?.balance ?? 0;
    if (isDeposit(spec)) deposits += b;
    else if (isLoan(spec)) loans += b;
    else if (spec.kind === 'wealth') aum += b;
  }
  const sbl = businessLoans(state, branch.id);
  return { deposits, loans: loans + sbl.balance, aum, customers: branch.customers };
}

/** Current Loan Desk loans and pending applications for a branch. */
export function businessLoans(state: GameState, branchId: string) {
  let balance = 0;
  let count = 0;
  for (const l of Object.values(state.loanDesk.loans)) {
    if (l.branchId !== branchId || l.status !== 'current') continue;
    balance += l.balance;
    count += 1;
  }
  const pending = Object.values(state.loanDesk.applications).filter(
    (a) => a.branchId === branchId,
  ).length;
  return { balance, count, pending };
}

export type Period = 'week' | 'quarter' | 'year';
export const PERIOD_WEEKS: Record<Period, number> = {
  week: 1,
  quarter: WEEKS_PER_YEAR / 4,
  year: WEEKS_PER_YEAR,
};

/** Sums the last n weekly P&L rows (as many as the branch has kept). */
export function sumPnl(rows: BranchPnl[], weeks: number) {
  const slice = rows.slice(-weeks);
  const lines = {} as Record<BranchPnlLine, number>;
  let revenue = 0;
  let income = 0;
  for (const r of slice) {
    revenue += r.revenue;
    income += r.income;
    for (const [k, v] of Object.entries(r.lines)) {
      lines[k as BranchPnlLine] = (lines[k as BranchPnlLine] ?? 0) + v;
    }
  }
  return { weeks: slice.length, revenue, income, expenses: revenue - income, lines };
}

/** SIMULATION §12 statement line groups. */
export const REVENUE_LINES: [BranchPnlLine, string][] = [
  ['loanInterest', 'Loan interest'],
  ['fundingCredit', 'Deposit funding credit'],
  ['fees', 'Fees'],
  ['wealthServices', 'Wealth & services'],
];
export const EXPENSE_LINES: [BranchPnlLine, string][] = [
  ['depositInterest', 'Deposit interest'],
  ['fundingCharge', 'Loan funding charge'],
  ['losses', 'Loan losses'],
  ['staff', 'Staff'],
  ['manager', 'Manager'],
  ['rent', 'Rent'],
  ['marketing', 'Marketing'],
  ['equipment', 'Equipment & upkeep'],
  ['servicing', 'Servicing & underwriting'],
  ['overhead', 'Overhead'],
];

/** "$126/wk", "$50 per new deposit account" or "$0.05 per account a week". */
export function campaignCostText(cost: CampaignCost, costIndex: number, sym: string): string {
  if (cost.type === 'weekly') return `${money(cost.amount * costIndex, sym)}/wk`;
  if (cost.type === 'perNewDepositAccount') {
    return `${money(cost.amount, sym)} per new deposit account`;
  }
  return `${sym}${cost.amount.toFixed(2)} per account a week`;
}

/** Game day at the close of a sim week, for dates on week-indexed records. */
export const dayOfWeek = (week: number) => week * DAYS_PER_WEEK;
