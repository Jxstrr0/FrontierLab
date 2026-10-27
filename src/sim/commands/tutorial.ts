// Tutorial commands (SCREENS §27): store the Part 1 step the player is on and
// the Part 2 guide in progress and the ones seen, and the
// tutorial-only nudge that makes sure a business asks the Deal Desk for a
// proposal for step 7 "Win your first contract". The nudge picks the first
// business without a vendor in the office's city, with no randomness, so a game
// stays deterministic; games that never run the tutorial never call it.
import { CHAPTERS, isChapterId, isLessonId } from '../../data/lessons';
import { TUTORIAL } from '../../data/tutorial';
import { DEAL } from '../../config/balance';
import { businessesIn } from '../businesses';
import { newId } from '../ids';
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
 * Step 7 only: when none of your offices has a new RFP waiting, the first
 * business in the city without an AI vendor asks `branchId` for a proposal now
 * (otherwise RFPs arrive with the weekly tick, which can take a few weeks).
 */
export function requestTutorialApplication(
  state: GameState,
  branchId: string,
): CommandResult<{ appId: string }> {
  if (state.flags.tutorialStep !== TUTORIAL.loan) return fail('The tutorial is not at that step.');
  const branch = state.branches[branchId];
  if (!branch || branch.status === 'closed') return fail('That sales office is not open.');
  const waiting = Object.values(state.dealDesk.rfps).some((r) => r.kind === 'new');
  if (waiting) return fail('A request is already waiting.');
  const taken = new Set(Object.values(state.dealDesk.rfps).map((r) => r.businessId));
  const b = businessesIn(state, branch.cityId).find((x) => !x.vendor && !taken.has(x.id));
  if (!b) return fail('Every business in the city already has an AI vendor.');
  const id = newId(state, 'rfp');
  state.dealDesk.rfps[id] = {
    id,
    branchId,
    businessId: b.id,
    kind: 'new',
    createdWeek: state.clock.week,
    dueWeek: state.clock.week + DEAL.expiryWeeks,
  };
  return ok({ appId: id });
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
