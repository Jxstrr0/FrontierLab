// Buildings for sale (SIMULATION §21.1): every REAL_ESTATE.refreshWeeks weeks a
// city lists a share of the property buildings nobody in the game owns (at
// least one), each with an estimate from size, market rent and the country's
// cre, an asking price around it and the building's occupancy. Listings that
// aren't picked again disappear. Draws come from the `realEstate` stream.
import { REAL_ESTATE } from '../config/balance';
import { cityCre, estimateValue, marketRentFor } from './propertyMath';
import { stream } from './rng';
import type { GameState, Site } from './state';

/** Property buildings in a city, in id order. */
export function propertySites(state: GameState, cityId: string): Site[] {
  return Object.values(state.world.sites)
    .filter((s) => s.kind === 'property' && s.cityId === cityId && s.property)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Replaces the city's listings with a fresh pick of unowned buildings. */
export function refreshListings(state: GameState, cityId: string): void {
  const re = state.realEstate;
  const rng = stream(state, 'realEstate');
  for (const [id, l] of Object.entries(re.listings)) {
    if (state.world.sites[l.siteId]?.cityId === cityId) delete re.listings[id];
  }
  re.listingsRefreshWeek[cityId] = state.clock.week + REAL_ESTATE.refreshWeeks;
  const pool = propertySites(state, cityId).filter((s) => !re.properties[s.id]);
  if (pool.length === 0) return;
  const n = Math.min(pool.length, Math.max(1, Math.round(pool.length * REAL_ESTATE.listedShare)));
  // Partial Fisher–Yates: the first n entries become the listed buildings.
  for (let i = 0; i < n; i++) {
    const j = rng.int(i, pool.length - 1);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const cre = cityCre(state, cityId);
  const [occLo, occHi] = REAL_ESTATE.startOcc;
  const [askLo, askHi] = REAL_ESTATE.askRange;
  for (const site of pool.slice(0, n)) {
    const b = site.property!;
    b.occupancy ??= rng.range(occLo, occHi);
    const estimate = estimateValue(b.sqm, marketRentFor(site), cre);
    re.listings[site.id] = {
      siteId: site.id,
      estimate,
      asking: estimate * rng.range(askLo, askHi),
      occupancy: b.occupancy,
      listedWeek: state.clock.week,
    };
  }
}

/** Keeps every listing's estimate on today's cre; the asking price stays as listed. */
export function markListings(state: GameState): void {
  for (const l of Object.values(state.realEstate.listings)) {
    const site = state.world.sites[l.siteId];
    if (!site?.property) continue;
    l.estimate = estimateValue(site.property.sqm, marketRentFor(site), cityCre(state, site.cityId));
  }
}

/** First listings in every generated city (new games and the 7 → 8 migration). */
export function seedListings(state: GameState): void {
  for (const cityId of Object.keys(state.world.cities).sort()) refreshListings(state, cityId);
}
