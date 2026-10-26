// Tutorial commands (SCREENS §27): store the Part 1 step the player is on and
// the Part 2 guide in progress and the ones seen, and the
// tutorial-only nudge that makes sure a business applies at the Loan Desk for
// step 7 "Approve your first business loan". The nudge draws from the normal
// loanDesk RNG stream like any weekly application, so a game stays deterministic
// for the same seed and commands; games that never run the tutorial never call it.
import { CHAPTERS, isChapterId, isLessonId } from '../../data/lessons';
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
  if (state.flags.tutorialStep !== TUTORIAL.loan) return fail('The tutorial is not at that step.');
  const branch = state.branches[branchId];
  if (!branch || branch.status === 'closed') return fail('That sales office is not open.');
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

/** Part 2 (SCREENS §27.2): starts a guide, or moves it to `step`. */
export function setLesson(state: GameState, id: string, step: number): CommandResult {
  if (!isChapterId(id)) return fail('That is not a guide.');
  if (!Number.isInteger(step) || step < 0 || step >= CHAPTERS[id].steps.length) {
    return fail('That guide has no such step.');
  }
  state.flags.lesson = { id, step };
  return ok();
}

/** Marks a guide or first-look tip as seen (finished or skipped); it never shows again. */
export function finishLesson(state: GameState, id: string): CommandResult {
  if (!isLessonId(id)) return fail('That is not a guide or tip.');
  if (state.flags.lesson?.id === id) delete state.flags.lesson;
  if (!state.flags.lessonsDone.includes(id)) state.flags.lessonsDone.push(id);
  return ok();
}

/** Settings → Show the guides again: every guide and tip can show once more. */
export function resetLessons(state: GameState): CommandResult {
  state.flags.lessonsDone = [];
  delete state.flags.lesson;
  return ok();
}
