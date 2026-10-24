import { describe, expect, it } from 'vitest';
import { CITY_LAYOUT } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { isFrontage, isStreet, isWater, shoreRow } from '../../src/sim/cityLayout';
import { newGame } from '../../src/sim/newGame';

describe('city layout', () => {
  it('runs streets every block and keeps them out of the water', () => {
    const city = CITIES.van!;
    expect(isStreet(city, 0, 5)).toBe(true);
    expect(isStreet(city, CITY_LAYOUT.block, 5)).toBe(true);
    expect(isStreet(city, 1, 5)).toBe(false);
    const x = 9;
    expect(isWater(city, x, shoreRow(city, x))).toBe(true);
    expect(isStreet(city, x, shoreRow(city, x) + 1)).toBe(false);
  });

  it('has no shoreline in a city without water', () => {
    const dry = Object.values(CITIES).find((c) => !c.water);
    if (dry) expect(shoreRow(dry, 3)).toBe(Infinity);
  });

  it('puts every lot in every city on its own street-facing land tile', () => {
    for (const city of Object.values(CITIES)) {
      const s = newGame({ seed: 3, cityId: city.id });
      const lots = Object.values(s.world.lots).filter((l) => l.cityId === city.id);
      const seen = new Set<string>();
      for (const lot of lots) {
        const { x, y } = lot.tile;
        expect(isFrontage(city, x, y), `${city.id} ${x},${y}`).toBe(true);
        seen.add(`${x},${y}`);
      }
      expect(seen.size).toBe(lots.length);
    }
  });
});

describe('3 → 4 migration', () => {
  it('moves off-street lots onto free frontage and leaves good ones alone', async () => {
    const { migrate } = await import('../../src/sim/save/migrations');
    const s = newGame({ seed: 5, cityId: 'cal' });
    const lots = Object.values(s.world.lots);
    const keep = { ...lots[0]!.tile };
    lots[1]!.tile = { x: 0, y: 0 }; // a street corner
    const raw = JSON.parse(JSON.stringify(s));
    raw.schemaVersion = 3;
    const up = migrate(raw) as unknown as typeof s;
    const city = CITIES.cal!;
    const moved = Object.values(up.world.lots);
    expect(moved[0]!.tile).toEqual(keep);
    for (const lot of moved) expect(isFrontage(city, lot.tile.x, lot.tile.y)).toBe(true);
    expect(new Set(moved.map((l) => `${l.tile.x},${l.tile.y}`)).size).toBe(moved.length);
  });
});
