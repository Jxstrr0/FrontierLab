// Tutorial Part 2's machine (SCREENS §27.2), pure so it can be unit-tested.
// Guides ("chapters") start on the map when a later mechanic opens up (HQ,
// safety, compute, executives, training, going public, travel, your own
// money), one at a time, and each step moves on when you do the thing or have been to the
// screen it is about and left it. First-look tips show the first time you
// open an HQ floor, a map place or a decision popup, and end on "Got it" or
// when you leave. Neither runs while Part 1 is going or with guides switched off.
import { GUIDES } from '../../config/balance';
import {
  CHAPTERS,
  CHAPTER_ORDER,
  FLOOR_TIPS,
  PLACE_TIPS,
  isChapterId,
  type ChapterId,
  type LessonTarget,
} from '../../data/lessons';
import { TUTORIAL } from '../../data/tutorial';
import type { DeptId, Tier } from '../../data/types';

/** What the guides can see of the game and the UI (built by observe.ts). */
export interface LessonObs {
  panelType: string | null;
  /** The open branch or investment bank tab. */
  panelTab?: string;
  /** The floor shown in an open HQ panel. */
  hqDept?: DeptId;
  modalType: string | null;
  /** A price-war case is among the open incidents (its own first-look tip). */
  priceWarOpen?: boolean;
  sheetType: string | null;
  tutorialStep?: number;
  guidesOn: boolean;
  lessonsDone: readonly string[];
  /** The guide in progress, from state.flags.lesson. */
  lesson?: { id: string; step: number };
  hqRamp: number;
  offices: number;
  depts: readonly DeptId[];
  execs: number;
  tier: Tier;
  ipoReady: boolean;
  listed: boolean;
  /** The city you are in is well covered (SCREENS §3). */
  cityCovered: boolean;
  flights: number;
  personalCash: number;
  /** Compute is short: a capacity crunch, an outage, or a recent emergency burst. */
  computeShort: boolean;
  /** A training run is under way or has finished. */
  trainingStarted: boolean;
}

/** What a guide step remembers from when it began. */
export interface ChapterMemo {
  id: ChapterId;
  step: number;
  offices: number;
  execs: number;
  flights: number;
  /** The step's screen has been open. */
  saw: boolean;
}

export interface LessonTargetLine {
  key: LessonTarget;
  line: string;
}

const WEAK_TIERS: readonly Tier[] = ['watch', 'restricted', 'critical'];

/** Part 2 runs once Part 1 is finished or skipped (or never ran, in an older save), with guides on. */
export const guidesActive = (o: LessonObs): boolean =>
  o.guidesOn && (o.tutorialStep === undefined || o.tutorialStep >= TUTORIAL.done);

const onMap = (o: LessonObs) => !o.panelType && !o.modalType && !o.sheetType;

/** Whether a guide is due now (it also needs you to be on the map to start). */
export function chapterDue(id: ChapterId, o: LessonObs): boolean {
  switch (id) {
    case 'capital':
      return WEAK_TIERS.includes(o.tier);
    case 'hq':
      return o.hqRamp > 0 && o.offices === 0;
    case 'safetyFloor':
      return o.hqRamp > 0 && o.offices > 0 && !o.depts.includes('risk');
    case 'compute':
      return o.computeShort;
    case 'exec':
      return o.depts.includes('executive') && o.execs === 0;
    case 'training':
      return o.depts.includes('products') && !o.trainingStarted;
    case 'ipo':
      return o.ipoReady && !o.listed;
    case 'travel':
      return o.cityCovered && o.flights === 0;
    case 'wealth':
      return o.personalCash >= GUIDES.wealthCash;
  }
}

/** The guide to start now, if any: none while one runs, or off the map. */
export function chapterToStart(o: LessonObs): ChapterId | undefined {
  if (!guidesActive(o) || o.lesson || !onMap(o)) return undefined;
  return CHAPTER_ORDER.find((id) => !o.lessonsDone.includes(id) && chapterDue(id, o));
}

/** The guide in progress, when it is a real one at a real step. */
export function activeChapter(o: LessonObs): { id: ChapterId; step: number } | undefined {
  const l = o.lesson;
  if (!guidesActive(o) || !l || !isChapterId(l.id)) return undefined;
  return l.step >= 0 && l.step < CHAPTERS[l.id].steps.length
    ? { id: l.id, step: l.step }
    : undefined;
}

export function enterChapterStep(id: ChapterId, step: number, o: LessonObs): ChapterMemo {
  return { id, step, offices: o.offices, execs: o.execs, flights: o.flights, saw: false };
}

/** The compute guide goes to the Compute floor when you have one, else to the Company summary. */
const computeByFloor = (o: LessonObs): boolean => o.depts.includes('treasury');

