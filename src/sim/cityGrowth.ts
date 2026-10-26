// Cities grow (CONTENT §3, DESIGN §5.2): every few years each generated city
// opens new storefronts across its districts, so a long game never runs out of
// corners for you or the rivals. New lots come from the city's own
// `citygrow:{cityId}` stream, are quoted at today's price list, and avoid every
// tile already used by a lot, office or site. A city with no free street
// frontage left simply stops growing.
import { CITY_GROWTH, CITYGEN, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import type { DistrictId } from '../data/types';
import { rollLot } from './citygen';
import { geometryFor } from './cityPlacement';
import { pushEvent } from './events';
import { stream } from './rng';
import type { GameState } from './state';

/** Tiles already taken in a city by lots, office listings and sites. */
function usedTiles(state: GameState, cityId: string): Set<string> {
  const used = new Set<string>();
  const add = (x: { cityId: string; tile: { x: number; y: number } }) => {
    if (x.cityId === cityId) used.add(`${x.tile.x},${x.tile.y}`);
  };
  Object.values(state.world.lots).forEach(add);
  Object.values(state.world.officeListings).forEach(add);
  Object.values(state.world.sites).forEach(add);
  return used;
}

/** Storefronts a city may add this time (0 once it has grown by maxGrowth × its start). */
export function growthLots(state: GameState, cityId: string): number {
  const city = state.world.cities[cityId];
  if (!city?.generated || CITIES[cityId]?.regional) return 0;
  const total = Object.values(state.world.lots).filter((l) => l.cityId === cityId).length;
  const grown = city.grownLots ?? 0;
  const base = total - grown;
  const room = Math.floor(base * CITY_GROWTH.maxGrowth) - grown;
  return Math.max(0, Math.min(room, Math.max(1, Math.round(base * CITY_GROWTH.share))));
}

/** Adds up to `count` storefronts to a city; returns how many fit. */
export function growCity(state: GameState, cityId: string, count: number): number {
  const spec = CITIES[cityId];
  const city = state.world.cities[cityId];
  if (!spec || !city || count <= 0) return 0;
  const rng = stream(state, `citygrow:${cityId}`);
  const geo = geometryFor(state, cityId);
  const used = usedTiles(state, cityId);
  const districts = (Object.entries(CITYGEN.districtShares[spec.size]) as [DistrictId, number][])
    .filter(([d]) => d !== 'waterfront' || spec.water)
    .map(([item, weight]) => ({ item, weight }));
  let added = 0;
  for (let i = 0; i < count; i++) {
    const district = rng.pickWeighted(districts);
    const n = (city.grownLots ?? 0) + 1;
    const id = `lot_${cityId}_g${String(n).padStart(3, '0')}`;
    try {
      state.world.lots[id] = rollLot(state, { city: spec, geo, district, rng, used, id });
    } catch {
      break; // No free street frontage left near the district centre.
    }
    city.grownLots = n;
    added += 1;
  }
  return added;
}

/** Year end (tick step 14): every everyYears, each generated city adds its share of storefronts. */
export function growCities(state: GameState): void {
  const year = Math.round(state.clock.week / WEEKS_PER_YEAR);
  if (year <= 0 || year % CITY_GROWTH.everyYears !== 0) return;
  for (const cityId of Object.keys(state.world.cities).sort()) {
    const added = growCity(state, cityId, growthLots(state, cityId));
    if (added > 0) pushEvent(state, 'CITY_GROWTH', { city: cityId, lots: added });
  }
}
