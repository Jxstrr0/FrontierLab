// Insider trading (SIMULATION §22): a personal trade in your own bank's shares
// within INSIDER.windowWeeks before a quarter-end has an INSIDER.prob chance of
// drawing an investigation (stream `insider`). The case resolves at that
// quarter-end: the gain is measured against the share price then, and the
// regulator raises the INSIDER_PROBE incident with its suggested fine.
import { DAYS_PER_WEEK, INSIDER } from '../config/balance';
import { isQuarterStart } from './calendar';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { stream } from './rng';
import type { GameState, InsiderCase } from './state';

/** Weeks a quarter can span, so the search for the next quarter-end always ends. */
const MAX_QUARTER_WEEKS = 14;

/**
 * The week of the next quarter-end tick (the first weekly tick after a quarter
 * closes, when earnings are reported), counted from the tick after now.
 */
export function nextQuarterEndWeek(state: GameState): number {
  const now = state.clock.week;
  for (let w = now + 1; w <= now + MAX_QUARTER_WEEKS; w++) {
    if (isQuarterStart(state.meta.startDate, w * DAYS_PER_WEEK)) return w;
  }
  return now + MAX_QUARTER_WEEKS;
}

/** True when a trade now falls inside the window before a quarter-end. */
export function inInsiderWindow(state: GameState): boolean {
  return nextQuarterEndWeek(state) - state.clock.week <= INSIDER.windowWeeks;
}

/**
 * Called after a personal trade in your own shares (commands/markets.ts):
 * `shares` > 0 for a buy, < 0 for a sale. Inside the window, a hit opens a case.
 */
export function insiderTrade(state: GameState, shares: number, price: number): void {
  if (shares === 0 || !inInsiderWindow(state)) return;
  if (!stream(state, 'insider').chance(INSIDER.prob)) return;
  const c: InsiderCase = {
    week: state.clock.week,
    side: shares > 0 ? 'buy' : 'sell',
    shares: Math.abs(shares),
    price,
    resolveWeek: nextQuarterEndWeek(state),
  };
  state.personal.empire.insider.pending.push(c);
}

/** §22: the trade's gain at the resolution price — buys gain on a rise, sales on a fall; never below 0. */
export function insiderGain(c: InsiderCase, priceNow: number): number {
  const perShare = c.side === 'buy' ? priceNow - c.price : c.price - priceNow;
  return Math.max(0, c.shares * perShare);
}

/** §22: the suggested settlement = max(INSIDER.fineMult × gain, INSIDER.fineMin). */
export const insiderFine = (gain: number) => Math.max(INSIDER.fineMult * gain, INSIDER.fineMin);

/** Quarter-end (tick step 13): cases due now raise one probe for their combined gain. */
export function insiderQuarter(state: GameState): void {
  const ins = state.personal.empire.insider;
  const week = state.clock.week;
  const due = ins.pending.filter((c) => c.resolveWeek <= week);
  if (due.length === 0) return;
  ins.pending = ins.pending.filter((c) => c.resolveWeek > week);
  const price = state.stock.price;
  const gain = due.reduce((t, c) => t + insiderGain(c, price), 0);
  const shares = due.reduce((t, c) => t + c.shares, 0);
  const fine = insiderFine(gain);
  const inc = raiseIncident(state, 'INSIDER_PROBE', 'personal', 'personal', {
    company: state.meta.bankName,
    fine,
    gain,
    shares,
  });
  if (inc)
    pushEvent(
      state,
      'INSIDER_PROBE_OPENED',
      { shares, side: due[0]!.side, fine, founder: state.meta.founderName },
      2,
    );
}
