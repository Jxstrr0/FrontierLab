// The title screen's "Living skyline" (docs/COVER_SCREEN.md): what a save card
// remembers so the cover can print the player's current city without loading
// the save. coverWorld.ts rebuilds the city from it. Kept apart from that file
// so save storage doesn't pull world generation into the title's first load.
import { COVER_MAX_FLAGS, COVER_MAX_RIVAL_FLAGS } from '../config/cover';
import type { LayoutVersion } from '../config/cityGeo';
import { CITIES } from '../data/cities';
import type { GameState } from './state';

/** The cover's part of a save card (SaveMeta.cover); optional, older cards lack it. */
export interface CoverMeta {
  /** The city the player was in at save time. */
  cityId: string;
  seed: number;
  /** That city's street layout (1 = cities from old saves, 2 = city looks). */
  layout: LayoutVersion;
  /** Start city and rival count: other cities' lot counts follow from them. */
  homeCityId: string;
  competitors: number;
  /** Lot and office listing ids that fly the player's flag in that city. */
  flags: string[];
  /** Lot id → brand ink of the rival bank there. */
  rivals: Record<string, string>;
}

/** The cover record for a game as it is now, or undefined if the city is unknown. */
export function coverMetaFor(state: GameState): CoverMeta | undefined {
  const cityId = state.world.currentCityId || state.meta.homeCityId;
  const city = state.world.cities[cityId];
  if (!city || !CITIES[cityId]) return undefined;
  const flags: string[] = [];
  const rivals: Record<string, string> = {};
  let rivalCount = 0;
  for (const lot of Object.values(state.world.lots)) {
    if (lot.cityId !== cityId || !lot.occupant) continue;
    if (lot.occupant.type === 'player') flags.push(lot.id);
    else if (rivalCount < COVER_MAX_RIVAL_FLAGS) {
      const ink = state.rivals[lot.occupant.id]?.ink;
      if (ink) {
        rivals[lot.id] = ink;
        rivalCount += 1;
      }
    }
  }
  for (const o of Object.values(state.world.officeListings)) {
    if (o.cityId === cityId && o.officeId) flags.push(o.id);
  }
  return {
    cityId,
    seed: state.meta.seed,
    layout: city.layout,
    homeCityId: state.meta.homeCityId,
    competitors: state.meta.competitors,
    flags: flags.slice(0, COVER_MAX_FLAGS),
    rivals,
  };
}
