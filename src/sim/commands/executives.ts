// Executive commands (SIMULATION §17.2, SCREENS §10.1): hire from a seat's
// candidate pool, fire (severance in weeks of salary, P&L execPay), set salary,
// switch delegations and add stock option or RSU grants. All need an Executive
// floor at HQ. Also the COO's growth cities and "Open a branch now" (§17.2).
import { EXEC_PAY, EXECUTIVES, PAY_REVIEW, WEEKS_PER_YEAR } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EXEC_SEATS } from '../../data/executives';
import { execRerollFee } from '../candidateRerolls';
import { generateExecutive } from '../execCandidates';
import { canGrowIn, expansionPlan, seedGrowthCities } from '../execDelegationsGrowth';
import { grantFairValue } from '../execGrants';
import { seatExecutive, vacateSeat } from '../execSeatChanges';
import { execMarketSalary, hasExecFloor } from '../execSeats';
import { newId } from '../ids';
import { payReviewsOn, runPayReview } from '../payReviews';
import { spend } from '../ledger';
import { roundToStep } from '../math';
import type { EquityGrant, ExecSeat, Executive, GameState } from '../state';
import { buildBranch } from './branches';
import { fail, money, ok, type CommandResult } from './result';

const NO_FLOOR = 'Executives work from the Executive floor. Add one at HQ first.';
const isSeat = (seat: string): seat is ExecSeat => seat in EXEC_SEATS;

/** Severance owed on firing: EXECUTIVES.severanceWeeks of salary. */
export function execSeverance(salary: number): number {
  return (salary * EXECUTIVES.severanceWeeks) / WEEKS_PER_YEAR;
}

/** Salary bounds for a seat: EXEC_PAY.salaryRange × market, in salary steps. */
export function execSalaryBounds(state: GameState): { min: number; max: number; market: number } {
  const market = execMarketSalary(state);
  const [lo, hi] = EXEC_PAY.salaryRange;
  const step = EXEC_PAY.salaryStep;
  return {
    market,
    min: Math.ceil((market * lo) / step) * step,
    max: Math.floor((market * hi) / step) * step,
  };
}

export function hireExec(state: GameState, seat: ExecSeat, candidateId: string): CommandResult {
  if (!hasExecFloor(state)) return fail(NO_FLOOR);
  if (!isSeat(seat)) return fail('Unknown seat.');
  if (state.executives.seats[seat]) return fail(`You already have a ${EXEC_SEATS[seat].short}.`);
  const exec = state.executives.candidates[seat]?.find((c) => c.id === candidateId);
  if (!exec) return fail('That candidate has taken another job.');
  seatExecutive(state, exec);
  seedGrowthCities(state);
  return ok();
}

/**
 * Pays a recruiter for a fresh set of candidates for an empty seat (SIMULATION
 * §17.2). The fee doubles with each reroll until the pools' free refresh.
 */
export function rerollExecCandidates(
  state: GameState,
  seat: ExecSeat,
): CommandResult<{ fee: number }> {
  if (!hasExecFloor(state)) return fail(NO_FLOOR);
  if (!isSeat(seat)) return fail('Unknown seat.');
  if (state.executives.seats[seat]) return fail(`You already have a ${EXEC_SEATS[seat].short}.`);
  const fee = execRerollFee(state, seat);
  if (state.company.cash < fee) return fail(`Not enough cash: new candidates cost ${money(fee)}.`);
  spend(state, 'execPay', fee);
  const pool: Executive[] = [];
  for (let i = 0; i < EXECUTIVES.candidatesPerSeat; i++) pool.push(generateExecutive(state, seat));
  state.executives.candidates[seat] = pool;
  state.executives.rerolls[seat] = (state.executives.rerolls[seat] ?? 0) + 1;
  return ok({ fee });
}

export function fireExec(state: GameState, seat: ExecSeat): CommandResult<{ severance: number }> {
  const exec = state.executives.seats[seat];
  if (!exec) return fail('That seat is already empty.');
  const severance = execSeverance(exec.salary);
  spend(state, 'execPay', severance);
  vacateSeat(state, seat, 'fired', severance);
  return ok({ severance });
}

