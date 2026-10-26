// Governance (DESIGN §5.13): the quarterly board meeting's calendar, declared
// dividends and their payment. A declared dividend leaves retained earnings at
// once and sits as dividends payable (a liability) until GOVERNANCE.payDelayWeeks
// later, when the company pays it in cash (financing) and the founder's share
// lands in personal cash. Votes and caps are in governanceVotes.ts; the meeting
// itself is the holdBoardMeeting command.
import { GOVERNANCE } from '../config/balance';
import { dateOf, quarterOf } from './calendar';
import { hasExecFloor } from './execSeats';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { postCash } from './ledger';
import { FOUNDER_ID, sharesHeld } from './shares';
import type { GameState } from './state';

/** The calendar quarter today falls in, e.g. "Q2 2027". */
export function quarterLabel(state: GameState): string {
  const d = dateOf(state.meta.startDate, state.clock.day);
  return `Q${quarterOf(d)} ${d.getUTCFullYear()}`;
}

/** Why the board can't meet right now, or undefined when it can. */
export function boardBlocker(state: GameState): string | undefined {
  if (state.flags.gameOver) return 'The lab is no longer yours to run.';
  if (!hasExecFloor(state)) return 'The board meets on the Executive floor. Add one at HQ first.';
  if (state.governance.lastBoardQuarter === quarterLabel(state))
    return `The board already met this quarter (${quarterLabel(state)}).`;
  return undefined;
}

/** True once per quarter while there is an Executive floor (the reminder's trigger). */
export const boardDue = (state: GameState): boolean => boardBlocker(state) === undefined;

/**
 * An approved dividend: retained earnings fall now, dividends payable rise, and
 * the payment is scheduled; DIVIDEND_DUE reminds the player to keep the cash.
 */
export function declareDividend(state: GameState, dps: number, yieldPct: number): void {
  const g = state.governance;
  const prevDps = g.dividendPerShare;
  g.dividendPerShare = dps;
  if (dps <= 0) return;
  const total = dps * state.company.sharesOutstanding;
  const week = state.clock.week;
  const payWeek = week + GOVERNANCE.payDelayWeeks;
  state.company.retainedEarnings -= total;
  g.pendingDividend = { perShare: dps, total, declaredWeek: week, payWeek };
  pushEvent(
    state,
    'DIVIDEND_DECLARED',
    { bank: state.meta.bankName, dps, prevDps, total, payWeek, yieldPct },
    2,
  );
  raiseIncident(state, 'DIVIDEND_DUE', 'company', 'company', { amount: total });
}

/** Tick step 8: pays a declared dividend when due, even if cash runs short (§14). */
export function runGovernance(state: GameState): void {
  const due = state.governance.pendingDividend;
  if (!due || state.clock.week < due.payWeek) return;
  postCash(state, -due.total, 'financing');
  const personal = sharesHeld(state, FOUNDER_ID) * due.perShare;
  state.personal.cash += personal;
  delete state.governance.pendingDividend;
  pushEvent(
    state,
    'DIVIDEND_PAID',
    { bank: state.meta.bankName, dps: due.perShare, total: due.total, personal },
    3,
  );
}

/**
 * Quarter-end: the board meeting unlocks for the new quarter. Meetings are
 * keyed by quarter label, so there is nothing to reset here.
 */
export function governanceQuarter(_state: GameState): void {}
