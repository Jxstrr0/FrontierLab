// City lot generation. Scatters storefront lots around district centres on the
// city's tile grid, snapped to tiles facing a street (cityPlacement.ts), seeded per
// city from the `citygen:{cityId}` stream so a city is identical every time.
// Lot values follow CONTENT §3 ("How a lot's values are derived").
import {
  CITYGEN,
  LEASE_DEPOSIT_WEEKS,
  LOT_COUNT_BY_SIZE,
  LOTS_BASE,
  LOTS_PER_RIVAL,
  LOT_INCOME_NOISE,
  LOT_RENT_NOISE,
  LOT_TRAFFIC_NOISE,
  RENT_TRAFFIC_EXP,
} from '../config/balance';
import type { LayoutVersion } from '../config/cityGeo';
import { CITIES, type CitySpec } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import type { DistrictId } from '../data/types';
import { geometryFor, placeNear } from './cityPlacement';
import { stream } from './rng';
import type { GameState, Lot } from './state';
import { dhypot, dpow } from './detmath';

/**
 * How many storefronts a city gets: layout 1 keeps the original count; later
 * layouts give a base plus room for each rival bank (LOTS_BASE, LOTS_PER_RIVAL).
 */
export function lotCount(city: CitySpec, layout: LayoutVersion, rivals: number): number {
  if (layout === 1) return LOT_COUNT_BY_SIZE[city.size];
  return Math.round(LOTS_BASE[city.size] + LOTS_PER_RIVAL[city.size] * rivals);
}

/** `total`: how many storefronts to place (lotCount). */
export function generateLots(state: GameState, cityId: string, total: number): Lot[] {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `citygen:${cityId}`);
  const geo = geometryFor(state, cityId);
  const shares = CITYGEN.districtShares[city.size];
  const used = new Set<string>();
  const lots: Lot[] = [];
  let index = 0;

  for (const [district, share] of Object.entries(shares) as [DistrictId, number][]) {
    if (district === 'waterfront' && !city.water) continue;
    const spec = DISTRICT_SPECS[district];
    const count = Math.max(1, Math.round(total * share));
    for (let i = 0; i < count; i++) {
      // Draw a point near the district centre, then snap it to the nearest free
      // tile facing a street (cityPlacement).
      const { x, y } = placeNear(city, geo, district, rng, used, 'lot');

      // A dense city scales traffic up (CitySpec.density); rent follows only the
      // lot's noise, since the city's rent level is already its rentIndex.
      const typical = spec.footTraffic * (city.density ?? 1);
      const footTraffic = Math.round(typical * rng.range(...LOT_TRAFFIC_NOISE));
      const weeklyRent = Math.round(
        spec.baseRent *
          city.rentIndex *
          dpow(footTraffic / typical, RENT_TRAFFIC_EXP) *
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
