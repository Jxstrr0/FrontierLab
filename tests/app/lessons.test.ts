// Tutorial Part 2 (src/app/tutorial/lessons.ts, SCREENS §27.2): when each
// guide starts, how its steps move on, the first-look tips, the commands that
// store them.
import { describe, expect, it } from 'vitest';
import {
  activeChapter,
  chapterDue,
  chapterGuidance,
  chapterObsolete,
  chapterStepDone,
  chapterToStart,
  enterChapterStep,
  tipFor,
  updateChapterMemo,
  type LessonObs,
} from '../../src/app/tutorial/lessons';
import { observeLessons } from '../../src/app/tutorial/observe';
import { GUIDES } from '../../src/config/balance';
import { CHAPTERS, CHAPTER_COVERS, TIP_IDS, tipText } from '../../src/data/lessons';
import { TUTORIAL } from '../../src/data/tutorial';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { deserialize, serialize } from '../../src/sim/save/serialize';
import { execGame } from '../helpers/executives';

/** A bank on the map after Part 1, with nothing due. */
const base = (o: Partial<LessonObs> = {}): LessonObs => ({
  panelType: null,
  modalType: null,
  sheetType: null,
  tutorialStep: TUTORIAL.done,
  guidesOn: true,
  lessonsDone: [],
  hqRamp: 0,
  offices: 0,
  depts: [],
  execs: 0,
  tier: 'strong',
  ipoReady: false,
  listed: false,
  cityCovered: false,
  flights: 0,
  personalCash: 0,
  ...o,
});

describe('when guides start', () => {
  it('starts each guide on its own condition', () => {
    expect(chapterToStart(base())).toBeUndefined();
    expect(chapterToStart(base({ hqRamp: 0.25 }))).toBe('hq');
    expect(chapterToStart(base({ depts: ['executive'] }))).toBe('exec');
    expect(chapterToStart(base({ ipoReady: true }))).toBe('ipo');
    expect(chapterToStart(base({ cityCovered: true }))).toBe('travel');
    expect(chapterToStart(base({ personalCash: GUIDES.wealthCash }))).toBe('wealth');
    expect(chapterToStart(base({ tier: 'watch' }))).toBe('capital');
  });

  it('puts capital first and skips guides already seen or already done', () => {
    expect(chapterToStart(base({ tier: 'restricted', hqRamp: 1 }))).toBe('capital');
    expect(chapterToStart(base({ hqRamp: 1, lessonsDone: ['hq'] }))).toBeUndefined();
    expect(chapterDue('hq', base({ hqRamp: 1, offices: 1 }))).toBe(false);
    expect(chapterDue('exec', base({ depts: ['executive'], execs: 1 }))).toBe(false);
    expect(chapterDue('ipo', base({ ipoReady: true, listed: true }))).toBe(false);
    expect(chapterDue('travel', base({ cityCovered: true, flights: 2 }))).toBe(false);
  });

  it('waits for the map, for Part 1 to end, and never runs with guides off', () => {
    const due = { hqRamp: 1 };
    expect(chapterToStart(base({ ...due, panelType: 'branch' }))).toBeUndefined();
    expect(chapterToStart(base({ ...due, modalType: 'weekly' }))).toBeUndefined();
    expect(chapterToStart(base({ ...due, sheetType: 'menu' }))).toBeUndefined();
    expect(chapterToStart(base({ ...due, tutorialStep: 4 }))).toBeUndefined();
    expect(chapterToStart(base({ ...due, tutorialStep: TUTORIAL.finale }))).toBeUndefined();
    expect(chapterToStart(base({ ...due, guidesOn: false }))).toBeUndefined();
    // An older save that never had Part 1 still gets the guides.
    expect(chapterToStart(base({ ...due, tutorialStep: undefined }))).toBe('hq');
    // One at a time.
    expect(chapterToStart(base({ ...due, lesson: { id: 'ipo', step: 0 } }))).toBeUndefined();
  });

  it('reads a real game: the HQ guide is due from the third branch', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(observeLessons(s, null, null, null).hqRamp).toBe(0);
    s.hq.ramp = 0.25;
    expect(observeLessons(s, null, null, null).hqRamp).toBe(0); // no branch yet
    const g = execGame();
    expect(observeLessons(g, null, null, null)).toMatchObject({
      offices: 1,
      depts: ['executive'],
      execs: 0,
      listed: false,
    });
    expect(chapterDue('exec', observeLessons(g, null, null, null))).toBe(true);
  });
});

