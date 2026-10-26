// Generated names and descriptions (CONTENT §15, §18): coined brands stay
// within length and read cleanly, startup names fit the sector, generated
// startups never reuse a name, and a pipeline rarely repeats a description.
import { describe, expect, it } from 'vitest';
import { NAME_GEN } from '../../src/config/balance';
import { BRAND_REJECT, SECTOR_SUFFIXES } from '../../src/data/nameParts';
import { coinedBrand, placeStem, startupBlurb, startupName } from '../../src/sim/nameGen';
import { newGame } from '../../src/sim/newGame';
import { hashSeed, rngFromState, stream } from '../../src/sim/rng';
import { generateStartup, isPrivate } from '../../src/sim/ventureGen';

const rngOf = (seed: number) => rngFromState(hashSeed(seed, 'names'));

describe('name generator', () => {
  it('coins clean brands within the length limits', () => {
    const rng = rngOf(1);
    const [lo, hi] = NAME_GEN.brandLength;
    for (let i = 0; i < 500; i++) {
      const b = coinedBrand(rng);
      expect(b.length).toBeGreaterThanOrEqual(lo);
      expect(b.length).toBeLessThanOrEqual(hi);
      expect(BRAND_REJECT.some((re) => re.test(b))).toBe(false);
      expect(b[0]).toBe(b[0]!.toUpperCase());
    }
  });

  it('gives a sector-fitting suffix to two-word startup names', () => {
    const rng = rngOf(2);
    for (let i = 0; i < 200; i++) {
      const name = startupName(rng, 'energy');
      const parts = name.split(' ');
      if (parts.length > 1) expect(SECTOR_SUFFIXES.energy).toContain(parts.slice(1).join(' '));
    }
  });

  it('draws hundreds of distinct stems and descriptions', () => {
    const rng = rngOf(3);
    const stems = new Set(Array.from({ length: 400 }, () => placeStem(rng)));
    const blurbs = new Set(Array.from({ length: 400 }, () => startupBlurb(rng, 'fintech', [])));
    expect(stems.size).toBeGreaterThan(300);
    expect(blurbs.size).toBeGreaterThan(30);
    expect([...blurbs].every((b) => b.includes(' for '))).toBe(true);
  });
});

describe('generated startups', () => {
  it('never reuse a name and rarely repeat a description in the pipeline', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
    const rng = stream(s, 'ventureGen');
    for (let i = 0; i < 150; i++) generateStartup(s, rng, 'pipeline');
    const all = Object.values(s.ventures.startups);
    expect(new Set(all.map((x) => x.name)).size).toBe(all.length);
    const live = all.filter(isPrivate);
    const descriptions = new Set(live.map((x) => x.description));
    expect(descriptions.size / live.length).toBeGreaterThan(0.9);
  });
});
