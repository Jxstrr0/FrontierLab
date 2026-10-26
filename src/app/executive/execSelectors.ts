// Read-only views for the Executive floor (SCREENS §10, §10.1, §10.2): the board
// card's lines, the eight seats, an executive's grants with vesting progress,
// the 4-year vesting preview and the board meeting's figures. Nothing here
// mutates GameState.
import { BOARD_VOTE, EXEC_PAY, EXECUTIVES, QUARTERS_PER_YEAR } from '../../config/balance';
import { EXEC_SEAT_ORDER, EXEC_SEATS } from '../../data/executives';
import { DAYS_PER_WEEK } from '../../config/balance';
import { execSalaryBounds, maxCeoSalary } from '../../sim/commands';
import { VEST_WEEKS, grantFairValue, vestedAfter } from '../../sim/execGrants';
import { delegationOn } from '../../sim/execSeats';
export { execRerollFee } from '../../sim/candidateRerolls';
import { boardBlocker, quarterLabel } from '../../sim/governance';
import {
  ceoMarketSalary,
  cfoDividendProposal,
  dividendCapNote,
  dividendCapPerShare,
  payoutRatio,
} from '../../sim/governanceVotes';
import { netIncomeTtm } from '../../sim/valuation';
import type { EquityGrant, ExecSeat, Executive, GameState } from '../../sim/state';
import { gameDate } from '../format/format';

export const SEATS = EXEC_SEAT_ORDER;

export const dayOf = (week: number) => week * DAYS_PER_WEEK;

export interface BoardCardView {
  canMeet: boolean;
  blocker?: string;
  quarter: string;
  lastMeeting?: string;
  dps: number;
  ceoSalary: number;
  pending?: { total: number; perShare: number; payDate: string };
}

export function boardCard(s: GameState): BoardCardView {
  const g = s.governance;
  const blocker = boardBlocker(s);
  const view: BoardCardView = {
    canMeet: !blocker,
    quarter: quarterLabel(s),
    dps: g.dividendPerShare,
    ceoSalary: g.ceoSalary,
  };
  if (blocker) view.blocker = blocker;
  if (g.lastBoardWeek !== undefined && g.lastBoardQuarter)
    view.lastMeeting = `${gameDate(s.meta.startDate, dayOf(g.lastBoardWeek))} (${g.lastBoardQuarter})`;
  if (g.pendingDividend) {
    view.pending = {
      total: g.pendingDividend.total,
      perShare: g.pendingDividend.perShare,
      payDate: gameDate(s.meta.startDate, dayOf(g.pendingDividend.payWeek)),
    };
  }
  return view;
}

/** Vesting progress of a grant, 0–1, by time since grant. */
export function vestProgress(s: GameState, g: EquityGrant): number {
  return Math.min(1, Math.max(0, (s.clock.week - g.grantWeek) / VEST_WEEKS));
}

export interface VestRow {
  year: number;
  date: string;
  shares: number;
  cumulative: number;
}

/** The 4-year vesting preview: shares vesting on each anniversary from this week. */
export function vestingPreview(s: GameState, shares: number): VestRow[] {
  const rows: VestRow[] = [];
  for (let y = 1; y <= EXECUTIVES.vestYears; y++) {
    const cumulative = vestedAfter(shares, y);
    rows.push({
      year: y,
      date: gameDate(
        s.meta.startDate,
        dayOf(s.clock.week + (y * VEST_WEEKS) / EXECUTIVES.vestYears),
      ),
      shares: cumulative - vestedAfter(shares, y - 1),
      cumulative,
    });
  }
  return rows;
}

/** Total cost a grant will expense over its vesting period. */
export function grantCost(
  s: GameState,
  type: EquityGrant['type'],
  shares: number,
  strike: number,
): number {
  return shares * grantFairValue(type, s.stock.price, type === 'option' ? strike : 0);
}

/** Salary stepper for an executive. */
export function execSalaryStepper(s: GameState) {
  return { ...execSalaryBounds(s), step: EXEC_PAY.salaryStep };
}

/** Advisor lines for the floor (used by the HQ panel's advisor bar). */
export function executiveAdvisor(s: GameState): string[] {
  const empty = SEATS.filter((seat) => !s.executives.seats[seat]);
  const lines: string[] = [];
  if (!boardBlocker(s)) lines.push(`The board is ready to meet for ${quarterLabel(s)}.`);
  if (empty.length === SEATS.length)
    lines.push('Every executive seat is empty. Tap a seat to hire.');
  else if (empty.length > 0)
    lines.push(`Still to hire: ${empty.map((seat) => EXEC_SEATS[seat].short).join(', ')}.`);
  if (s.governance.pendingDividend)
    lines.push('A declared dividend is due soon. Keep the cash on hand.');
  return lines.length > 0 ? lines : ['The executive team is complete.'];
}

/** How many delegations an executive has switched on. */
export function delegationsOn(s: GameState, exec: Executive): number {
  return EXEC_SEATS[exec.seat].delegations.filter((d) => delegationOn(s, exec.seat, d.id)).length;
}

export interface MeetingView {
  price: number;
  shares: number;
  netIncomeTtm: number;
  cap: number | null;
  capNote?: string;
  proposal: number;
  cfoProposes: boolean;
  ceoMarket: number;
  ceoMax: number;
}

export function meetingView(s: GameState): MeetingView {
  const cfo = delegationOn(s, 'cfo', 'dividends');
  const view: MeetingView = {
    price: s.stock.price,
    shares: s.company.sharesOutstanding,
    netIncomeTtm: netIncomeTtm(s),
    cap: dividendCapPerShare(s),
    proposal: cfo ? cfoDividendProposal(s) : s.governance.dividendPerShare,
    cfoProposes: cfo,
    ceoMarket: ceoMarketSalary(s),
    ceoMax: maxCeoSalary(s),
  };
  const note = dividendCapNote(s);
  if (note) view.capNote = note;
  if (view.cap !== null) view.proposal = Math.min(view.proposal, view.cap);
  return view;
}

/** Annual yield of a quarterly dividend at today's price. */
export function dividendYield(s: GameState, dps: number): number {
  return s.stock.price > 0 ? (dps * QUARTERS_PER_YEAR) / s.stock.price : 0;
}

export const payout = (s: GameState, dps: number) =>
  netIncomeTtm(s) > 0 ? payoutRatio(s, dps) : null;

export const DPS_STEP = BOARD_VOTE.dpsStep;
export const CEO_STEP = BOARD_VOTE.ceoStep;

export const seatSpec = (seat: ExecSeat) => EXEC_SEATS[seat];
