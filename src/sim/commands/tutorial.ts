// Tutorial commands (SCREENS §27): store the step the player is on, and the
// tutorial-only nudge that makes sure a business applies at the Loan Desk for
// step 7 "Approve your first business loan". The nudge draws from the normal
// loanDesk RNG stream like any weekly application, so a game stays deterministic
// for the same seed and commands; games that never run the tutorial never call it.
import { TUTORIAL } from '../../data/tutorial';
import { generateApplication } from '../branch/loanDesk';
import { stream } from '../rng';
import type { GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

/** Sets state.flags.tutorialStep (TUTORIAL.offer … TUTORIAL.done). */
export function setTutorialStep(state: GameState, step: number): CommandResult {
  if (!Number.isInteger(step) || step < TUTORIAL.offer || step > TUTORIAL.done) {
    return fail('That is not a tutorial step.');
  }
  state.flags.tutorialStep = step;
  return ok();
}

/**
 * Step 7 only: when none of your branches has an application waiting, one
 * local business applies now at `branchId` (otherwise applications arrive with
 * the weekly tick, which can take a few weeks for a new branch).
 */
export function requestTutorialApplication(
  state: GameState,
  branchId: string,
): CommandResult<{ appId: string }> {
  if (state.flags.tutorialStep !== TUTORIAL.last) return fail('The tutorial is not at that step.');
  const branch = state.branches[branchId];
  if (!branch || branch.status === 'closed') return fail('That branch is not open.');
  if (state.treasury.freeze) return fail('Lending is frozen until liquidity recovers.');
  const ownBranches = new Set(Object.keys(state.branches));
  const waiting = Object.values(state.loanDesk.applications).some((a) =>
    ownBranches.has(a.branchId),
  );
  if (waiting) return fail('An application is already waiting.');
  const app = generateApplication(state, branch, stream(state, 'loanDesk'));
  state.loanDesk.applications[app.id] = app;
  return ok({ appId: app.id });
}
