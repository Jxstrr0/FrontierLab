// Expanding across cities for scripted strategies (DESIGN §5.2 "one global
// enterprise", ROADMAP Stage 8): build in the city you're in while it has a
// good free lot and room for another branch (CITY_BRANCH_GUIDE); once it runs
// out, fly to the next city in a fixed order (the home country's other cities
// nearest first, then every other city by distance from home; regional sites
// never) and carry on there. Deterministic: the order
// depends only on the home city, and the choice only on the map.
import { CITIES } from '../../src/data/cities';
import * as cmd from '../../src/sim/commands';
import { cityDistanceKm } from '../../src/sim/geo';
import type { GameState, Lot } from '../../src/sim/state';
import { cityBranchGuide } from '../../src/sim/branch/cityMarket';
import { isGenerated } from '../../src/sim/worldGen';
import { bestLot, goodLots } from './common';

/** Every city a scripted bank may expand into, in the order it tries them. */
export function expansionOrder(home: string): string[] {
  const country = CITIES[home]?.country;
  const byDistance = (a: string, b: string) =>
    cityDistanceKm(home, a) - cityDistanceKm(home, b) || a.localeCompare(b);
  const others = Object.keys(CITIES).filter((id) => id !== home && !CITIES[id]!.regional);
  const domestic = others.filter((id) => CITIES[id]!.country === country).sort(byDistance);
  const abroad = others.filter((id) => CITIES[id]!.country !== country).sort(byDistance);
  return [home, ...domestic, ...abroad];
}

/**
 * A city still worth building in: not yet visited (so unknown), or with a good
 * free lot and fewer of our branches than the city supports (CITY_BRANCH_GUIDE).
 */
export function hasRoom(state: GameState, cityId: string): boolean {
  if (!isGenerated(state, cityId)) return true;
  const ours = Object.values(state.branches).filter(
    (b) => b.cityId === cityId && b.status !== 'closed',
  ).length;
  return ours < cityBranchGuide(cityId) && goodLots(state, cityId).length > 0;
}

/**
 * The best good lot to build on next, flying to the next city with room when
 * the current one has none. Returns undefined when every city is full.
 */
export function nextExpansionLot(state: GameState): Lot | undefined {
  if (!hasRoom(state, state.world.currentCityId)) {
    const next = expansionOrder(state.meta.homeCityId).find((id) => hasRoom(state, id));
    if (!next || !cmd.travelTo(state, next).ok) return undefined;
  }
  return bestLot(state, true);
}

/** True when the city you're in has no good free lot left. */
export function cityFull(state: GameState): boolean {
  return !hasRoom(state, state.world.currentCityId);
}
