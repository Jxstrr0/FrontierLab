import { describe, expect, it } from 'vitest';
import { CITY_LAYOUT } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { cityGeometry } from '../../src/sim/cityGeo';
import { isFrontage, isStreet, isWater, shoreRow } from '../../src/sim/cityLayout';
import { newGame } from '../../src/sim/newGame';

describe('city layout 1 (the original shared grid)', () => {
  it('runs streets every block and keeps them out of the water', () => {
    const city = CITIES.van!;
    const geo = cityGeometry(city, 1);
    expect(isStreet(geo, 0, 5)).toBe(true);
    expect(isStreet(geo, CITY_LAYOUT.block, 5)).toBe(true);
    expect(isStreet(geo, 1, 5)).toBe(false);
    const x = 9;
    expect(isWater(geo, x, shoreRow(city, x))).toBe(true);
    expect(isStreet(geo, x, shoreRow(city, x) + 1)).toBe(false);
  });

  it('has no shoreline in a city without water', () => {
    const dry = Object.values(CITIES).find((c) => !c.water);
    if (dry) expect(shoreRow(dry, 3)).toBe(Infinity);
  });

  it('puts every lot in every city on its own street-facing land tile', () => {
    for (const city of Object.values(CITIES)) {
      const s = newGame({ seed: 3, cityId: city.id, layout: 1 });
      const geo = cityGeometry(city, 1);
      const lots = Object.values(s.world.lots).filter((l) => l.cityId === city.id);
      const seen = new Set<string>();
      for (const lot of lots) {
        const { x, y } = lot.tile;
        expect(isFrontage(geo, x, y), `${city.id} ${x},${y}`).toBe(true);
        seen.add(`${x},${y}`);
      }
      expect(seen.size).toBe(lots.length);
    }
  });
});
