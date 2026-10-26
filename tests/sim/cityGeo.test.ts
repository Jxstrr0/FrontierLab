// Per-city geography (layout versions, cityGeo.ts): layout 2 fits every lot and
// site of every city for many seeds, bridges and the big park behave, layout 1
// is exactly the original grid (old saves never move).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generateCityMap } from '../../src/art/citygen';
import { CITY_LAYOUT } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { cityLook, CITY_LOOKS } from '../../src/data/cityLooks';
import { cityGeometry } from '../../src/sim/cityGeo';
import { isFrontage } from '../../src/sim/cityLayout';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { mapDigest, placesDigest } from '../helpers/layoutDigest';
import { fly } from '../helpers/world';

const digests = JSON.parse(
  readFileSync(new URL('../fixtures/layout1-digests.json', import.meta.url), 'utf8'),
) as Record<'newGame11' | 'save', Record<string, { places: string; map: string }>>;

function cityMap(s: GameState, cityId: string) {
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  const offices = Object.values(s.world.officeListings).filter((o) => o.cityId === cityId);
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === cityId);
  const layout = s.world.cities[cityId]!.layout;
  return generateCityMap(CITIES[cityId]!, s.meta.seed, lots, { offices, sites, layout });
}

/** Every lot, office and site of the city on its own frontage tile of its layout. */
function expectAllOnFrontage(s: GameState, cityId: string) {
  const geo = cityGeometry(CITIES[cityId]!, s.world.cities[cityId]!.layout);
  const placed = [
    ...Object.values(s.world.lots),
    ...Object.values(s.world.officeListings),
    ...Object.values(s.world.sites),
  ].filter((p) => p.cityId === cityId);
  const seen = new Set<string>();
  for (const p of placed) {
    expect(isFrontage(geo, p.tile.x, p.tile.y), `${cityId} ${p.id}`).toBe(true);
    seen.add(`${p.tile.x},${p.tile.y}`);
  }
  expect(seen.size).toBe(placed.length);
}

describe('layout 2 geography', () => {
  it('fits every lot and site of every city for many seeds', () => {
    for (const seed of [1, 7, 42, 99, 2024]) {
      for (const id of Object.keys(CITIES)) {
        const s = newGame({ seed, cityId: id });
        expect(s.world.cities[id]!.layout).toBe(2);
        expectAllOnFrontage(s, id);
      }
    }
  }, 120_000);

  it('gives each storefront city its own look, with water where it has water', () => {
    const shapes = new Set<string>();
    for (const city of Object.values(CITIES)) {
      const geo = cityGeometry(city, 2);
      const water = geo.water.reduce((a, v) => a + v, 0) / geo.water.length;
      if (city.water) expect(water, city.id).toBeGreaterThan(0.04);
      else expect(water).toBe(0);
      if (!city.regional) shapes.add(Array.from(geo.water).join(''));
    }
    expect(shapes.size).toBe(Object.values(CITIES).filter((c) => !c.regional).length);
  });

  it('bridges only cross water between land streets, on street lines', () => {
    for (const city of Object.values(CITIES)) {
      const geo = cityGeometry(city, 2);
      const n = geo.tiles;
      for (let i = 0; i < n * n; i++) {
        const b = geo.bridge[i]!;
        if (!b) continue;
        const x = i % n;
        const y = (i - x) / n;
        expect(geo.water[i]).toBe(1);
        if (b & 1) expect(y % CITY_LAYOUT.block).toBe(0);
        if (b & 2) expect(x % CITY_LAYOUT.block).toBe(0);
      }
    }
    const rivers = Object.values(CITIES).filter((c) => cityLook(c.id).water === 'river');
    for (const city of rivers) {
      expect(
        cityGeometry(city, 2).bridge.some((v) => v > 0),
        city.id,
      ).toBe(true);
    }
  });

  it('keeps lots, buildings and landmarks out of the big park', () => {
    const parkCities = Object.keys(CITY_LOOKS).filter((id) => CITY_LOOKS[id]!.bigPark);
    expect(parkCities.length).toBeGreaterThan(0);
    for (const id of parkCities) {
      const s = newGame({ seed: 5, cityId: id });
      const map = cityMap(s, id);
      const park = map.geo.park;
      expect(park.some((v) => v === 1)).toBe(true);
      for (let i = 0; i < park.length; i++) if (park[i]) expect(map.kind[i]).toBe(2);
    }
  });

  it('seats water signatures by the water, facing it', () => {
    for (const id of ['lon', 'syd', 'sfo', 'van', 'sas']) {
      const s = newGame({ seed: 8, cityId: id });
      const sig = cityMap(s, id).landmarks.find((l) => l.id === 'signature')!;
      expect(sig.waterSide, id).toBeDefined();
    }
  });

  it('places cities first visited later at layout 2 too', () => {
    const s = newGame({ seed: 4, cityId: 'cal' });
    s.company.cash += 5_000_000;
    fly(s, 'tyo');
    expect(s.world.cities.tyo!.layout).toBe(2);
    expectAllOnFrontage(s, 'tyo');
  });
});

describe('layout 1 never changes', () => {
  it('generates the same lots, sites and map as before layout versions', () => {
    for (const id of Object.keys(CITIES)) {
      // Cities added after layout 2 (Moscow, St Petersburg) never had a layout 1.
      if (!digests.newGame11[id]) continue;
      const s = newGame({ seed: 11, cityId: id, layout: 1 });
      expect(placesDigest(s, id), id).toBe(digests.newGame11[id]!.places);
      expect(mapDigest(cityMap(s, id)), id).toBe(digests.newGame11[id]!.map);
    }
  });
});
