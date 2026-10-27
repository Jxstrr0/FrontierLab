// Developer tools' "Top staff" switch (SCREENS §26): while flags.devStaff is on,
// every sales office's staff and every HQ team keeps its skill and morale at
// DEV_STAFF or better, so a high-staff game can be tested. Applied right after
// the normal weekly updates (so hires and wages can't pull it down) and once
// when the switch goes on.
import { DEV_STAFF } from '../config/balance';
import type { GameState } from './state';

/** Raises one team's skill and morale to the floor; leaves higher values alone. */
export function holdTopStaff(state: GameState, team: { skill: number; morale: number }): void {
  if (!state.flags.devStaff) return;
  team.skill = Math.max(team.skill, DEV_STAFF.skill);
  team.morale = Math.max(team.morale, DEV_STAFF.morale);
}

/** Applies the floor to every team now. */
export function holdAllTopStaff(state: GameState): void {
  for (const b of Object.values(state.branches)) holdTopStaff(state, b.staff);
  for (const d of Object.values(state.departments)) if (d) holdTopStaff(state, d);
}
