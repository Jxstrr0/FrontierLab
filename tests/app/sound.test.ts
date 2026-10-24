// Optional sound (src/app/sound): the on/off gate, play() staying silent while
// off or locked, the recipes running against a fake AudioContext, and the cue helpers.
import { afterEach, describe, expect, it } from 'vitest';
import { panelKey, profitableWeek } from '../../src/app/sound/cues';
import {
  audioStatus,
  play,
  setAudioFactory,
  soundEnabled,
  unlockAudio,
} from '../../src/app/sound/sound';
import { RECIPES, type SoundName } from '../../src/app/sound/synth';
import { setGame } from '../../src/app/store';
import { newGame } from '../../src/sim/newGame';

/** Just enough of an AudioContext for the recipes, counting the voices they start. */
function fakeContext() {
  const made = { contexts: 0, oscillators: 0, noises: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect: <T>(n: T) => n });
  const ctx = {
    state: 'running',
    currentTime: 1,
    sampleRate: 8000,
    destination: node(),
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      made.oscillators++;
      return { ...node(), type: 'sine', frequency: param(), start() {}, stop() {} };
    },
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param() }),
    createBufferSource: () => {
      made.noises++;
      return { ...node(), buffer: null, start() {}, stop() {} };
    },
    createBuffer: (_ch: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
    resume: async () => undefined,
  };
  const factory = () => {
    made.contexts++;
    return ctx as unknown as AudioContext;
  };
  return { made, factory };
}

function gameWithSound(on: boolean) {
  const s = newGame({ seed: 5, cityId: 'cal' });
  s.settings.sound = on;
  setGame(s);
  return s;
}

afterEach(() => {
  setAudioFactory(null);
  setGame(null);
});

describe('sound gate', () => {
  it('follows the game setting, or the saved preference on the title screens (off by default)', () => {
    expect(soundEnabled(null, {})).toBe(false);
    expect(soundEnabled(null, { sound: true })).toBe(true);
    expect(soundEnabled({ settings: { sound: false } }, { sound: true })).toBe(false);
    expect(soundEnabled({ settings: { sound: true } }, {})).toBe(true);
  });

  it('plays nothing while Sound is off, even once audio is unlocked', () => {
    const fake = fakeContext();
    setAudioFactory(fake.factory);
    gameWithSound(false);
    unlockAudio();
    play('coin');
    expect(fake.made.oscillators).toBe(0);
  });

  it('plays nothing until a tap has unlocked audio (no context outside a gesture)', () => {
    const fake = fakeContext();
    setAudioFactory(fake.factory);
    gameWithSound(true);
    play('latch');
    expect(fake.made.contexts).toBe(0);
    expect(audioStatus().context).toBe('none');
  });

  it('plays once on and unlocked, and drops an immediate repeat', () => {
    const fake = fakeContext();
    setAudioFactory(fake.factory);
    gameWithSound(true);
    unlockAudio();
    const before = audioStatus().plays;
    play('coin');
    expect(fake.made.oscillators).toBe(6);
    play('coin');
    expect(fake.made.oscillators).toBe(6);
    play('stamp');
    expect(audioStatus().plays).toBe(before + 2);
    expect(fake.made.contexts).toBe(1);
  });

  it('every recipe schedules at least one voice', () => {
    for (const name of Object.keys(RECIPES) as SoundName[]) {
      const fake = fakeContext();
      setAudioFactory(fake.factory);
      gameWithSound(true);
      unlockAudio();
      play(name);
      expect(fake.made.oscillators + fake.made.noises, name).toBeGreaterThan(0);
    }
  });
});

describe('sound cues', () => {
  it('a tab change is the same panel; another branch is a new one', () => {
    const a = panelKey({ type: 'branch', branchId: 'b1', tab: 'service' });
    expect(panelKey({ type: 'branch', branchId: 'b1', tab: 'products' })).toBe(a);
    expect(panelKey({ type: 'branch', branchId: 'b2' })).not.toBe(a);
    expect(panelKey(null)).toBeNull();
  });

  it('the coin clinks only on a profitable week', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const snap = (week: number, netIncome: number) =>
      ({ week, netIncome }) as (typeof s.history.weekly)[number];
    s.history.weekly = [snap(1, -500), snap(2, 1200)];
    expect(profitableWeek(s, 0)).toBe(false);
    expect(profitableWeek(s, 1)).toBe(true);
  });
});
