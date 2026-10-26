import { describe, expect, it } from 'vitest';
import { setFounderAvatar, setSettings } from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';

describe('settings commands', () => {
  it('applies a valid patch', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    const r = setSettings(s, { currency: '£', textScale: 1.15, reducedMotion: true });
    expect(r.ok).toBe(true);
    expect(s.settings).toMatchObject({ currency: '£', textScale: 1.15, reducedMotion: true });
  });

  it('refuses a bad value and changes nothing', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    const r = setSettings(s, { units: 'mi', defaultSpeed: 3 as never });
    expect(r).toEqual({ ok: false, reason: 'Default speed is 1×, 2× or 4×.' });
    expect(s.settings.units).toBe('km');
  });

  it('refuses unknown settings', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    expect(setSettings(s, { volume: 11 } as never).ok).toBe(false);
  });

  it('keeps founder avatar parts in range', () => {
    const s = newGame({ seed: 1, cityId: 'cal' });
    expect(setFounderAvatar(s, { hair: 11, tone: 5 }).ok).toBe(true);
    expect(s.meta.founderAvatar).toMatchObject({ hair: 11, tone: 5 });
    expect(setFounderAvatar(s, { eyes: 3, brows: 2, mouth: 2, age: 2, glasses: 3 }).ok).toBe(true);
    expect(s.meta.founderAvatar).toMatchObject({ eyes: 3, brows: 2, mouth: 2, age: 2, glasses: 3 });
    expect(setFounderAvatar(s, { head: 4 }).ok).toBe(false);
    expect(setFounderAvatar(s, { glasses: -1 }).ok).toBe(false);
    expect(setFounderAvatar(s, { eyes: 4 }).ok).toBe(false);
    expect(setFounderAvatar(s, { shade: 2 } as never).ok).toBe(false);
    expect(s.meta.founderAvatar.head).toBe(0);
  });
});
