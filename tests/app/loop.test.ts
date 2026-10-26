// The real-time loop (src/app/loop.ts) around the weekly results: the clock
// stops the moment they open, nothing moves however long they stay up, stepping
// the week is refused, and closing them resumes without a jump because real
// time that passed while held is dropped rather than banked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DAY_MS, DAYS_PER_WEEK } from '../../src/config/balance';
import { elapse, setSpeed, stepWeek } from '../../src/app/loop';
import { modal, panel, peekGame, setGame, sheet } from '../../src/app/store';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';

// The weekly autosave writes to localStorage; keep it out of the loop under test.
vi.mock('../../src/app/saves/autosave', () => ({ autosave: () => {} }));

const FRAME = 50;
const MANY_FRAMES = 2000;

function game(): GameState {
  const s = peekGame();
  if (!s) throw new Error('no game');
  return s;
}

/** Runs frames until the weekly results open; fails if they never do. */
function playToWeekEnd(): void {
  for (let i = 0; i < MANY_FRAMES && !modal.value; i++) elapse(FRAME);
  expect(modal.value).toEqual({ type: 'weekly', week: 0 });
}

beforeEach(() => {
  setGame(newGame({ seed: 42, cityId: 'cal' }));
  setSpeed(4);
});

afterEach(() => {
  setGame(null);
  vi.unstubAllGlobals();
});

describe('the clock and the weekly results', () => {
  it('stops on the first day of the new week, the moment the results open', () => {
    playToWeekEnd();
    const s = game();
    expect(s.clock.week).toBe(1);
    expect(s.clock.day).toBe(DAYS_PER_WEEK);
  });

  it('does not move however long the results stay open, at any speed', () => {
    playToWeekEnd();
    const s = game();
    for (const speed of [1, 2, 4] as const) {
      s.clock.speed = speed;
      for (let i = 0; i < MANY_FRAMES; i++) elapse(FRAME);
      elapse(60_000);
      expect(s.clock.day).toBe(DAYS_PER_WEEK);
      expect(s.clock.week).toBe(1);
    }
    expect(modal.value).toEqual({ type: 'weekly', week: 0 });
  });

  it('refuses to step the week while the results are open', () => {
    playToWeekEnd();
    stepWeek();
    expect(game().clock.day).toBe(DAYS_PER_WEEK);
    expect(game().clock.speed).toBe(4);
  });

  it('keeps the speed setting, so play resumes as it was', () => {
    playToWeekEnd();
    expect(game().clock.speed).toBe(4);
  });

  it('resumes from a clean slate: a full day of real time passes before the next day', () => {
    playToWeekEnd();
    elapse(60_000);
    modal.value = null;
    const s = game();
    // At 4× a day is DAY_MS / 4 of real time; just short of it nothing moves.
    const dayMs = DAY_MS / 4;
    elapse(dayMs - 1);
    expect(s.clock.day).toBe(DAYS_PER_WEEK);
    elapse(1);
    expect(s.clock.day).toBe(DAYS_PER_WEEK + 1);
  });

  it('holds for a panel, a sheet and a hidden page too', () => {
    const s = game();
    const day = s.clock.day;
    panel.value = { type: 'company' };
    elapse(60_000);
    panel.value = null;
    sheet.value = 'menu';
    elapse(60_000);
    sheet.value = null;
    vi.stubGlobal('document', { hidden: true });
    elapse(60_000);
    expect(s.clock.day).toBe(day);
  });

  it('stops within a frame when the week ends mid-frame', () => {
    const s = game();
    // Six days, then a long frame that at 4× would cover several more days.
    for (let i = 0; i < DAYS_PER_WEEK - 1; i++) elapse(DAY_MS / 4);
    expect(s.clock.day).toBe(DAYS_PER_WEEK - 1);
    elapse(250);
    expect(modal.value).toEqual({ type: 'weekly', week: 0 });
    expect(s.clock.day).toBe(DAYS_PER_WEEK);
  });
});
