// Read-only views of one branch for the branch panel (SCREENS §5): the advisor
// line, opening date, wait label, per-product unit economics, balances and
// summed income statements. Nothing here mutates GameState.
import {
  DAYS_PER_WEEK,
  FITOUT_DAYS,
  INTEREST_PERIODS,
  MANAGER_PAY,
  MAX_STAFF_MULT,
  WAGE_RANGE,
  WAGE_STEP,
  WAIT_LABELS,
  WEEKS_PER_YEAR,
} from '../../config/balance';
import type { CampaignCost } from '../../data/campaigns';
import { isRecurring, type ProductSpec } from '../../data/products';
import { branchArr } from '../../sim/arr';
import { contractTotals, officeRfps } from './dealDeskSelectors';
import { marketWage, staffNeeded } from '../../sim/branch/staff';
import { managerMarketSalary, managerSalaryBounds } from '../../sim/payReviews';
export { managerRerollFee } from '../../sim/candidateRerolls';
import type { Branch, BranchPnl, BranchPnlLine, GameState, Manager } from '../../sim/state';
import {
  delta,
  exactMoney,
  fromCurrency,
  money,
  pct,
  percentText,
  toCurrency,
} from '../format/format';

/** UI-only thresholds for the advisor's contextual line (not simulation tuning). */
const ADVISOR = {
  lowMorale: 40,
  weakRates: 2.6,
  quietWait: 0.35,
  strongWeekGain: 0.05,
} as const;

/** UI-only morale bands for the staff mood figures (jade / brass / oxblood). */
const MOOD_BANDS = { good: 60, warn: 40 } as const;

/** Manager salary stepper step (MANAGER_PAY.salaryStep). */
export const SALARY_STEP = MANAGER_PAY.salaryStep;

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
    return [`We open on ${openingDate}. Set our prices and staff before the doors open.`];
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
    lines.push('Customers keep quoting better prices from down the street.');
  }
  const [prev, last] = branch.pnl.slice(-2);
  if (last && last.income < 0) {
    lines.push(`We lost ${money(-last.income, sym)} last week. Worth a look at the numbers.`);
  }
  if (last && prev && last.income > prev.income * (1 + ADVISOR.strongWeekGain) && prev.income > 0) {
    lines.push(`Strong week: income up ${delta(last.income, prev.income, sym).text}.`);
  }
  const waiting = officeRfps(state, branch.id).fresh.length;
  if (waiting > 0) {
    lines.push(
      `${waiting} proposal request${waiting === 1 ? ' is' : 's are'} waiting at the Deal Desk.`,
    );
  }
  if (branch.waitIndex < ADVISOR.quietWait) lines.push('Quiet week. Want to sharpen our prices?');
  if (lines.length === 0) lines.push("Morning, boss. The pipeline's warm and the coffee's on.");
  return lines;
}

/** Staff stepper bounds (setStaffTarget). */
export function staffBounds(branch: Branch) {
  const needed = staffNeeded(branch);
  return { needed, max: needed * MAX_STAFF_MULT };
}

/** Wage stepper bounds, snapped inside the allowed range so every value is valid (setWage). */
export function wageBounds(s: GameState, cityId: string) {
  const mkt = marketWage(s, cityId);
  return {
    market: mkt,
    min: Math.ceil((mkt * WAGE_RANGE[0]) / WAGE_STEP) * WAGE_STEP,
    max: Math.floor((mkt * WAGE_RANGE[1]) / WAGE_STEP) * WAGE_STEP,
    step: WAGE_STEP,
  };
}

/** Manager salary stepper bounds (setManagerSalary). */
export const salaryBounds = managerSalaryBounds;

export interface ManagerPayView {
  market: number;
  /** How pay compares with market for poaching (§17.1). */
  standing: 'underpaid' | 'fair' | 'wellPaid';
}

/** A manager's market pay and where their salary stands against it. */
export function managerPayView(s: GameState, mgr: Manager): ManagerPayView {
  const market = managerMarketSalary(s, mgr);
  const ratio = mgr.salary / Math.max(1, market);
  const standing =
    ratio < MANAGER_PAY.underpaidRatio
      ? 'underpaid'
      : ratio >= MANAGER_PAY.wellPaidRatio
        ? 'wellPaid'
        : 'fair';
  return { market, standing };
}

/** Formats a product price: a rate, a monthly or annual fee, a % fee, or a price per million tokens (`compact` drops the word "tokens" for the stepper). */
export function priceText(spec: ProductSpec, v: number, sym: string, compact = false): string {
  switch (spec.priceType) {
    case 'rate':
    case 'pctFee':
      return pct(v);
    case 'feeMonthly':
      return `${sym}${Math.round(toCurrency(v, sym)).toLocaleString('en-US')}/mo`;
    case 'feeAnnual':
      return `${sym}${Math.round(toCurrency(v, sym)).toLocaleString('en-US')}/yr`;
    case 'perUnit':
      return `${sym}${toCurrency(v, sym).toFixed(2)}/M${compact ? '' : ' tokens'}`;
  }
}

/** Allowed price range for the stepper hint: "0.00–8.00%" or "$0–$30". */
export function rangeText(spec: ProductSpec, sym: string): string {
  if (spec.priceType === 'rate' || spec.priceType === 'pctFee') {
    return `${(spec.min * 100).toFixed(2)}–${pct(spec.max)}`;
  }
  if (spec.priceType === 'perUnit') {
    const cents = (v: number) => toCurrency(v, sym).toFixed(2);
    return `${sym}${cents(spec.min)}–${sym}${cents(spec.max)}`;
  }
  const whole = (v: number) => Math.round(toCurrency(v, sym)).toLocaleString('en-US');
  return `${sym}${whole(spec.min)}–${sym}${whole(spec.max)}`;
}

