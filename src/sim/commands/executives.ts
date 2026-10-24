// Executive commands (SIMULATION §17.2, SCREENS §10.1): hire from a seat's
// candidate pool, fire (severance in weeks of salary, P&L execPay), set salary,
// switch delegations and add stock option or RSU grants. All need an Executive
// floor at HQ.
import { EXEC_PAY, EXECUTIVES, WEEKS_PER_YEAR } from '../../config/balance';
import { EXEC_SEATS } from '../../data/executives';
import { grantFairValue } from '../execGrants';
import { seatExecutive, vacateSeat } from '../execSeatChanges';
import { execMarketSalary, hasExecFloor } from '../execSeats';
import { newId } from '../ids';
import { spend } from '../ledger';
import { roundToStep } from '../math';
import type { EquityGrant, ExecSeat, GameState } from '../state';
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
  return ok();
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
  return ok();
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
