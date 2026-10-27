// Landmark towers (SIMULATION §16.1): a city in LANDMARK_TOWERS gets one extra
// office listing in its Financial District, with the table's floor count and
// wide (32-desk) floors, rented at the usual per-floor rate. Placed after every
// other site from its own `tower:{cityId}` stream, so nothing else moves. Run
// at city generation and by the 24 → 25 save migration.
import {
  CITYGEN,
  DESKS_PER_FLOOR_OPTIONS,
  OFFICE_DEPOSIT_WEEKS,
  OFFICE_LISTINGS,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { LANDMARK_TOWERS } from '../data/landmarkTowers';
import { geometryFor, placeNear } from './cityPlacement';
import { officeRent } from './hqSites';
import { stream } from './rng';
import type { GameState, OfficeListing } from './state';

/** Desks per floor in a landmark tower: the wide, open-plan option. */
const TOWER_DESKS = Math.max(...DESKS_PER_FLOOR_OPTIONS) as 24 | 32;

/** The listing id of a city's landmark tower. */
export const towerListingId = (cityId: string): string => `office_${cityId}_tower`;

/** Adds the city's landmark tower listing, if it has one and it isn't there yet. */
export function generateLandmarkTower(state: GameState, cityId: string): void {
  const spec = LANDMARK_TOWERS[cityId];
  const city = CITIES[cityId];
  if (!spec || !city || city.regional) return;
  const id = towerListingId(cityId);
  if (state.world.officeListings[id]) return;
  const used = new Set<string>();
  const mark = (t: { x: number; y: number }) => used.add(`${t.x},${t.y}`);
  for (const lot of Object.values(state.world.lots)) if (lot.cityId === cityId) mark(lot.tile);
  for (const o of Object.values(state.world.officeListings)) if (o.cityId === cityId) mark(o.tile);
  for (const s of Object.values(state.world.sites)) if (s.cityId === cityId) mark(s.tile);
  const rng = stream(state, `tower:${cityId}`);
  const tile = placeNear(city, geometryFor(state, cityId), 'financial', rng, used);
  const weeklyRent = officeRent(state, spec.floors, cityId);
  const listing: OfficeListing = {
    id,
    cityId,
    tile,
    district: 'financial',
    address: spec.address,
    floors: spec.floors,
    desksPerFloor: TOWER_DESKS,
    area: spec.floors * TOWER_DESKS * OFFICE_LISTINGS.areaPerDesk,
    weeklyRent,
    deposit: weeklyRent * OFFICE_DEPOSIT_WEEKS,
    buildingSeed: rng.int(0, CITYGEN.maxSeed),
  };
  state.world.officeListings[id] = listing;
}
