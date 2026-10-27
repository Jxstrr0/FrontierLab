// The tutorial step machine (src/app/tutorial/steps.ts) driven through a whole
// Part 1, from the seed round to the first enterprise contract, with real
// commands, plus the tutorial commands and save safety.
import { describe, expect, it } from 'vitest';
import { observe, guideOf } from '../../src/app/tutorial/observe';
import {
  alreadyDone,
  enterStep,
  guidance,
  isActiveStep,
  isDone,
  needsApplication,
  nextStep,
  shouldOpenWeekly,
  updateMemo,
  type StepMemo,
} from '../../src/app/tutorial/steps';
import type { ModalRoute, PanelRoute } from '../../src/app/store';
import { CAMPAIGNS } from '../../src/data/campaigns';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import {
  TUTORIAL,
  TUTORIAL_ORDER,
  TUTORIAL_STEPS,
  TUTORIAL_TEXT,
  tutorialStepId,
  tutorialStepNumber,
  type TutorialStepId,
} from '../../src/data/tutorial';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { deserialize, serialize } from '../../src/sim/save/serialize';
import type { GameState } from '../../src/sim/state';
import { freeLot } from '../helpers/scenario';

const start = () => {
  const s = newGame({ seed: 42, cityId: 'cal' });
  cmd.setTutorialStep(s, TUTORIAL.first);
  return s;
};
const look = (s: GameState, panel: PanelRoute | null = null, modal: ModalRoute | null = null) =>
  observe(s, panel, modal);

const at = (id: TutorialStepId) => tutorialStepNumber(id);

