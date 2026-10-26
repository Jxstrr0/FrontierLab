// The order of the HQ bottom tabs (SCREENS §10): the departments you arranged
// in the Office sheet (settings.hqTabOrder) first, then any others in
// DEPT_ORDER, so a floor added later slots in where it always did. Pure reads;
// moveHqTab and resetHqTabOrder in commands/settings.ts change the order.
import { DEPARTMENTS, DEPT_ORDER } from '../data/departments';
import { deptDesks } from './hq';
import type { DeptId, GameState } from './state';

/** Every department in tab order, whether or not it has a floor. */
export function hqTabOrder(state: GameState): DeptId[] {
  const chosen = (state.settings.hqTabOrder ?? []).filter((d) => d in DEPARTMENTS);
  return [...new Set([...chosen, ...DEPT_ORDER])];
}

/** The departments with at least one floor, in tab order. */
export function visibleHqTabs(state: GameState): DeptId[] {
  return hqTabOrder(state).filter((d) => deptDesks(state, d) > 0);
}
