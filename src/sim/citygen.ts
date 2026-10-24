// City lot generation. Scatters storefront lots around district centres on the
// city's tile grid, snapped to tiles facing a street (cityLayout.ts), seeded per
// city from the `citygen:{cityId}` stream so a city is identical every time.
// Lot values follow CONTENT §3 ("How a lot's values are derived").
import {
  CITYGEN,
  LEASE_DEPOSIT_WEEKS,
  LOT_COUNT_BY_SIZE,
  LOT_INCOME_NOISE,
  LOT_RENT_NOISE,
  LOT_TRAFFIC_NOISE,
  RENT_TRAFFIC_EXP,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import type { DistrictId } from '../data/types';
import { nearestFrontage } from './cityLayout';
import { clamp } from './math';
import { stream } from './rng';
import type { GameState, Lot } from './state';
import { dhypot, dpow } from './detmath';

export function generateLots(state: GameState, cityId: string): Lot[] {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `citygen:${cityId}`);
  const shares = CITYGEN.districtShares[city.size];
  const total = LOT_COUNT_BY_SIZE[city.size];
  const used = new Set<string>();
  const lots: Lot[] = [];
  let index = 0;

  for (const [district, share] of Object.entries(shares) as [DistrictId, number][]) {
    if (district === 'waterfront' && !city.water) continue;
    const spec = DISTRICT_SPECS[district];
    const place = CITYGEN.layout[district];
    const count = Math.max(1, Math.round(total * share));
    for (let i = 0; i < count; i++) {
      // Draw a point near the district centre, then snap it to the nearest free
      // tile facing a street (cityLayout).
      const px = Math.round(
        clamp(rng.normal(place.cx, place.spread), CITYGEN.edge, 1 - CITYGEN.edge) *
          (city.tiles - 1),
      );
      const py = Math.round(
        clamp(rng.normal(place.cy, place.spread), CITYGEN.edge, 1 - CITYGEN.edge) *
          (city.tiles - 1),
      );
      const spot = nearestFrontage(city, px, py, used);
      if (!spot) throw new Error(`No room for another lot in ${city.name}`);
      const { x, y } = spot;
      used.add(`${x},${y}`);

      const footTraffic = Math.round(spec.footTraffic * rng.range(...LOT_TRAFFIC_NOISE));
      const weeklyRent = Math.round(
        spec.baseRent *
          city.rentIndex *
          dpow(footTraffic / spec.footTraffic, RENT_TRAFFIC_EXP) *
          rng.range(...LOT_RENT_NOISE),
      );
      index += 1;
      lots.push({
        id: `lot_${cityId}_${String(index).padStart(4, '0')}`,
        cityId,
        tile: { x, y },
        district,
        kind: 'storefront',
        address: `${rng.int(1, CITYGEN.maxStreetNumber)} ${rng.pick(STREET_NAMES)} ${rng.pick(STREET_KINDS)}`,
        footTraffic,
        mix: { ...spec.mix },
        incomeIndex: spec.income * city.incomeIndex * rng.range(...LOT_INCOME_NOISE),
        homeownerShare: spec.homeowners,
        weeklyRent,
        deposit: weeklyRent * LEASE_DEPOSIT_WEEKS,
        buildingSeed: rng.int(0, CITYGEN.maxSeed),
      });
    }
  }
  return lots;
}

/** Straight-line tile distance between two lots. */
export function tileDistance(a: Lot, b: Lot): number {
  return dhypot(a.tile.x - b.tile.x, a.tile.y - b.tile.y);
}
