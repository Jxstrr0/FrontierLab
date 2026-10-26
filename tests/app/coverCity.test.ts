// Title cover choices (docs/COVER_SCREEN.md §8): which city is printed, the
// launch rotation, the camera kept inside the map, the strip size and DPR cap,
// the aim toward a returning player's flags, and the accessible label.
import { describe, expect, it } from 'vitest';
import {
  aimAtFlags,
  coverCamera,
  coverFocus,
  coverLabel,
  nextCoverIndex,
  pickCoverCity,
  stripDpr,
  stripSize,
} from '../../src/app/title/coverCity';
import { COVER_FLAG_REACH, COVER_MAX_PIXELS, COVER_PAN_PX } from '../../src/config/cover';
import { START_CITIES } from '../../src/data/cities';
import type { CoverMeta } from '../../src/sim/coverMeta';
import type { SaveMeta } from '../../src/sim/save/storage';

const meta = (cover?: Partial<CoverMeta>): SaveMeta => ({
  slot: 'auto',
  bankName: 'Northgate Trust',
  monogram: 'NT',
  brandInk: '#8E2F3C',
  date: '1 Jan 2025',
  day: 0,
  cash: 0,
  savedAt: 1,
  cover: cover && {
    cityId: 'sas',
    seed: 7,
    layout: 2,
    homeCityId: 'sas',
    competitors: 2,
    flags: [],
    rivals: {},
    ...cover,
  },
});

describe('pickCoverCity', () => {
  it('prints the save card’s city with its record', () => {
    const c = pickCoverCity(meta({ cityId: 'lon' }), 3, START_CITIES);
    expect(c).toMatchObject({ cityId: 'lon', returning: true, bankName: 'Northgate Trust' });
    expect(c.cover?.seed).toBe(7);
  });

  it('uses the rotation city for an older card without a cover', () => {
    const c = pickCoverCity(meta(), 1, START_CITIES);
    expect(c).toMatchObject({
      cityId: START_CITIES[1],
      returning: true,
      bankName: 'Northgate Trust',
    });
    expect(c.cover).toBeUndefined();
  });

  it('opens on Saskatoon for a new player and wraps after every city', () => {
    expect(START_CITIES).toHaveLength(20);
    expect(pickCoverCity(null, 0, START_CITIES)).toEqual({ cityId: 'sas', returning: false });
    expect(pickCoverCity(null, 20, START_CITIES).cityId).toBe('sas');
    expect(pickCoverCity(null, 21, START_CITIES).cityId).toBe(START_CITIES[1]);
    expect(nextCoverIndex(19, 20)).toBe(0);
    expect(nextCoverIndex(4, 20)).toBe(5);
  });

  it('falls back safely on unknown cities and bad indexes', () => {
    expect(pickCoverCity(meta({ cityId: 'atlantis' }), 2, START_CITIES).cityId).toBe(
      START_CITIES[2],
    );
    expect(pickCoverCity(null, -3, START_CITIES).cityId).toBe('sas');
    expect(pickCoverCity(null, 0, ['atlantis']).cityId).toBe('sas');
  });
});

describe('coverCamera', () => {
  const world = { width: 3000, height: 1800 };
  const view = { width: 400, height: 420 };

  it('centres on the focus when there is room', () => {
    const cam = coverCamera(world, view, 0.5, { x: 1500, y: 900 });
    expect(cam.x + view.width / 2 / cam.zoom).toBeCloseTo(1500);
    expect(cam.y + view.height / 2 / cam.zoom).toBeCloseTo(900);
  });

  it('keeps the strip inside the map near an edge', () => {
    const cam = coverCamera(world, view, 0.5, { x: 50, y: 1790 });
    expect(cam.x).toBe(0);
    expect(cam.y + view.height / cam.zoom).toBeCloseTo(world.height);
  });

  it('centres the map along an axis where the strip is wider', () => {
    const cam = coverCamera({ width: 600, height: 1800 }, view, 0.5, { x: 10, y: 900 });
    expect(cam.x).toBeCloseTo((600 - view.width / 0.5) / 2);
  });
});

describe('aiming', () => {
  const focus = { x: 1000, y: 1000 };
  it('pulls toward a nearby signature landmark and ignores a far one', () => {
    const near = coverFocus(focus, { x: 1200, y: 1100, heightPx: 0 });
    expect(near).toEqual({ x: 1100, y: 1050 });
    expect(coverFocus(focus, { x: 5000, y: 5000, heightPx: 0 })).toBe(focus);
  });

  it('frames the nearest flag with the district, or centres on a far one', () => {
    expect(aimAtFlags(focus, [])).toBe(focus);
    expect(
      aimAtFlags(focus, [
        { x: 1100, y: 1000 },
        { x: 4000, y: 4000 },
      ]),
    ).toEqual({
      x: 1050,
      y: 1000,
    });
    const far = { x: 1000 + COVER_FLAG_REACH + 50, y: 1000 };
    expect(aimAtFlags(focus, [far])).toBe(far);
  });
});

describe('strip', () => {
  it('adds the pan distance on both sides, scaled to the panel', () => {
    expect(stripSize({ width: 358, height: 420 })).toEqual({
      width: 358 + 2 * COVER_PAN_PX,
      height: 420,
      pan: COVER_PAN_PX,
    });
    expect(stripSize({ width: 716, height: 420 }).pan).toBe(2 * COVER_PAN_PX);
  });

  it('caps the backing store by lowering the pixel ratio', () => {
    expect(stripDpr({ width: 410, height: 420 }, 2, COVER_MAX_PIXELS)).toBe(2);
    const big = { width: 820, height: 800 };
    const dpr = stripDpr(big, 3, COVER_MAX_PIXELS);
    expect(dpr).toBeLessThan(3);
    expect(big.width * big.height * dpr * dpr).toBeLessThanOrEqual(COVER_MAX_PIXELS + 1);
  });
});

describe('coverLabel', () => {
  it('names the city and ink, and the flags for a returning player', () => {
    expect(coverLabel('sas', 0)).toBe('An engraved map of Saskatoon printed in prairie ochre.');
    expect(coverLabel('sas', 3)).toBe(
      'An engraved map of Saskatoon printed in prairie ochre, with your lab’s flags on three rooftops.',
    );
    expect(coverLabel('sas', 1)).toMatch(/one rooftop\.$/);
    expect(coverLabel('atlantis', 2)).toBe('An engraved city map');
  });
});
