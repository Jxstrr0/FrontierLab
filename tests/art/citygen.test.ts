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

  it('marks every lot and places all four landmarks off the lots', () => {
    for (const id of Object.keys(CITIES)) {
      const { map, lots } = mapFor(id);
      for (const lot of lots) {
        const t = tileAt(map, lot.tile.x, lot.tile.y)!;
        expect(t.kind).toBe('lot');
        expect(t.lotId).toBe(lot.id);
        expect(t.floors).toBeGreaterThan(0);
      }
      expect(map.landmarks.map((l) => l.id).sort()).toEqual(
        ['airport', 'centralBank', 'clockTower', 'stadium'].sort(),
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

describe('isometric projection', () => {
  it('round-trips a tile centre', () => {
    const c = tileCenter(52, 10, 7);
    const t = worldToTile(52, c);
    expect(t.x).toBeCloseTo(10.5);
    expect(t.y).toBeCloseTo(7.5);
  });
});
