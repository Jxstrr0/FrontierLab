// The audit's pacing fixes in the real-time loop (src/app/loop.ts): resuming
// after a pause returns to the speed you were playing at, Skip ahead runs to
// the end of the month and shows that month's results, and an info-only
// incident (nothing to decide) closes itself instead of opening a popup.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elapse, pause, resume, setSpeed, skipAhead, skipping } from '../../src/app/loop';
import { modal, peekGame, setGame } from '../../src/app/store';
import { raiseIncident } from '../../src/sim/incidents';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';

vi.mock('../../src/app/saves/autosave', () => ({ autosave: () => {} }));

const FRAME = 50;
const MANY_FRAMES = 4000;

function game(): GameState {
  const s = peekGame();
  if (!s) throw new Error('no game');
  return s;
}

beforeEach(() => {
  setGame(newGame({ seed: 42, cityId: 'cal' }));
  setSpeed(4);
});

afterEach(() => setGame(null));

describe('pacing', () => {
  it('resumes at the speed you were playing at, not the default', () => {
    expect(game().settings.defaultSpeed).toBe(1);
    pause('Testing');
    expect(game().clock.speed).toBe(0);
    expect(game().clock.pausedReason).toBe('Testing');
    resume();
    expect(game().clock.speed).toBe(4);
    expect(game().clock.pausedReason).toBeUndefined();
  });

  it('skips ahead to the end of the month, then shows the month and pauses', () => {
    const s = game();
    s.settings.autoPauseIncidents = false;
    skipAhead();
    expect(skipping.value).toBe(true);
    for (let i = 0; i < MANY_FRAMES && !modal.value; i++) elapse(FRAME);
    expect(modal.value).toMatchObject({ type: 'weekly', period: 'monthly' });
    expect(skipping.value).toBe(false);
    expect(s.clock.speed).toBe(0);
    expect(s.clock.week).toBeGreaterThan(2);
    modal.value = null;
    resume();
    expect(s.clock.speed).toBe(4);
  });

  it('turns an info-only incident into a notice instead of a popup', () => {
    const s = game();
    s.settings.weeklyResults = 'off';
    raiseIncident(s, 'REGULATOR_LETTER', 'company', 'company', { text: 'Restricted.' });
    const week = s.clock.week;
    for (let i = 0; i < MANY_FRAMES && s.clock.week === week; i++) elapse(FRAME);
    expect(s.incidents.active.some((i) => i.type === 'REGULATOR_LETTER')).toBe(false);
    expect(modal.value).toBeNull();
  });
});
