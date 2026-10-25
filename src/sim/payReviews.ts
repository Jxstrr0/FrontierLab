// Pay, pay reviews and poaching (SIMULATION §17.1, §17.2). Branch managers have
// a market pay that rises with their years at the bank, and a rival may poach
// one each week, more often when they're underpaid and less when well paid.
// The COO's Pay reviews delegation sets every executive and branch manager to
// market × (1 + your pay premium) once a year, so pay keeps up with the market.
import {
  EXEC_PAY,
  MANAGER_BASE_SALARY,
  MANAGER_PAY,
  MANAGER_SALARY_RANGE,
  MANAGER_SALARY_SPREAD,
  PAY_REVIEW,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { pushEvent } from './events';
import { delegationOn, execMarketSalary, seatedExecs } from './execSeats';
import { clamp, roundToStep } from './math';
import { stream } from './rng';
import type { Branch, GameState, Manager } from './state';

const avgSkill = (m: Manager) =>
  (m.skills.people + m.skills.product + m.skills.marketing + m.skills.ethics) / 4;

/** The city a manager is paid in: their branch's, or the home city. */
function cityOf(state: GameState, m: Manager): string {
  return (m.branchId && state.branches[m.branchId]?.cityId) || state.meta.homeCityId;
}

/** Salary bounds for a manager in a city (MANAGER_SALARY_RANGE × the base salary there). */
export function managerSalaryBounds(cityId: string): { min: number; max: number } {
  const ref = (CITIES[cityId]?.wageIndex ?? 1) * MANAGER_BASE_SALARY;
  const step = MANAGER_PAY.salaryStep;
  return {
    min: Math.ceil((ref * MANAGER_SALARY_RANGE[0]) / step) * step,
    max: Math.floor((ref * MANAGER_SALARY_RANGE[1]) / step) * step,
  };
}

/** §17.1: what rivals would pay this manager now (the hiring ask, rising with tenure). */
export function managerMarketSalary(state: GameState, m: Manager): number {
  const wage = CITIES[cityOf(state, m)]?.wageIndex ?? 1;
  const ask =
    MANAGER_BASE_SALARY *
    wage *
    (MANAGER_SALARY_SPREAD.base + (MANAGER_SALARY_SPREAD.slope * avgSkill(m)) / 100);
  const years = Math.max(0, state.clock.week - m.sinceWeek) / WEEKS_PER_YEAR;
  return ask * (1 + MANAGER_PAY.tenureGrowth * years);
}

/** §17.1 weekly chance a rival poaches a manager paid `salary` against `market`. */
export function managerPoachChance(salary: number, market: number): number {
  const p = MANAGER_PAY;
  const ratio = salary / Math.max(1, market);
  const mult =
    ratio < p.underpaidRatio ? p.underpaidMult : ratio >= p.wellPaidRatio ? p.wellPaidMult : 1;
  return p.poachBase * mult;
}

/** Removes a branch's manager and hands every branch delegation back to you. */
export function clearManager(state: GameState, branch: Branch): void {
  if (branch.managerId) delete state.people.managers[branch.managerId];
  delete branch.managerId;
  branch.delegation = {
    staffing: false,
    products: false,
    marketing: false,
    troubles: false,
    loans: false,
  };
}

/** Tick step 8: rivals may poach branch managers (the COO's Branch operations rehires). */
export function runManagerPoaching(state: GameState): void {
  const rng = stream(state, 'managerPoach');
  const rivals = Object.values(state.rivals)
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const branch of Object.values(state.branches)) {
    const m =
      branch.status === 'open' && branch.managerId && state.people.managers[branch.managerId];
    if (!m) continue;
    if (!rng.chance(managerPoachChance(m.salary, managerMarketSalary(state, m)))) continue;
    const rival = rivals.length > 0 ? rng.pick(rivals).name : 'A rival bank';
    clearManager(state, branch);
    pushEvent(
      state,
      'MANAGER_POACHED',
      { branchId: branch.id, branch: branch.name, name: m.name, rival },
      3,
    );
  }
}

/** The pay a review sets: market × (1 + premium), in steps, within the allowed range. */
export function reviewedExecSalary(state: GameState): number {
  const market = execMarketSalary(state);
  const [lo, hi] = EXEC_PAY.salaryRange;
  const step = EXEC_PAY.salaryStep;
  const target = market * (1 + state.executives.payPremium);
  return clamp(
    roundToStep(target, step),
    Math.ceil((market * lo) / step) * step,
    Math.floor((market * hi) / step) * step,
  );
}

export function reviewedManagerSalary(state: GameState, m: Manager): number {
  const b = managerSalaryBounds(cityOf(state, m));
  const target = managerMarketSalary(state, m) * (1 + state.executives.payPremium);
  return clamp(roundToStep(target, MANAGER_PAY.salaryStep), b.min, b.max);
}

/** Sets every executive and branch manager to their reviewed pay; returns how many changed. */
export function runPayReview(state: GameState): { raised: number; cut: number } {
  let raised = 0;
  let cut = 0;
  const apply = (from: number, to: number) => {
    if (to > from) raised += 1;
    else if (to < from) cut += 1;
    return to;
  };
  const execPay = reviewedExecSalary(state);
  for (const e of seatedExecs(state)) e.salary = apply(e.salary, execPay);
  for (const m of Object.values(state.people.managers)) {
    if (!m.branchId) continue;
    m.salary = apply(m.salary, reviewedManagerSalary(state, m));
  }
  state.executives.lastPayReviewWeek = state.clock.week;
  pushEvent(
    state,
    'PAY_REVIEW',
    { raised, cut, premium: state.executives.payPremium },
    raised + cut > 0 ? 4 : 6,
  );
  return { raised, cut };
}

/** COO Pay reviews (delegation): a review once every PAY_REVIEW.everyWeeks. */
export function cooPayReviews(state: GameState): void {
  const last = state.executives.lastPayReviewWeek;
  if (last >= 0 && state.clock.week - last < PAY_REVIEW.everyWeeks) return;
  runPayReview(state);
}

/** True when the COO is seated with Pay reviews on. */
export function payReviewsOn(state: GameState): boolean {
  return delegationOn(state, 'coo', 'payReviews');
}
