// Generated ids: a prefix plus the state's monotonic counter ('br_12').
import type { GameState } from './state';

export function newId(state: Pick<GameState, 'nextId'>, prefix: string): string {
  state.nextId += 1;
  return `${prefix}_${state.nextId}`;
}
