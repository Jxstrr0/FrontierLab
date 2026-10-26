// The title screen's "Living skyline" (docs/COVER_SCREEN.md): a fresh world
// with the save card's city in it. Cities are generated from streams seeded per
// city (worldGen.ts), so the same seed, start city and rival count give the
// same streets and lot ids as the saved game. Pure; no DOM.
import type { CoverMeta } from './coverMeta';
import { newGame } from './newGame';
import type { GameState } from './state';
import { generateCity } from './worldGen';

/** A fresh world with the cover's city generated just as it is in the saved game. */
export function coverWorld(cover: CoverMeta): GameState {
  const home = cover.homeCityId === cover.cityId;
  const state = newGame({
    seed: cover.seed,
    cityId: cover.homeCityId,
    competitors: cover.competitors,
    layout: home ? cover.layout : undefined,
  });
  if (!home) generateCity(state, cover.cityId, { layout: cover.layout });
  return state;
}