describe('guide steps', () => {
  it('walks the HQ guide: find an office, rent it, then see HQ and leave', () => {
    let o = base({ hqRamp: 1, lesson: { id: 'hq', step: 0 } });
    let m = enterChapterStep('hq', 0, o);
    expect(chapterStepDone(m, o)).toBe(false);
    expect(chapterGuidance(m, o).targets.map((t) => t.key)).toEqual(['pin-office', 'panel-close']);
    expect(chapterStepDone(m, { ...o, panelType: 'office' })).toBe(true);

    o = { ...o, panelType: 'office', lesson: { id: 'hq', step: 1 } };
    m = enterChapterStep('hq', 1, o);
    expect(chapterGuidance(m, o).targets[0]?.key).toBe('office-rent');
    expect(chapterStepDone(m, o)).toBe(false);
    expect(chapterStepDone(m, { ...o, offices: 1 })).toBe(true);

    o = { ...o, offices: 1, panelType: 'hq', hqDept: 'finance', lesson: { id: 'hq', step: 2 } };
    m = updateChapterMemo(enterChapterStep('hq', 2, o), o);
    expect(m.saw).toBe(true);
    expect(chapterGuidance(m, o).idle).toBe(CHAPTERS.hq.steps[2]!.here);
    expect(chapterStepDone(m, o)).toBe(false);
    expect(chapterStepDone(m, { ...o, panelType: null })).toBe(true);
  });

  it('ends the executive guide on a hire, then on "Got it"', () => {
    const o = base({ depts: ['executive'], lesson: { id: 'exec', step: 0 } });
    const m = enterChapterStep('exec', 0, o);
    expect(chapterStepDone(m, o)).toBe(false);
    expect(chapterStepDone(m, { ...o, execs: 1 })).toBe(true);
    const ack = enterChapterStep('exec', 1, { ...o, execs: 1 });
    expect(chapterGuidance(ack, o).ack).toBe(true);
    expect(chapterStepDone(ack, { ...o, panelType: null })).toBe(false);
  });

  it('ends the travel guide on a flight, and drops guides that lost their point', () => {
    const o = base({ cityCovered: true });
    expect(chapterStepDone(enterChapterStep('travel', 0, o), { ...o, panelType: 'airport' })).toBe(
      true,
    );
    expect(chapterStepDone(enterChapterStep('travel', 1, o), { ...o, flights: 1 })).toBe(true);
    expect(chapterObsolete('capital', base({ tier: 'adequate' }))).toBe(true);
    expect(chapterObsolete('capital', base({ tier: 'watch' }))).toBe(false);
    expect(chapterObsolete('ipo', base({ listed: true }))).toBe(true);
  });

  it('ignores a stored guide that does not exist or has no such step', () => {
    expect(activeChapter(base({ lesson: { id: 'hq', step: 2 } }))).toEqual({ id: 'hq', step: 2 });
    expect(activeChapter(base({ lesson: { id: 'hq', step: 3 } }))).toBeUndefined();
    expect(activeChapter(base({ lesson: { id: 'nope', step: 0 } }))).toBeUndefined();
  });
});

describe('first-look tips', () => {
  it('names the tip for the screen you are on', () => {
    expect(tipFor(base({ panelType: 'hq', hqDept: 'treasury' }))).toBe('floor-treasury');
    expect(tipFor(base({ panelType: 'centralBank' }))).toBe('place-centralBank');
    expect(tipFor(base({ panelType: 'branch', panelTab: 'finance' }))).toBe('branch-finance');
    expect(tipFor(base({ panelType: 'branch', panelTab: 'service' }))).toBeUndefined();
    expect(tipFor(base({ modalType: 'boardMeeting' }))).toBe('modal-board');
    expect(tipFor(base({ modalType: 'weekly' }))).toBeUndefined();
    expect(tipFor(base({ panelType: 'settings' }))).toBeUndefined();
  });

  it('shows the investment bank before its M&A tab, and each tip once', () => {
    const ib = base({ panelType: 'investmentBank', panelTab: 'mna' });
    expect(tipFor(ib)).toBe('place-investmentBank');
    expect(tipFor({ ...ib, lessonsDone: ['place-investmentBank'] })).toBe('ib-mna');
    expect(tipFor({ ...ib, lessonsDone: ['place-investmentBank', 'ib-mna'] })).toBeUndefined();
  });

  it('stays quiet during a guide (except on a popup), during Part 1 and with guides off', () => {
    const lesson = { id: 'hq', step: 2 };
    expect(tipFor(base({ panelType: 'hq', hqDept: 'finance', lesson }))).toBeUndefined();
    expect(tipFor(base({ modalType: 'incident', lesson }))).toBe('modal-incident');
    expect(tipFor(base({ panelType: 'airport', tutorialStep: 3 }))).toBeUndefined();
    expect(tipFor(base({ panelType: 'airport', guidesOn: false }))).toBeUndefined();
  });

  it('has words for every tip and every guide step', () => {
    for (const id of TIP_IDS) expect(tipText(id)?.line.length).toBeGreaterThan(20);
    for (const c of Object.values(CHAPTERS)) {
      for (const st of c.steps) expect(st.idle.length).toBeGreaterThan(10);
    }
    for (const tips of Object.values(CHAPTER_COVERS)) {
      for (const id of tips ?? []) expect(TIP_IDS).toContain(id);
    }
  });
});

describe('guide commands and saves', () => {
  it('stores the guide in progress and the ones seen', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    expect(s.flags.lessonsDone).toEqual([]);
    expect(s.settings.guides).toBe(true);
    expect(cmd.setLesson(s, 'hq', 1).ok).toBe(true);
    expect(s.flags.lesson).toEqual({ id: 'hq', step: 1 });
    expect(cmd.setLesson(s, 'hq', 3).ok).toBe(false);
    expect(cmd.setLesson(s, 'floor-hr', 0).ok).toBe(false);
    expect(cmd.finishLesson(s, 'hq').ok).toBe(true);
    expect(s.flags.lesson).toBeUndefined();
    expect(cmd.finishLesson(s, 'floor-hr').ok).toBe(true);
    expect(cmd.finishLesson(s, 'floor-hr').ok).toBe(true);
    expect(s.flags.lessonsDone).toEqual(['hq', 'floor-hr']);
    expect(cmd.finishLesson(s, 'made-up').ok).toBe(false);
    expect(deserialize(serialize(s)).flags.lessonsDone).toEqual(['hq', 'floor-hr']);
    expect(cmd.resetLessons(s).ok).toBe(true);
    expect(s.flags.lessonsDone).toEqual([]);
    expect(cmd.setSettings(s, { guides: false }).ok).toBe(true);
    expect(cmd.setSettings(s, { guides: 'no' as unknown as boolean }).ok).toBe(false);
  });
});
