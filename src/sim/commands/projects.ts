// Frontier project commands (post-C8, SIMULATION §16.14): start a project from
// the Frontier projects panel, or cancel the one under way (what was spent is
// gone). One at a time; the cost is fixed at today's price list when started.
import { FRONTIER_PROJECTS } from '../../config/balance';
import { FRONTIER_PROJECTS_BY_ID } from '../../data/frontierProjects';
import { listPrice } from '../nominal';
import { projectBlock } from '../projects';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Today's price of a project: its base cost on the home price list. */
export function projectPrice(state: GameState, projectId: string): number {
  return listPrice(state, FRONTIER_PROJECTS_BY_ID[projectId]?.cost ?? 0);
}

export function startProject(state: GameState, projectId: string): CommandResult {
  const spec = FRONTIER_PROJECTS_BY_ID[projectId];
  if (!spec) return fail('Unknown project.');
  const block = projectBlock(state, spec);
  if (block === 'ARR too low.')
    return fail(`${spec.name} needs ${money(spec.minArr)} of ARR to start.`);
  if (block) return fail(block);
  const cost = projectPrice(state, projectId);
  const upfront = (cost / spec.weeks) * FRONTIER_PROJECTS.startWeeks;
  if (state.company.cash < upfront)
    return fail(
      `Keep ${money(upfront)} in cash to start: ${FRONTIER_PROJECTS.startWeeks} weeks of payments.`,
    );
  state.projects.active = {
    id: projectId,
    startWeek: state.clock.week,
    cost,
    weeks: spec.weeks,
    weeksDone: 0,
    spent: 0,
  };
  return ok();
}

/** Stops the project under way. Money already spent is gone. */
export function cancelProject(state: GameState): CommandResult {
  if (!state.projects.active) return fail('No project is under way.');
  delete state.projects.active;
  return ok();
}