/** Plays the nine steps with commands; returns the step trail and the game. */
function playThrough(): { s: GameState; trail: number[] } {
  const s = start();
  const trail: number[] = [];
  let memo: StepMemo;
  const advance = (m: StepMemo) => {
    trail.push(m.step);
    cmd.setTutorialStep(s, nextStep(m.step));
  };

  // 1. Tap a storefront.
  memo = enterStep(at('storefront'), look(s));
  expect(isDone(memo, look(s))).toBe(false);
  const lot = freeLot(s, 'midtown');
  expect(isDone(memo, look(s, { type: 'storefront', lotId: lot.id }))).toBe(true);
  advance(memo);

  // 2. Build a sales office.
  memo = enterStep(at('build'), look(s, { type: 'build', lotId: lot.id }));
  expect(isDone(memo, look(s))).toBe(false);
  const built = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.basic });
  if (!built.ok) throw new Error(built.reason);
  const branchId = built.branchId;
  expect(isDone(memo, look(s))).toBe(true);
  advance(memo);

  // 3. Set the Plus price (on the office's Products tab while HQ doesn't set prices).
  const panel: PanelRoute = { type: 'branch', branchId, tab: 'products' };
  memo = enterStep(at('price'), look(s, panel));
  expect(isDone(memo, look(s, panel))).toBe(false);
  expect(s.company.applyRatesToAll).toBe(false);
  const plus = s.branches[branchId]!.offered.plus!.price;
  expect(cmd.setPrice(s, branchId, 'plus', plus + 2).ok).toBe(true);
  expect(isDone(memo, look(s, panel))).toBe(true);
  advance(memo);

  // 4. Turn on the API (new offices open with it off).
  memo = enterStep(at('api'), look(s, panel));
  expect(alreadyDone(memo, look(s))).toBe(false);
  expect(isDone(memo, look(s))).toBe(false);
  expect(cmd.setOffered(s, branchId, 'api', true).ok).toBe(true);
  expect(isDone(memo, look(s))).toBe(true);
  advance(memo);

  // 5. Hire a manager: the guide is the first candidate until someone is hired.
  memo = enterStep(at('manager'), look(s, panel));
  expect(alreadyDone(memo, look(s))).toBe(false);
  const candidate = s.people.managerCandidates.cal![0]!;
  expect(guideOf(s)?.id).toBe(candidate.id);
  const second = s.people.managerCandidates.cal![1]!;
  expect(cmd.hireManager(s, branchId, second.id).ok).toBe(true);
  expect(isDone(memo, look(s))).toBe(true);
  expect(guideOf(s)?.id).toBe(second.id);
  advance(memo);

  // 6. Run a campaign.
  const marketing: PanelRoute = { type: 'branch', branchId, tab: 'marketing' };
  memo = enterStep(at('campaign'), look(s, marketing));
  expect(alreadyDone(memo, look(s, marketing))).toBe(false);
  expect(isDone(memo, look(s, marketing))).toBe(false);
  const campaign = Object.keys(CAMPAIGNS)[0]!;
  expect(cmd.setCampaignLevel(s, branchId, campaign, 1).ok).toBe(true);
  expect(isDone(memo, look(s, marketing))).toBe(true);
  advance(memo);

  // 7. Unpause and read the weekly results (done once they have been shown and closed).
  memo = enterStep(at('week'), look(s));
  expect(guidance(memo, look(s)).idle).toMatch(/play/);
  s.clock.speed = 1;
  expect(guidance(memo, look(s)).targets).toEqual([
    expect.objectContaining({ key: 'weekly-continue' }),
  ]);
  advanceWeeks(s, 1);
  expect(shouldOpenWeekly(memo, look(s))).toBe(true);
  const weekly: ModalRoute = { type: 'weekly', week: s.clock.week - 1 };
  memo = updateMemo(memo, look(s, null, weekly));
  expect(isDone(memo, look(s, null, weekly))).toBe(false);
  expect(guidance(memo, look(s, null, weekly)).targets[0]?.key).toBe('weekly-continue');
  expect(isDone(memo, look(s))).toBe(true);
  advance(memo);
  s.clock.speed = 0;

  // 8. Meet the lab: done once the Company summary has been open and is closed.
  memo = enterStep(at('company'), look(s));
  expect(guidance(memo, look(s)).targets.map((t) => t.key)).toEqual([
    'capital-meter',
    'hud-bank',
    'panel-close',
  ]);
  const company: PanelRoute = { type: 'company' };
  memo = updateMemo(memo, look(s, company));
  expect(isDone(memo, look(s, company))).toBe(false);
  expect(isDone(memo, look(s))).toBe(true);
  advance(memo);

  // 9. Win your first contract: the tutorial asks for a proposal request when none waits,
  // and again after a lost bid.
  memo = enterStep(at('contract'), look(s));
  expect(memo.step).toBe(TUTORIAL.loan);
  for (let tries = 0; !isDone(memo, look(s)); tries++) {
    if (tries > 10) throw new Error('No contract won');
    if (needsApplication(memo, look(s))) {
      expect(cmd.requestTutorialApplication(s, branchId).ok).toBe(true);
    }
    expect(needsApplication(memo, look(s))).toBe(false);
    const rfp = Object.values(s.dealDesk.rfps).find((r) => r.kind === 'new')!;
    cmd.bidOnRfp(s, rfp.id, 0.3);
  }
  advance(memo);
  return { s, trail };
}

