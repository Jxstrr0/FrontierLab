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
import type { CityGeometry } from './cityGeo';
import { geometryFor, placeNear } from './cityPlacement';
import { listLevel } from './nominal';
import { stream, type Rng } from './rng';
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
    const count = Math.max(1, Math.round(total * share));
    for (let i = 0; i < count; i++) {
      index += 1;
      const id = `lot_${cityId}_${String(index).padStart(4, '0')}`;
      lots.push(rollLot(state, { city, geo, district, rng, used, id }));
    }
  }
  return lots;
}

/**
 * One storefront near a district centre: a free street-facing tile, then its
 * traffic, rent, mix and income from the district (CONTENT §3). Rent is quoted
 * at today's price list (§4.6), which is 1 when a game starts.
 */
export function rollLot(
  state: GameState,
  at: {
    city: CitySpec;
    geo: CityGeometry;
    district: DistrictId;
    rng: Rng;
    used: Set<string>;
    id: string;
  },
): Lot {
  const { city, geo, district, rng, used, id } = at;
  const spec = DISTRICT_SPECS[district];
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
      rng.range(...LOT_RENT_NOISE) *
      listLevel(state, city.id),
  );
  return {
    id,
    cityId: city.id,
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
  };
}

/** Straight-line tile distance between two lots. */
export function tileDistance(a: Lot, b: Lot): number {
  return dhypot(a.tile.x - b.tile.x, a.tile.y - b.tile.y);
}

/**
 * A storefront that counts as a city's spare room for rival growth (§18.4):
 * a free one, or one a business holds (C5a), so businesses don't shrink the
 * city's measure. Only free storefronts can actually be leased.
 */
export const roomLot = (l: Lot): boolean => !l.occupant || l.occupant.type === 'business';
