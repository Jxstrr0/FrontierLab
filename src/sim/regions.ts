// New regions (post-C8, SIMULATION §20a): eight cities that open to flights at
// NEW_REGIONS.openWeek (the end of year 5), announced with REGIONS_OPENED. The
// first sales office you build in one pays a one-off market-entry licence by
// city size; an office bought from a rival comes with its licence.
import { NEW_REGIONS } from '../config/balance';
import { CITIES } from '../data/cities';
import { officeInCity } from './branch/officeSize';
import { pushEvent } from './events';
import { listPrice } from './nominal';
import type { GameState } from './state';

/** True once the new regions are open. */
export const regionsOpen = (state: GameState): boolean => state.clock.week >= NEW_REGIONS.openWeek;

/** Whether you can fly to `cityId` yet: every city, except a new region before it opens. */
export function cityOpen(state: GameState, cityId: string): boolean {
  return !CITIES[cityId]?.late || regionsOpen(state);
}

/** The market-entry licence a new sales office in `cityId` must pay now (0 when none is due). */
export function cityLicenceDue(state: GameState, cityId: string): number {
  const spec = CITIES[cityId];
  if (!spec?.late || state.world.cities[cityId]?.licensed || officeInCity(state, cityId)) return 0;
  return listPrice(state, NEW_REGIONS.licence[spec.size]);
}

/** Tick step 15: the week the regions open, the news says so. */
export function runRegions(state: GameState): void {
  if (state.clock.week !== NEW_REGIONS.openWeek) return;
  const names = Object.values(CITIES)
    .filter((c) => c.late)
    .map((c) => c.name);
  pushEvent(state, 'REGIONS_OPENED', { count: names.length, names: names.join(', ') }, 1);
}