/**
 * Parses a typed price. Rates and % fees accept "3.25" or "3.25%" as percent;
 * a value already inside the product's range (e.g. 0.0325) is taken as is.
 */
/** Reads a typed price: rates and % fees are typed as percents ("3.25"), fees as whole money. */
export function parsePrice(spec: ProductSpec, s: string, sym = '$'): number {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  if (
    spec.priceType === 'feeMonthly' ||
    spec.priceType === 'feeAnnual' ||
    spec.priceType === 'perUnit'
  )
    return fromCurrency(n, sym);
  return n / 100;
}

/** The editable text for a price, in the units parsePrice expects. */
export function editPrice(spec: ProductSpec, v: number, sym = '$'): string {
  if (spec.priceType === 'feeMonthly' || spec.priceType === 'feeAnnual')
    return String(Math.round(toCurrency(v, sym)));
  if (spec.priceType === 'perUnit') return toCurrency(v, sym).toFixed(2);
  return percentText(v);
}

export interface UnitView {
  /** Share of each revenue dollar kept after compute and servicing. */
  margin: number;
  caption: string;
  /** "Compute cost", "Cost per seat" or "Unit cost" row. */
  costLabel: string;
  costText: string;
}

/**
 * Per-unit economics behind the margin ring (SCREENS §5.2): a unit of usage,
 * a seat, or a year of an app's fee.
 */
export function unitView(spec: ProductSpec, price: number, sym: string): UnitView {
  const perYear = spec.servicing * WEEKS_PER_YEAR;
  const ratio = (keep: number, rev: number) => (rev > 0 ? keep / rev : 0);
  if (spec.kind === 'usage') {
    // Per unit of usage: the price less the compute behind it (C3a).
    const cost = spec.unitCost ?? 0;
    return {
      margin: ratio(price - cost, price),
      caption: `Price ${priceText(spec, price, sym)}`,
      costLabel: 'Compute cost',
      costText: `${exactMoney(cost, sym)}/M tokens`,
    };
  }
  if (spec.kind === 'plan') {
    // Per seat: a year of the fee less a year of serving it.
    const rev = price * (spec.priceType === 'feeAnnual' ? 1 : MONTHS_PER_YEAR);
    return {
      margin: ratio(rev - perYear, rev),
      caption: price > 0 ? `Fee ${priceText(spec, price, sym)}` : 'Free',
      costLabel: 'Cost per seat',
      costText: `${exactMoney(perYear / MONTHS_PER_YEAR, sym)}/mo`,
    };
  }
  const rev = spec.priceType === 'feeAnnual' ? price : price * MONTHS_PER_YEAR;
  return {
    margin: ratio(rev - perYear, rev),
    caption: `Fee ${priceText(spec, price, sym)}`,
    costLabel: 'Unit cost',
    costText: `${exactMoney(perYear, sym)}/yr`,
  };
}

/** An office's ARR (plan and usage books), enterprise contract value and customers. */
export function branchBalances(state: GameState, branch: Branch) {
  const deals = contractTotals(state, branch.id);
  return { arr: branchArr(state, branch), contractArr: deals.arr, customers: branch.customers };
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

/** SIMULATION §12 statement line groups (C3b: AI revenue lines and compute). */
export const REVENUE_LINES: [BranchPnlLine, string][] = [
  ['plans', 'Plans'],
  ['api', 'API'],
  ['apps', 'Apps & services'],
  ['loanDesk', 'Enterprise contracts'],
  ['otherIncome', 'Other income'],
];
export const EXPENSE_LINES: [BranchPnlLine, string][] = [
  ['compute', 'Compute'],
  ['staff', 'Staff'],
  ['manager', 'Manager'],
  ['rent', 'Rent'],
  ['marketing', 'Marketing'],
  ['equipment', 'Equipment & upkeep'],
  ['servicing', 'Support & data licences'],
  ['overhead', 'Overhead'],
];

/**
 * "$126/wk", "$50 per new plan sign-up" or "$0.05 per customer a week";
 * `weeklyIndex` is the office's campaignCostIndex, `level` today's price list (§4.6).
 */
export function campaignCostText(
  cost: CampaignCost,
  weeklyIndex: number,
  level: number,
  sym: string,
): string {
  if (cost.type === 'weekly') return `${money(cost.amount * weeklyIndex, sym)}/wk`;
  if (cost.type === 'perNewDepositAccount') {
    return `${money(cost.amount * level, sym)} per new plan sign-up`;
  }
  return `${exactMoney(cost.amount * level, sym)} per customer a week`;
}

/** Game day at the close of a sim week, for dates on week-indexed records. */
export const dayOfWeek = (week: number) => week * DAYS_PER_WEEK;

/** Product card words (C3a): plan and usage books show ARR, seats or sign-ups, and a price. */
export function productWords(spec: ProductSpec) {
  return {
    price: spec.priceType === 'rate' ? 'Rate' : isRecurring(spec) ? 'Price' : 'Fee',
    balance: isRecurring(spec)
      ? 'ARR'
      : spec.kind === 'wealth'
        ? 'Assets under management'
        : 'Balance',
    newAccounts:
      spec.kind === 'plan'
        ? 'New seats last week'
        : spec.kind === 'usage'
          ? 'New sign-ups last week'
          : 'New sign-ups last week',
  };
}
