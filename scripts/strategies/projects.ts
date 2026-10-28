// Frontier projects for scripted strategies (§16.14): with no project under
// way, start the first one in list order that can start, once cash holds
// CASH_MULT times its price, so the late game's cash has somewhere to go. When
// the regulator's tier slips to Watch or worse, the Safety Institute goes first.
import { FRONTIER_PROJECT_LIST } from '../../src/data/frontierProjects';
import * as cmd from '../../src/sim/commands';
import { projectBlock } from '../../src/sim/projects';
import type { GameState } from '../../src/sim/state';

/** Start a project only with this many times its price in cash. */
const CASH_MULT = 2;

/** Tiers at which a strategy builds the Safety Institute before anything else. */
const SAFETY_FIRST = new Set(['watch', 'restricted', 'critical']);

export function manageProjects(state: GameState): void {
  if (state.projects.active) return;
  const order = SAFETY_FIRST.has(state.company.tier)
    ? [...FRONTIER_PROJECT_LIST].sort((a, b) => +(b.id === 'institute') - +(a.id === 'institute'))
    : FRONTIER_PROJECT_LIST;
  for (const spec of order) {
    if (projectBlock(state, spec)) continue;
    if (state.company.cash < CASH_MULT * cmd.projectPrice(state, spec.id)) return;
    cmd.startProject(state, spec.id);
    return;
  }
}
