// Incident commands (SIMULATION §23, SCREENS §22): answer an open case with one
// of its options. Costs, effects and news follow the incident's rule.
import { optionBlocker, resolveWith } from '../incidents';
import type { GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

/**
 * Resolves an open incident with the chosen option. `outcome` describes how a
 * chancy option turned out (an appeal, a public statement), when it has one.
 */
export function resolveIncident(
  state: GameState,
  incidentId: string,
  optionId: string,
): CommandResult<{ outcome?: string }> {
  if (state.flags.gameOver) return fail('The game is over.');
  const inc = state.incidents.active.find((i) => i.id === incidentId);
  if (!inc) return fail('That case is already closed.');
  const blocker = optionBlocker(state, inc, optionId);
  if (blocker) return fail(blocker);
  const outcome = resolveWith(state, inc, optionId, 'you');
  return outcome ? ok({ outcome }) : ok({});
}
