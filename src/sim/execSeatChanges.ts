// Filling and emptying executive seats (SIMULATION §17.2), shared by the
// executive commands and the EXEC_POACHED incident: a hire takes a candidate
// out of the pool; leaving settles grants (in-the-money vested options are
// exercised, the rest lapse) and emits EXEC_RESIGNED or EXEC_FIRED.
import { EXEC_SEATS } from '../data/executives';
import { settleOnExit } from './execGrants';
import { pushEvent } from './events';
import type { ExecSeat, Executive, GameState } from './state';

/** Seats a candidate: hired this week, out of the pool; a CTO hire is remembered (§16.9). */
export function seatExecutive(state: GameState, exec: Executive): void {
  const ex = state.executives;
  ex.candidates[exec.seat] = (ex.candidates[exec.seat] ?? []).filter((c) => c.id !== exec.id);
  exec.hiredWeek = state.clock.week;
  ex.seats[exec.seat] = exec;
  if (exec.seat === 'cto') ex.hadCto = true;
  pushEvent(
    state,
    'EXEC_HIRED',
    { seat: exec.seat, title: EXEC_SEATS[exec.seat].title, name: exec.name },
    3,
  );
}

/** Empties a seat and records why. */
export function vacateSeat(
  state: GameState,
  seat: ExecSeat,
  how: 'resigned' | 'fired',
  severance = 0,
): void {
  const exec = state.executives.seats[seat];
  if (!exec) return;
  settleOnExit(state, exec);
  delete state.executives.seats[seat];
  const base = { seat, title: EXEC_SEATS[seat].title, name: exec.name };
  if (how === 'fired') pushEvent(state, 'EXEC_FIRED', { ...base, severance }, 2);
  else pushEvent(state, 'EXEC_RESIGNED', { ...base, bank: state.meta.bankName }, 2);
}
