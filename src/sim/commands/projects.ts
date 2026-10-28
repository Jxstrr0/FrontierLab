// Frontier project commands (post-C8, SIMULATION §16.14): start a project from
// the Frontier projects panel, or cancel the one under way (what was spent is
// gone). One at a time; the cost is fixed at today's price list when started.
import { FRONTIER_PROJECTS } from '../../config/balance';
import { FRONTIER_PROJECTS_BY_ID } from '../../data/frontierProjects';
import { beginProject, projectBlock, projectPrice, projectUpfront } from '../projects';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

export { projectPrice };

export function startProject(state: GameState, projectId: string): CommandResult {
  const spec = FRONTIER_PROJECTS_BY_ID[projectId];
  if (!spec) return fail('Unknown project.');
  const block = projectBlock(state, spec);
  if (block === 'ARR too low.')
    return fail(`${spec.name} needs ${money(state, spec.minArr)} of ARR to start.`);
  if (block) return fail(block);
  const upfront = projectUpfront(state, spec);
  if (state.company.cash < upfront)
    return fail(
      `Keep ${money(state, upfront)} in cash to start: ${FRONTIER_PROJECTS.startWeeks} weeks of payments.`,
    );
  beginProject(state, spec);
  return ok();
}

/** Stops the project under way. Money already spent is gone. */
export function cancelProject(state: GameState): CommandResult {
  if (!state.projects.active) return fail('No project is under way.');
  delete state.projects.active;
  return ok();
}