export function setExecSalary(state: GameState, seat: ExecSeat, salary: number): CommandResult {
  const exec = state.executives.seats[seat];
  if (!exec) return fail('That seat is empty.');
  if (!Number.isFinite(salary)) return fail('Enter a number.');
  const b = execSalaryBounds(state);
  const s = roundToStep(salary, EXEC_PAY.salaryStep);
  if (s < b.min || s > b.max)
    return fail(`Salary can be set from ${money(b.min)} to ${money(b.max)}.`);
  exec.salary = s;
  return ok();
}

export function setExecDelegation(
  state: GameState,
  seat: ExecSeat,
  id: string,
  on: boolean,
): CommandResult {
  const exec = state.executives.seats[seat];
  if (!exec) return fail('Hire an executive for that seat first.');
  if (!EXEC_SEATS[seat].delegations.some((d) => d.id === id)) return fail('Unknown delegation.');
  exec.delegations[id] = on;
  seedGrowthCities(state);
  // Switching Pay reviews on runs the first review at once.
  if (seat === 'coo' && id === 'payReviews' && on) runPayReview(state);
  return ok();
}

/**
 * Sets the pay premium over market that the COO's Pay reviews aim for
 * (PAY_REVIEW.premiumRange, in premiumStep steps); with Pay reviews on, pay
 * moves to it at once.
 */
export function setPayPremium(state: GameState, premium: number): CommandResult {
  const [lo, hi] = PAY_REVIEW.premiumRange;
  const p = Math.round(premium / PAY_REVIEW.premiumStep) * PAY_REVIEW.premiumStep;
  if (!Number.isFinite(premium) || p < lo - 1e-9 || p > hi + 1e-9)
    return fail(`Pick a premium from ${Math.round(lo * 100)}% to +${Math.round(hi * 100)}%.`);
  state.executives.payPremium = Number(p.toFixed(2));
  if (payReviewsOn(state)) runPayReview(state);
  return ok();
}

/** Marks a city the COO may (or may not) open branches in. Only cities you have been to. */
export function setGrowthCity(state: GameState, cityId: string, on: boolean): CommandResult {
  if (!CITIES[cityId]) return fail('Unknown city.');
  if (!canGrowIn(state, cityId)) return fail('You have not been to this city yet.');
  if (on) state.executives.growthCities[cityId] = true;
  else delete state.executives.growthCities[cityId];
  return ok();
}

/** Asks the COO to open a branch in a city now (their usual pick, needing only the build's cash). */
export function cooOpenBranch(
  state: GameState,
  cityId: string,
): CommandResult<{ branchId: string }> {
  if (!state.executives.seats.coo) return fail('You need a COO to open branches for you.');
  const plan = expansionPlan(state, cityId, false);
  if (plan.blocker || !plan.lot || !plan.build) return fail(plan.blocker ?? 'Nothing to build.');
  const r = buildBranch(state, { lotId: plan.lot.id, build: plan.build, via: 'coo' });
  if (r.ok) state.executives.lastExpansionWeek = state.clock.week;
  return r;
}

/** Most shares one grant may carry: EXEC_PAY.grantMaxPct of shares outstanding. */
export function maxGrantShares(state: GameState): number {
  return Math.floor(state.company.sharesOutstanding * EXEC_PAY.grantMaxPct);
}

/**
 * Adds an equity grant vesting 25% a year. Its grant-date value is expensed
 * weekly over the vesting period (execGrants.ts); RSUs have no strike.
 */
export function addGrant(
  state: GameState,
  seat: ExecSeat,
  type: EquityGrant['type'],
  shares: number,
  strike = 0,
): CommandResult<{ grantId: string }> {
  const exec = state.executives.seats[seat];
  if (!exec) return fail('That seat is empty.');
  if (type !== 'option' && type !== 'rsu') return fail('Pick a stock option or an RSU.');
  const max = maxGrantShares(state);
  if (!Number.isInteger(shares) || shares <= 0 || shares > max)
    return fail(`A grant can carry from 1 to ${max.toLocaleString('en-US')} shares.`);
  if (type === 'option' && !(Number.isFinite(strike) && strike > 0))
    return fail('Set a strike price above zero.');
  const price = state.stock.price;
  const k = type === 'option' ? strike : 0;
  const grantId = newId(state, 'grant');
  exec.grants.push({
    id: grantId,
    type,
    shares,
    strike: k,
    grantWeek: state.clock.week,
    vested: 0,
    exercised: 0,
    fairValue: grantFairValue(type, price, k),
    expensed: 0,
  });
  return ok({ grantId });
}
