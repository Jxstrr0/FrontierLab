// Expanding across cities for scripted strategies (DESIGN §5.2 "one global
// enterprise", ROADMAP Stage 8): one sales office per city (C2a), grown a size
// when it gets busy (growableOffice); a city without one gets one, the next
// city in a fixed order (the home country's other cities
// nearest first, then every other city by distance from home; regional sites
// never) and carry on there. Deterministic: the order
// depends only on the home city, and the choice only on the map.
import { CITIES } from '../../src/data/cities';
import * as cmd from '../../src/sim/commands';
import { cityDistanceKm } from '../../src/sim/geo';
import type { GameState, Lot } from '../../src/sim/state';
import { cityRoom } from '../../src/sim/branch/cityMarket';
import { nextSizeAddsReach, officeInCity } from '../../src/sim/branch/officeSize';
import type { Branch } from '../../src/sim/state';
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

/** A city still worth an office: not yet visited (so unknown), or without one and with a good free lot. */
export function hasRoom(state: GameState, cityId: string): boolean {
  if (!isGenerated(state, cityId)) return true;
  return !officeInCity(state, cityId) && goodLots(state, cityId).length > 0;
}

/** City room a scripted lab needs before it grows an office there. */
const GROW_MIN_ROOM = 0.2;

/** The office that should grow a size now (busiest first), if any. */
export function growableOffice(state: GameState): Branch | undefined {
  return Object.values(state.branches)
    .filter(
      (b) =>
        b.status === 'open' &&
        !b.converting &&
        nextSizeAddsReach(b) &&
        cityRoom(state, b.cityId) >= GROW_MIN_ROOM,
    )
    .sort((a, b) => b.waitIndex - a.waitIndex || (a.id < b.id ? -1 : 1))[0];
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
