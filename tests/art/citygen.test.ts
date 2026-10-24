import { describe, expect, it } from 'vitest';
import { generateCityMap, tileAt } from '../../src/art/citygen';
import { tileCenter, worldToTile } from '../../src/art/iso';
import { CITIES } from '../../src/data/cities';
import { newGame } from '../../src/sim/newGame';

function mapFor(cityId: string, seed = 11) {
  const s = newGame({ seed, cityId });
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  return { map: generateCityMap(CITIES[cityId]!, seed, lots), lots };
}

describe('city map generation', () => {
  it('is the same for the same save seed and differs for another', () => {
    const a = mapFor('cal').map;
    const b = mapFor('cal').map;
    const c = mapFor('cal', 12).map;
    expect(Buffer.from(a.kind)).toEqual(Buffer.from(b.kind));
    expect(Buffer.from(a.seed)).not.toEqual(Buffer.from(c.seed));
  });

  it('marks every lot and places all four landmarks (only the airport at regional sites)', () => {
    for (const id of Object.keys(CITIES)) {
      const { map, lots } = mapFor(id);
      for (const lot of lots) {
        const t = tileAt(map, lot.tile.x, lot.tile.y)!;
        expect(t.kind).toBe('lot');
        expect(t.lotId).toBe(lot.id);
        expect(t.floors).toBeGreaterThan(0);
      }
      expect(map.landmarks.map((l) => l.id).sort()).toEqual(
        CITIES[id]!.regional
          ? ['airport']
          : ['airport', 'centralBank', 'clockTower', 'stadium'].sort(),
      );
      for (const lm of map.landmarks)
        expect(tileAt(map, lm.x + 1, lm.y + 1)!.kind).toBe('landmark');
    }
  });

  it('has water only in water cities and some parks', () => {
    const { map } = mapFor('cal');
    const kinds = new Set(Array.from({ length: map.tiles ** 2 }, (_, i) => map.kind[i]));
    expect(kinds.has(2)).toBe(true); // park
    const water = CITIES.cal!.water;
    expect(kinds.has(1)).toBe(water);
  });
});

describe('offices and sites on the map (Stage 4)', () => {
  it('marks office and site tiles, keeps lots, and keeps landmarks and parks off them', () => {
    for (const id of Object.keys(CITIES)) {
      const s = newGame({ seed: 11, cityId: id });
      const lots = Object.values(s.world.lots).filter((l) => l.cityId === id);
      const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === id);
      const sites = Object.values(s.world.sites).filter((x) => x.cityId === id);
      const map = generateCityMap(CITIES[id]!, 11, lots, { offices, sites });
      for (const o of offices) {
        const t = tileAt(map, o.tile.x, o.tile.y)!;
        expect(t.kind).toBe('office');
        expect(t.officeId).toBe(o.id);
        expect(t.floors).toBeGreaterThan(o.floors);
      }
      for (const x of sites) {
        const t = tileAt(map, x.tile.x, x.tile.y)!;
        expect(t.kind).toBe('site');
        expect(t.siteId).toBe(x.id);
        expect(t.siteKind).toBe(x.kind);
      }
      for (const lot of lots) expect(tileAt(map, lot.tile.x, lot.tile.y)!.kind).toBe('lot');
      expect(map.landmarks).toHaveLength(CITIES[id]!.regional ? 1 : 4);
    }
  });

  it('draws the same map without places as before Stage 4', () => {
    const s = newGame({ seed: 11, cityId: 'cal' });
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const a = generateCityMap(CITIES.cal!, 11, lots);
    const b = generateCityMap(CITIES.cal!, 11, lots, {});
    expect(Buffer.from(a.kind)).toEqual(Buffer.from(b.kind));
    expect(a.officeAt.size + a.siteAt.size).toBe(0);
  });
});

describe('isometric projection', () => {
  it('round-trips a tile centre', () => {
    const c = tileCenter(52, 10, 7);
    const t = worldToTile(52, c);
    expect(t.x).toBeCloseTo(10.5);
    expect(t.y).toBeCloseTo(7.5);
  });
});
