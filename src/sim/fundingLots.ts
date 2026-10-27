// Wholesale funding lots (SIMULATION §13.6): liabilities bought from the funding
// market. Each lot pays fixed-rate interest weekly from corporate cash and, at
// maturity, is repaid from liquid assets (reserves). Offer generation lives in
// fundingMarket.ts; this module only needs plain state, so treasury.ts can use it.
import { WEEKS_PER_YEAR } from '../config/balance';
import { pushEvent } from './events';
import { spend } from './ledger';
import type { FundingLot, GameState } from './state';

/** Outstanding wholesale funding bought as lots (excludes overnight and window). */
export function lotsOutstanding(state: GameState): number {
  return state.treasury.lots.reduce((sum, l) => sum + l.amount, 0);
}

/** Every wholesale liability: overnight, central bank window and market lots (§14.4). */
export function totalWholesale(state: GameState): number {
  const t = state.treasury;
  return t.overnight + t.window + lotsOutstanding(state);
}

/** Weekly interest on every lot at its fixed rate. */
export function lotInterestWeekly(state: GameState): number {
  return state.treasury.lots.reduce((sum, l) => sum + (l.amount * l.rate) / WEEKS_PER_YEAR, 0);
}

/** §13.6: lot interest is paid weekly from corporate cash. */
export function payLotInterest(state: GameState): void {
  const interest = lotInterestWeekly(state);
  if (interest > 0) spend(state, 'wholesaleInterest', interest);
}

/** §13.6 maturity: L −= amount for each lot due this week. §13.5 runs afterwards. */
export function matureLots(state: GameState): FundingLot[] {
  const t = state.treasury;
  const due = t.lots.filter((l) => l.maturityWeek <= state.clock.week);
  if (due.length === 0) return due;
  t.lots = t.lots.filter((l) => l.maturityWeek > state.clock.week);
  for (const lot of due) {
    t.reserves -= lot.amount;
    pushEvent(
      state,
      'FUNDING_MATURED',
      { lotId: lot.id, type: lot.type, counterparty: lot.counterparty, amount: lot.amount },
      4,
    );
  }
  return due;
}
