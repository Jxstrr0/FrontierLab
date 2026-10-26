// Runs tutorial Part 2 against the live game (SCREENS §27.2): starts a guide
// when one is due (pausing the clock so you can read it), moves it on through
// the setLesson command when the machine in lessons.ts says you did the step,
// and shows a first-look tip on each new screen, marking it seen with
// finishLesson when you tap "Got it" or move on. Called by controller.ts
// whenever Part 1 is not running.
import { signal } from '@preact/signals';
import { CHAPTERS, CHAPTER_COVERS, LESSON_TEXT, type ChapterId } from '../../data/lessons';
import * as cmd from '../../sim/commands';
import type { GameState } from '../../sim/state';
import { pause } from '../loop';
import { act, modal, panel, sheet, toast } from '../store';
import {
  activeChapter,
  chapterObsolete,
  chapterStepDone,
  chapterToStart,
  enterChapterStep,
  guidesActive,
  tipFor,
  updateChapterMemo,
  type ChapterMemo,
} from './lessons';
import { observeLessons } from './observe';

/** The guide step on screen; null when no guide runs. */
export const chapterMemo = signal<ChapterMemo | null>(null);
/** The first-look tip on screen. */
export const tipShown = signal<string | null>(null);

export function resetLessonView(): void {
  chapterMemo.value = null;
  tipShown.value = null;
}

export function evaluateLessons(s: GameState): void {
  const o = observeLessons(s, panel.peek(), modal.peek(), sheet.peek());
  const chapter = activeChapter(o);
  if (!chapter) {
    if (chapterMemo.peek()) chapterMemo.value = null;
    const start = chapterToStart(o);
    if (start) {
      act(cmd.setLesson, start, 0);
      pause();
      return;
    }
  } else {
    if (chapterObsolete(chapter.id, o)) {
      act(cmd.finishLesson, chapter.id);
      return;
    }
    let memo = chapterMemo.peek();
    if (!memo || memo.id !== chapter.id || memo.step !== chapter.step) {
      memo = enterChapterStep(chapter.id, chapter.step, o);
    }
    memo = updateChapterMemo(memo, o);
    if (memo !== chapterMemo.peek()) chapterMemo.value = memo;
    if (chapterStepDone(memo, o)) {
      nextChapterStep(chapter.id, chapter.step);
      return;
    }
  }

  // A tip you have moved on from counts as seen.
  const tip = tipFor(o) ?? null;
  const shown = tipShown.peek();
  if (shown && shown !== tip && guidesActive(o)) act(cmd.finishLesson, shown);
  if (tip !== shown) tipShown.value = tip;
}

function nextChapterStep(id: ChapterId, step: number): void {
  if (step + 1 < CHAPTERS[id].steps.length) {
    act(cmd.setLesson, id, step + 1);
    return;
  }
  act(cmd.finishLesson, id);
  for (const tip of CHAPTER_COVERS[id] ?? []) act(cmd.finishLesson, tip);
}

/** "Got it" on a guide step that asks for it. */
export function ackChapterStep(): void {
  const m = chapterMemo.peek();
  if (m) nextChapterStep(m.id, m.step);
}

export function skipChapter(): void {
  const m = chapterMemo.peek();
  if (!m) return;
  act(cmd.finishLesson, m.id);
  toast(LESSON_TEXT.skipped);
}

/** "Got it" on a first-look tip. */
export function dismissTip(): void {
  const id = tipShown.peek();
  if (!id) return;
  act(cmd.finishLesson, id);
}
