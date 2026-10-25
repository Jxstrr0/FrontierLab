// Every city with storefronts can start a game, sits under exactly one region
// tab and has its own flavour line (DESIGN §5.2).
import { describe, expect, it } from 'vitest';
import { CITIES, START_CITIES } from '../../src/data/cities';
import {
  CITY_FLAVOUR,
  REGION_OPTIONS,
  citiesIn,
  nationOf,
  regionOf,
} from '../../src/app/newgame/choices';
import { newGame } from '../../src/sim/newGame';

describe('start cities', () => {
  it('offers every non-regional city and no regional site', () => {
    expect(START_CITIES.length).toBe(20);
    for (const id of START_CITIES) expect(CITIES[id]!.regional).toBeUndefined();
  });

  it('puts each start city under exactly one region tab', () => {
    const listed = REGION_OPTIONS.flatMap((r) => citiesIn(r.value));
    expect([...listed].sort()).toEqual([...START_CITIES].sort());
    for (const id of START_CITIES) expect(citiesIn(regionOf(id))).toContain(id);
  });

  it('gives each start city a flavour line and a country name', () => {
    for (const id of START_CITIES) {
      expect(CITY_FLAVOUR[id]).toBeTruthy();
      expect(nationOf(id)).not.toBe('Eurozone');
    }
  });

  it('starts a game at home in each city', () => {
    for (const id of START_CITIES) {
      const s = newGame({ seed: 7, cityId: id });
      expect(s.meta.homeCityId).toBe(id);
      expect(s.world.currentCityId).toBe(id);
      expect(Object.keys(s.world.lots).length).toBeGreaterThan(0);
    }
  });
});
