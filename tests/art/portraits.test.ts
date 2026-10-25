import { describe, expect, it } from 'vitest';
import { avatarFromSeed, PART_COUNTS, portraitMarkup, SKIN_TONES } from '../../src/art/portraits';
import { AVATAR_PARTS } from '../../src/data/avatarParts';
import type { AvatarSpec } from '../../src/sim/state';

const BASE: AvatarSpec = { head: 0, hair: 0, facial: 0, glasses: 0, attire: 0, tone: 0, shade: 1 };

describe('portrait generator', () => {
  it('matches the avatar part counts the picker offers', () => {
    for (const part of AVATAR_PARTS) {
      expect(PART_COUNTS[part.part]).toBe(part.names.length);
    }
    expect(SKIN_TONES).toHaveLength(PART_COUNTS.tone);
  });

  it('is deterministic for the same spec', () => {
    const spec = { ...BASE, hair: 7, attire: 2, tone: 3 };
    expect(portraitMarkup(spec)).toBe(portraitMarkup({ ...spec }));
  });

  it('draws every part option without errors and differently', () => {
    const seen = new Set<string>();
    for (const [part, n] of Object.entries(PART_COUNTS)) {
      for (let i = 0; i < n; i++) {
        const svg = portraitMarkup({ ...BASE, [part]: i });
        expect(svg).toContain('clip-path="url(#__ID__)"');
        expect(svg).not.toContain('NaN');
        seen.add(svg);
      }
    }
    // Every option of every part changes the drawing (index 0s coincide with BASE).
    const total = Object.values(PART_COUNTS).reduce((t, n) => t + n - 1, 1);
    expect(seen.size).toBe(total);
  });

  it('renders skin tone as a fill under the hatching', () => {
    for (let t = 0; t < SKIN_TONES.length; t++) {
      expect(portraitMarkup({ ...BASE, tone: t })).toContain(`fill:${SKIN_TONES[t]}`);
    }
  });

  it('wraps out-of-range indices instead of failing (old saves, bad specs)', () => {
    expect(portraitMarkup({ ...BASE, hair: 13, head: -1 })).toBe(
      portraitMarkup({ ...BASE, hair: 1, head: 3 }),
    );
  });

  it('draws a simpler plate for tiny sizes', () => {
    const fine = portraitMarkup(BASE);
    const coarse = portraitMarkup(BASE, true);
    expect(coarse).not.toBe(fine);
    expect(coarse).not.toContain('pt-guil');
    expect(fine).toContain('pt-guil');
  });

  it('picks valid, repeatable avatars from a seed', () => {
    for (const seed of [0, 1, 42, 99999, 'Finance lead', 'advisor']) {
      const a = avatarFromSeed(seed);
      expect(avatarFromSeed(seed)).toEqual(a);
      for (const [part, n] of Object.entries(PART_COUNTS)) {
        const v = a[part as keyof AvatarSpec];
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(n);
      }
    }
    expect(avatarFromSeed(1)).not.toEqual(avatarFromSeed(2));
  });
});