describe('tutorial step machine', () => {
  it('walks the nine steps of SCREENS §27.1, each on the player’s own action', () => {
    const { s, trail } = playThrough();
    expect(trail).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(s.flags.tutorialStep).toBe(TUTORIAL.finale);
    expect(s.underwriting.loansBooked).toBeGreaterThan(0);
    expect(Object.values(s.businesses).some((b) => b.vendor?.type === 'player')).toBe(true);
  });

  it('runs the steps in TUTORIAL_ORDER, ending on the contract step', () => {
    expect(TUTORIAL_ORDER).toHaveLength(TUTORIAL.last - TUTORIAL.first + 1);
    expect(tutorialStepId(TUTORIAL.first)).toBe('storefront');
    expect(tutorialStepId(TUTORIAL.loan)).toBe('contract');
    expect(TUTORIAL.loan).toBe(TUTORIAL.last);
    expect(tutorialStepId(TUTORIAL.finale)).toBeUndefined();
    for (const id of TUTORIAL_ORDER) expect(tutorialStepId(tutorialStepNumber(id))).toBe(id);
  });

  it('keeps bank words out of the guide’s lines', () => {
    const bank = /\b(bank|branch|deposit|loan|lend|capital|teller|vault)/i;
    const all = Object.values(TUTORIAL_STEPS).flatMap((t) => [
      t.title,
      t.idle,
      ...Object.values(t.lines),
    ]);
    for (const line of [...all, TUTORIAL_TEXT.offer, TUTORIAL_TEXT.finale]) {
      expect(line).not.toMatch(bank);
    }
  });

  it('is deterministic: the same seed and commands give the same game', () => {
    expect(serialize(playThrough().s)).toBe(serialize(playThrough().s));
  });

  it('rings the closest-to-done target first and points at the focused branch', () => {
    const s = start();
    const lot = freeLot(s, 'midtown');
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    const g = guidance(enterStep(at('price'), look(s)), look(s));
    expect(g.targets.map((t) => t.key)).toEqual([
      'price-plus',
      'product-category',
      'tab-products',
      'my-branch',
    ]);
    expect(g.targets.at(-1)?.lotId).toBe(lot.id);
  });

  it('waits for other modals, and points at Continue when weekly results interrupt', () => {
    const s = start();
    const memo = enterStep(at('price'), look(s));
    expect(guidance(memo, look(s, null, { type: 'incident' }))).toMatchObject({
      targets: [],
      idle: TUTORIAL_TEXT.waitModal,
    });
    const g = guidance(memo, look(s, null, { type: 'weekly', week: 0 }));
    expect(g.targets.map((t) => t.key)).toEqual(['weekly-continue']);
  });

  it('skips steps that are already done in a replay', () => {
    const s = newGame({ seed: 7, cityId: 'cal' });
    const lot = freeLot(s);
    const r = cmd.buildBranch(s, { lotId: lot.id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    cmd.setOffered(s, r.branchId, 'api', true);
    expect(alreadyDone(enterStep(at('api'), look(s)), look(s))).toBe(true);
    expect(alreadyDone(enterStep(at('manager'), look(s)), look(s))).toBe(false);
    expect(alreadyDone(enterStep(at('campaign'), look(s)), look(s))).toBe(false);
    s.branches[r.branchId]!.delegation.marketing = true;
    expect(alreadyDone(enterStep(at('campaign'), look(s)), look(s))).toBe(true);
  });

  it('only steps 1–9 are active; the closing card follows step 9', () => {
    expect([undefined, 0, 1, 9, 10, 11].map(isActiveStep)).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(nextStep(3)).toBe(4);
    expect(nextStep(TUTORIAL.last)).toBe(TUTORIAL.finale);
  });
});

describe('tutorial commands', () => {
  it('validates the step', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    expect(cmd.setTutorialStep(s, 12).ok).toBe(false);
    expect(cmd.setTutorialStep(s, 2.5).ok).toBe(false);
    expect(cmd.setTutorialStep(s, TUTORIAL.done).ok).toBe(true);
    expect(s.flags.tutorialStep).toBe(TUTORIAL.done);
  });

  it('asks for a proposal request only on the contract step and only when none is waiting', () => {
    const s = start();
    const r = cmd.buildBranch(s, { lotId: freeLot(s).id, build: REFERENCE_BUILDS.basic });
    if (!r.ok) throw new Error(r.reason);
    expect(cmd.requestTutorialApplication(s, r.branchId).ok).toBe(false);
    cmd.setTutorialStep(s, TUTORIAL.loan);
    expect(cmd.requestTutorialApplication(s, r.branchId).ok).toBe(true);
    expect(cmd.requestTutorialApplication(s, r.branchId).ok).toBe(false);
    expect(Object.keys(s.dealDesk.rfps)).toHaveLength(1);
  });

  it('keeps the step through a save, and older saves without it load as never offered', () => {
    const s = start();
    cmd.setTutorialStep(s, 4);
    expect(deserialize(serialize(s)).flags.tutorialStep).toBe(4);
    const old = newGame({ seed: 3, cityId: 'cal' });
    const loaded = deserialize(serialize(old));
    expect(loaded.flags.tutorialStep).toBeUndefined();
    expect(isActiveStep(loaded.flags.tutorialStep)).toBe(false);
  });
});
