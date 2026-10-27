// Developer tools' staff switches (SCREENS §26).
// - "Top staff": while flags.devStaff is on, every sales office's staff and
//   every HQ team keeps its skill and morale at DEV_STAFF or better. Applied
//   right after the normal weekly updates (so hires and wages can't pull it
//   down) and once when the switch goes on.
// - "Free top rerolls": while flags.devRerolls is on, manager and executive
//   rerolls cost nothing and every rerolled candidate's skills land in
//   DEV_REROLL, with the asking salary to match.
import { DEV_REROLL, DEV_STAFF } from '../config/balance';
import { askingSalary } from './execCandidates';
import { execMarketSalary } from './execSeats';
import { managerAskingSalary } from './people';
import type { Executive, GameState, Manager } from './state';

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

/** A normal 0–100 roll squeezed into DEV_REROLL, so top candidates still differ. */
export function topSkill(skill: number): number {
  const span = DEV_REROLL.maxSkill - DEV_REROLL.minSkill;
  const k = Math.min(Math.max(skill, 0), 100) / 100;
  return Math.round(DEV_REROLL.minSkill + span * k);
}

/** Lifts a rerolled manager candidate to top skills (and its asking salary). */
export function topManager(state: GameState, mgr: Manager, cityId: string): void {
  if (!state.flags.devRerolls) return;
  const sk = mgr.skills;
  mgr.skills = {
    people: topSkill(sk.people),
    product: topSkill(sk.product),
    marketing: topSkill(sk.marketing),
    ethics: topSkill(sk.ethics),
  };
  mgr.salary = managerAskingSalary(state, cityId, mgr.skills);
}

/** Lifts a rerolled executive candidate to top skills (and its asking salary). */
export function topExecutive(state: GameState, exec: Executive): void {
  if (!state.flags.devRerolls) return;
  exec.leadership = topSkill(exec.leadership);
  exec.expertise = topSkill(exec.expertise);
  exec.loyalty = topSkill(exec.loyalty);
  exec.salary = askingSalary(execMarketSalary(state), exec);
}
