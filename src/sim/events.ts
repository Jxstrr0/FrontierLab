// The weekly event log: systems push typed events during a tick, and the
// weekly results and (later) The Weekly Ledger read them (CLAUDE.md, News and events).
import { EVENT_LOG_WEEKS } from '../config/balance';
import type { GameEvent, GameState } from './state';

export function pushEvent(
  state: GameState,
  type: string,
  payload: Record<string, unknown>,
  priority = 5,
  scope?: string,
): void {
  const event: GameEvent = { week: state.clock.week, type, payload, priority };
  if (scope) event.scope = scope;
  state.events.log.push(event);
}

/** Drops events older than the retention window. */
export function trimEvents(state: GameState): void {
  const minWeek = state.clock.week - EVENT_LOG_WEEKS;
  state.events.log = state.events.log.filter((e) => e.week >= minWeek);
}
