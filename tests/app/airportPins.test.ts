// Stage 8 map pins: every city and regional site shows exactly one airport pin
// (whatever the Layers say), and regional maps have no central bank.
import { describe, expect, it } from 'vitest';
import { landmarkCentre } from '../../src/app/map/landmarkPins';
import { buildPins } from '../../src/app/map/pins';
import { mapPlaces } from '../../src/app/map/mapScene';
import { generateCityMap } from '../../src/art/citygen';
import { FEATURES } from '../../src/config/balance';
import { CITIES, DESTINATIONS } from '../../src/data/cities';
import { MAP_LAYER_IDS } from '../../src/data/mapLayers';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';

const STAGE8 = { ...FEATURES, multiCity: true };

function pinsFor(s: GameState, cityId: string, features = STAGE8) {
  const city = CITIES[cityId]!;
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  const map = generateCityMap(city, s.meta.seed, lots, mapPlaces(s, cityId));
  return { map, pins: buildPins(s, map, lots, features) };
}

describe('airport pins (Stage 8)', () => {
  // One game that visits everywhere, so every city is generated as in play.
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
  for (const id of DESTINATIONS) if (id !== 'cal') cmd.travelTo(s, id);

  it('puts exactly one airport pin on every city and regional map', () => {
    for (const id of DESTINATIONS) {
      const { pins } = pinsFor(s, id);
      const airports = pins.filter((p) => p.kind === 'airport');
      expect(airports, id).toHaveLength(1);
      expect(airports[0]!.id).toBe(`ap_${id}`);
      expect(airports[0]!.label).toContain(CITIES[id]!.airport.name);
    }
  });

  it('gives regional sites no central bank pin, and cities one', () => {
    for (const id of DESTINATIONS) {
      const { pins, map } = pinsFor(s, id);
      const cb = pins.filter((p) => p.kind === 'centralBank');
      expect(cb, id).toHaveLength(CITIES[id]!.regional ? 0 : 1);
      if (CITIES[id]!.regional) expect(map.landmarks.map((l) => l.id)).toEqual(['airport']);
    }
  });

  it('keeps the airport when every layer is off, and drops it before Stage 8', () => {
    const layers = Object.fromEntries(MAP_LAYER_IDS.map((l) => [l, false]));
    cmd.setSettings(s, { layers });
    expect(pinsFor(s, 'lon').pins.map((p) => p.kind)).toEqual(['airport']);
    cmd.setSettings(s, { layers: {} });
    const before = pinsFor(s, 'lon', { ...FEATURES, multiCity: false }).pins;
    expect(before.some((p) => p.kind === 'airport')).toBe(false);
  });

  it('can frame the airport landmark on every map', () => {
    for (const id of DESTINATIONS) {
      const { map } = pinsFor(s, id);
      expect(landmarkCentre(map, 'airport'), id).toBeDefined();
    }
  });
});
