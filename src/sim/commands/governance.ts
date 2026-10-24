// Governance commands (DESIGN §5.13, SCREENS §10.2): the quarterly board
// meeting. The player proposes a dividend per share and their CEO salary; the
// board votes on each (governanceVotes.ts). An approved dividend is declared
// and paid GOVERNANCE.payDelayWeeks later; an approved salary takes effect at
// once. The regulator's cap (§15) refuses dividends above it outright.
import { BOARD_VOTE, GOVERNANCE, QUARTERS_PER_YEAR } from '../../config/balance';
import { boardBlocker, declareDividend, quarterLabel } from '../governance';
import {
  ceoMarketSalary,
  dividendApproval,
  dividendCapPerShare,
  forShare,
  insiderShare,
  passes,
  salaryApproval,
} from '../governanceVotes';
import { pushEvent } from '../events';
import { roundToStep } from '../math';
import type { BoardMeeting, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Highest CEO salary the board will consider: ceoMaxMult × the CEO market rate. */
export function maxCeoSalary(state: GameState): number {
  const step = BOARD_VOTE.ceoStep;
  return Math.max(
    state.governance.ceoSalary,
    Math.floor((BOARD_VOTE.ceoMaxMult * ceoMarketSalary(state)) / step) * step,
  );
}

/** Why a proposal can't go to a vote, or undefined. */
export function proposalProblem(
  state: GameState,
  dps: number,
  ceoSalary: number,
): string | undefined {
  if (!Number.isFinite(dps) || dps < 0) return 'Enter a dividend of zero or more.';
  if (!Number.isFinite(ceoSalary) || ceoSalary < 0) return 'Enter a salary of zero or more.';
  const cap = dividendCapPerShare(state);
  if (cap !== null && dps > cap + 1e-9)
    return cap <= 0
      ? 'The regulator forbids dividends in this capital tier.'
      : `The regulator caps this quarter's dividend at $${cap.toFixed(2)} a share.`;
  if (dps > 0 && state.governance.pendingDividend)
    return 'The last dividend has not been paid yet. Propose no dividend this time.';
  const max = maxCeoSalary(state);
  if (ceoSalary > max) return `The board won't consider a salary above ${money(max)}.`;
  return undefined;
}

export function holdBoardMeeting(
  state: GameState,
  dps: number,
  ceoSalary: number,
): CommandResult<{ meeting: BoardMeeting }> {
  const blocked = boardBlocker(state);
  if (blocked) return fail(blocked);
  const d = roundToStep(dps, BOARD_VOTE.dpsStep);
  const salary = roundToStep(ceoSalary, BOARD_VOTE.ceoStep);
  const problem = proposalProblem(state, d, salary);
  if (problem) return fail(problem);

  const g = state.governance;
  const insiders = insiderShare(state);
  const divFor = forShare(insiders, dividendApproval(state, d));
  const payFor = forShare(insiders, salaryApproval(state, salary));
  const meeting: BoardMeeting = {
    week: state.clock.week,
    quarter: quarterLabel(state),
    dividend: { proposed: d, forShare: divFor, passed: passes(divFor) },
    salary: { proposed: salary, forShare: payFor, passed: passes(payFor) },
  };
  g.lastBoardQuarter = meeting.quarter;
  g.lastBoardWeek = meeting.week;
  g.meetings.push(meeting);
  if (g.meetings.length > GOVERNANCE.meetingsKept)
    g.meetings.splice(0, g.meetings.length - GOVERNANCE.meetingsKept);

  if (meeting.dividend.passed) {
    const price = state.stock.price;
    const yieldPct = price > 0 ? ((d * QUARTERS_PER_YEAR) / price) * 100 : 0;
    declareDividend(state, d, yieldPct);
  }
  if (meeting.salary.passed) g.ceoSalary = salary;
  pushEvent(
    state,
    'BOARD_MEETING',
    {
      bank: state.meta.bankName,
      quarter: meeting.quarter,
      dps: d,
      dividendPassed: meeting.dividend.passed,
      salary,
      salaryPassed: meeting.salary.passed,
    },
    3,
  );
  return ok({ meeting });
}
