// Runs the tutorial against the live game (SCREENS §27). Watches the game and
// the open panel and modal, and moves state.flags.tutorialStep on through the
// setTutorialStep command when the step machine (steps.ts) says the player did
// the thing. Side effects kept here: pausing the clock where a step needs
// reading (the start and the loan step), asking for a tutorial application on
// step 7, and opening the weekly results on step 5 when the player has them
// switched off. The "seen" preference is written when the tutorial ends.
import { effect, signal } from '@preact/signals';
import { TUTORIAL, TUTORIAL_TEXT } from '../../data/tutorial';
import * as cmd from '../../sim/commands';
import { pause } from '../loop';
import { loadTutorialSeen, saveTutorialSeen } from '../saves';
import { act, bump, modal, panel, peekGame, rev, toast } from '../store';
import { observe } from './observe';
import {
  alreadyDone,
  enterStep,
  focusBranch,
  isActiveStep,
  isDone,
  needsApplication,
  nextStep,
  shouldOpenWeekly,
  updateMemo,
  type StepMemo,
} from './steps';

/** The current step's memo; null when no step is running. */
export const tutorialMemo = signal<StepMemo | null>(null);

let scheduled = false;
/** Game day of the last tutorial application request, so a failed one isn't retried every frame. */
let askedDay = -1;

/** Starts watching the game; returns the stop function (GameScreen mounts it). */
export function watchTutorial(): () => void {
  tutorialMemo.value = null;
  askedDay = -1;
  const stop = effect(() => {
    void rev.value;
    void panel.value;
    void modal.value;
    schedule();
  });
  return () => {
    stop();
    tutorialMemo.value = null;
  };
}

/** Evaluates after the current update, so commands never run inside a signal effect. */
function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    evaluate();
  });
}

function evaluate(): void {
  const s = peekGame();
  const step = s?.flags.tutorialStep;
  if (!s || !isActiveStep(step)) {
    if (tutorialMemo.peek()) tutorialMemo.value = null;
    return;
  }
  const obs = observe(s, panel.peek(), modal.peek());
  let memo = tutorialMemo.peek();
  if (!memo || memo.step !== step) {
    memo = enterStep(step, obs);
    tutorialMemo.value = memo;
    // Reading steps start paused; step 5 is where the player starts the clock.
    if (step === TUTORIAL.first || step === TUTORIAL.last) pause();
    if (alreadyDone(memo, obs)) return goTo(nextStep(step));
  }
  memo = updateMemo(memo, obs);
  if (memo !== tutorialMemo.peek()) tutorialMemo.value = memo;
  if (isDone(memo, obs)) return goTo(nextStep(step));

  if (shouldOpenWeekly(memo, obs)) modal.value = { type: 'weekly', week: obs.week - 1 };
  if (needsApplication(memo, obs) && askedDay !== s.clock.day) {
    askedDay = s.clock.day;
    const branch = focusBranch(obs);
    if (branch && cmd.requestTutorialApplication(s, branch.id).ok) bump();
  }
}

function goTo(step: number): void {
  act(cmd.setTutorialStep, step);
  if (step >= TUTORIAL.finale) saveTutorialSeen(true);
}

/** The step a new game starts on: first-timers go straight in, returning players are asked. */
export function initialTutorialStep(): number {
  return loadTutorialSeen() ? TUTORIAL.offer : TUTORIAL.first;
}

export function acceptTutorial(): void {
  goTo(TUTORIAL.first);
}

export function skipTutorial(): void {
  goTo(TUTORIAL.done);
  toast(TUTORIAL_TEXT.skipped);
}

/** Closes the finale card, or answers "No thanks" to the offer. */
export function finishTutorial(): void {
  goTo(TUTORIAL.done);
}

/** Settings → Replay tutorial: back to step 1 in the current game. */
export function replayTutorial(): void {
  tutorialMemo.value = null;
  goTo(TUTORIAL.first);
}
