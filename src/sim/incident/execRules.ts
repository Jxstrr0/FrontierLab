// Governance incidents (CONTENT §22): EXEC_POACHED, raised by an executive's
// weekly resignation roll (§17.2, scope = the seat), and DIVIDEND_DUE, the
// information case raised when the board declares a dividend (DESIGN §5.13).
import { EXEC_PAY, EXECUTIVES } from '../../config/balance';
import { EXEC_SEATS } from '../../data/executives';
import { vacateSeat } from '../execSeatChanges';
import { clamp, roundToStep } from '../math';
import type { ExecSeat, GameState, Incident } from '../state';
import type { IncidentRule } from './helpers';

const LOYALTY_MAX = 100;

/** The executive the case is about, if still in the seat it names. */
function target(state: GameState, inc: Incident) {
  const seat = String(inc.data.seat ?? inc.scope) as ExecSeat;
  const exec = state.executives.seats[seat];
  return exec && (inc.data.execId === undefined || exec.id === inc.data.execId) ? exec : undefined;
}

export const EXEC_POACHED: IncidentRule = {
  prepare(state, scope, data) {
    // Forced from debug tools with a generic scope: pick the first seated executive.
    const seat =
      (typeof data.seat === 'string' && data.seat) ||
      (scope in EXEC_SEATS ? scope : Object.keys(state.executives.seats)[0]);
    const exec = seat ? state.executives.seats[seat as ExecSeat] : undefined;
    data.seat = seat ?? '';
    if (exec) {
      data.execId ??= exec.id;
      data.name ??= exec.name;
      data.title ??= EXEC_SEATS[exec.seat].title;
    }
    data.name ??= 'an executive';
    data.title ??= 'executive';
    const rival = Object.values(state.rivals)
      .filter((r) => r.status === 'active')
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    data.rival ??= rival?.name ?? 'A rival lab';
  },
  costs: () => ({ counter: 0, release: 0 }),
  apply(state, inc, optionId) {
    const exec = target(state, inc);
    if (!exec) return 'They had already left.';
    if (optionId === 'counter') {
      exec.salary = roundToStep(exec.salary * (1 + EXECUTIVES.counterRaise), EXEC_PAY.salaryStep);
      exec.loyalty = clamp(exec.loyalty + EXECUTIVES.counterLoyalty, 0, LOYALTY_MAX);
      return `${exec.name} stays on.`;
    }
    vacateSeat(state, exec.seat, 'resigned');
    return `${exec.name} has left for ${String(inc.data.rival)}.`;
  },
};

export const DIVIDEND_DUE: IncidentRule = {
  costs: () => ({ ok: 0 }),
  apply: () => undefined,
};