/** Whether a step says its `alt` text instead (CHAPTERS in data/lessons.ts). */
function saysAlt(m: ChapterMemo, o: LessonObs): boolean {
  return m.id === 'compute' && !computeByFloor(o);
}

/** The screen a step is about, for steps that end once you have seen it and left. */
function atScreen(m: ChapterMemo, o: LessonObs): boolean | undefined {
  const key = `${m.id}:${m.step}`;
  switch (key) {
    case 'capital:0':
      return o.panelType === 'company';
    case 'hq:2':
      return o.panelType === 'hq';
    case 'safetyFloor:1':
      return o.hqDept === 'risk';
    case 'compute:0':
      return computeByFloor(o) ? o.hqDept === 'treasury' : o.panelType === 'company';
    case 'training:0':
      return o.hqDept === 'products';
    case 'ipo:1':
      return o.panelType === 'investmentBank' && o.panelTab === 'equity';
    case 'travel:1':
      return o.panelType === 'airport';
    case 'wealth:0':
      return o.panelType === 'wealth';
    default:
      return undefined;
  }
}

export function updateChapterMemo(m: ChapterMemo, o: LessonObs): ChapterMemo {
  return !m.saw && atScreen(m, o) ? { ...m, saw: true } : m;
}

/** Whether the step is done ("Got it" steps end only from the bar). */
export function chapterStepDone(m: ChapterMemo, o: LessonObs): boolean {
  switch (`${m.id}:${m.step}`) {
    case 'hq:0':
      return o.panelType === 'office' || o.offices > m.offices;
    case 'hq:1':
      return o.offices > m.offices;
    case 'safetyFloor:0':
      return o.depts.includes('risk');
    case 'exec:0':
      return o.execs > m.execs;
    case 'training:0':
      return o.trainingStarted || (m.saw && !atScreen(m, o));
    case 'ipo:0':
      return o.panelType === 'investmentBank';
    case 'travel:0':
      return o.panelType === 'airport' || o.flights > m.flights;
    case 'travel:1':
      return o.flights > m.flights || (m.saw && !atScreen(m, o));
    default:
      return m.saw && !atScreen(m, o);
  }
}

/** A guide that no longer has a point ends early: safety recovered, or the lab went public. */
export function chapterObsolete(id: ChapterId, o: LessonObs): boolean {
  if (id === 'capital') return !WEAK_TIERS.includes(o.tier);
  if (id === 'ipo') return o.listed;
  return false;
}

/** The ring targets for the step, closest to done first, and the line for "no target on screen". */
export function chapterGuidance(
  m: ChapterMemo,
  o: LessonObs,
): { title: string; targets: LessonTargetLine[]; idle: string; ack: boolean } {
  const chapter = CHAPTERS[m.id];
  const step = chapter.steps[m.step]!;
  const text = step.alt && saysAlt(m, o) ? step.alt : step;
  const here = text.here && atScreen(m, o) ? text.here : undefined;
  // On the step's own screen, only the targets that say its `here` line are ringed
  // (the way there, e.g. the floor's own tab, would otherwise talk over it).
  const targets = (Object.entries(text.lines) as [LessonTarget, string][])
    .filter(([, line]) => !here || line === here)
    .map(([key, line]) => ({ key, line }));
  return { title: chapter.title, targets, idle: here ?? text.idle, ack: !!text.ack };
}

/**
 * The first-look tip for the screen you are on, if you haven't seen it: a
 * decision popup first, then the HQ floor, branch or investment bank tab, then
 * the place itself.
 */
export function tipFor(o: LessonObs): string | undefined {
  if (!guidesActive(o)) return undefined;
  const fresh = (id: string) => (o.lessonsDone.includes(id) ? undefined : id);
  if (o.modalType === 'boardMeeting') return fresh('modal-board');
  if (o.modalType === 'incident')
    return fresh('modal-incident') ?? (o.priceWarOpen ? fresh('modal-price-war') : undefined);
  if (o.modalType === 'annual') return fresh('modal-annual');
  if (o.modalType || o.sheetType || activeChapter(o)) return undefined;
  if (o.hqDept && FLOOR_TIPS[o.hqDept]) return fresh(`floor-${o.hqDept}`);
  if (o.panelType === 'branch') {
    if (o.panelTab === 'finance') return fresh('branch-finance');
    return o.panelTab === 'loandesk' ? fresh('branch-dealdesk') : undefined;
  }
  const place = o.panelType && PLACE_TIPS[o.panelType] ? `place-${o.panelType}` : undefined;
  if (o.panelType === 'investmentBank') {
    return (place && fresh(place)) ?? (o.panelTab === 'mna' ? fresh('ib-mna') : undefined);
  }
  return place && fresh(place);
}

/** Tips on a popup dock the bar on top, clear of the popup's choices. */
export const tipDocksTop = (id: string): boolean => id.startsWith('modal-');
