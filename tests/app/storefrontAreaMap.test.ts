// Storefront area map model (SCREENS §3): the window of tiles around a lot,
// centred on it, with dots for nearby branches (yours in your ink, rivals' in
// theirs), the RIVAL_RADIUS ring and district layers from a real city map.
import { describe, expect, it } from 'vitest';
import { generateCityMap, TILE_KINDS } from '../../src/art/citygen';
import {
  AREA_BOX,
  areaMapModel,
  diamondsPath,
  type AreaGrid,
} from '../../src/app/storefront/areaMap';
import { RIVAL_RADIUS } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import { DISTRICTS } from '../../src/data/types';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { GameState, Lot } from '../../src/sim/state';

function game(): GameState {
  return newGame({ seed: 42, cityId: 'cal', bankName: 'Area Bank' });
}

const lotsIn = (s: GameState) => Object.values(s.world.lots).filter((l) => l.cityId === 'cal');

/** Every tile a midtown building, lots marked as lots. */
function flatGrid(s: GameState): AreaGrid {
  const n = CITIES.cal!.tiles;
  const kind = new Uint8Array(n * n).fill(TILE_KINDS.indexOf('building'));
  const district = new Uint8Array(n * n).fill(DISTRICTS.indexOf('midtown'));
  for (const l of lotsIn(s)) kind[l.tile.y * n + l.tile.x] = TILE_KINDS.indexOf('lot');
  return { tiles: n, kind, district };
}

/** A lot with another free lot within the competition radius. */
function pair(s: GameState): [Lot, Lot] {
  const lots = lotsIn(s).filter((l) => !l.occupant);
  for (const a of lots) {
    const b = lots.find(
      (o) => o !== a && Math.hypot(o.tile.x - a.tile.x, o.tile.y - a.tile.y) <= RIVAL_RADIUS / 2,
    );
    if (b) return [a, b];
  }
  throw new Error('no nearby lots');
}

describe('storefront area map', () => {
  it('centres on the lot and keeps every tile inside the box', () => {
    const s = game();
    const lot = lotsIn(s)[0]!;
    const m = areaMapModel(s, lot, flatGrid(s));
    expect(m.centre).toEqual({ x: AREA_BOX.w / 2, y: AREA_BOX.h / 2 });
    const all = Object.values(m.layers).flat();
    expect(all.length).toBeGreaterThan(100);
    for (const [x, y] of all) {
      expect(x).toBeGreaterThan(-m.half.w);
      expect(x).toBeLessThan(AREA_BOX.w + m.half.w);
      expect(y).toBeGreaterThan(-m.half.h);
      expect(y).toBeLessThan(AREA_BOX.h + m.half.h);
    }
    // The 2:1 iso ring for RIVAL_RADIUS fits in the box.
    expect(m.ring.tiles).toBe(RIVAL_RADIUS);
    expect(m.ring.rx).toBeCloseTo(m.ring.ry * 2);
    expect(m.ring.rx).toBeLessThan(AREA_BOX.w / 2);
    expect(m.ring.ry).toBeLessThan(AREA_BOX.h / 2);
  });

  it('shows your branch and a rival branch as dots, never the lot itself', () => {
    const s = game();
    const [lot, near] = pair(s);
    expect(cmd.buildBranch(s, { lotId: near.id, build: REFERENCE_BUILDS.basic }).ok).toBe(true);
    const rival = Object.values(s.rivals)[0]!;
    const third = lotsIn(s).find(
      (l) =>
        !l.occupant &&
        l !== lot &&
        Math.hypot(l.tile.x - lot.tile.x, l.tile.y - lot.tile.y) <= RIVAL_RADIUS / 2,
    );
    if (third) third.occupant = { type: 'rival', id: rival.id };
    const m = areaMapModel(s, lot, flatGrid(s));
    const own = m.dots.filter((d) => d.kind === 'own');
    expect(own.length).toBeGreaterThanOrEqual(1);
    expect(own.every((d) => d.ink === s.meta.brandInk)).toBe(true);
    if (third) expect(m.dots.some((d) => d.kind === 'rival' && d.ink === rival.ink)).toBe(true);
    expect(m.dots.some((d) => d.x === m.centre.x && d.y === m.centre.y)).toBe(false);
    // Your dots draw last (on top).
    expect(m.dots[m.dots.length - 1]!.kind).toBe('own');
    // Occupied lots print as buildings; free ones as open lots.
    expect(m.layers.open?.length ?? 0).toBeGreaterThan(0);
  });

  it('sorts a real city into district, street and other layers', () => {
    const s = game();
    const lot = lotsIn(s)[0]!;
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lotsIn(s), {
      layout: s.world.cities.cal?.layout,
    });
    const m = areaMapModel(s, lot, map);
    expect(m.layers[lot.district]?.length ?? 0).toBeGreaterThan(0);
    // Streets stay bare paper, so fewer tiles draw than fit in the box.
    const drawn = Object.values(m.layers).flat().length;
    const fit = (AREA_BOX.w * AREA_BOX.h) / (m.half.w * m.half.h * 2);
    expect(drawn).toBeLessThan(fit);
    for (const l of m.labels) {
      expect(Math.hypot(l.x - m.centre.x, l.y - m.centre.y)).toBeGreaterThan(20);
    }
  });

  it('draws one closed diamond per centre', () => {
    const d = diamondsPath(
      [
        [10, 10],
        [30, 20],
      ],
      { w: 8, h: 4 },
    );
    expect(d).toBe('M10 6L18 10L10 14L2 10ZM30 16L38 20L30 24L22 20Z');
    expect(diamondsPath([[10, 10]], { w: 8, h: 4 }, 0.5)).toBe('M10 8L14 10L10 12L6 10Z');
  });
});
