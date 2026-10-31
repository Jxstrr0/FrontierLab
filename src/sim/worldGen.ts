// City generation (DESIGN §5.2, ROADMAP Stage 8): a city's storefronts, rivals
// and buildings are made the first time you arrive, from streams seeded per
// city, so every city is the same in a given save no matter when you first fly
// there. A regional site gets only its airport and named employers. Used by
// newGame for the start city and by travelTo for every other destination.
import { LATEST_LAYOUT, type LayoutVersion } from '../config/cityGeo';
import { CITIES } from '../data/cities';
import { seedBusinesses } from './businesses';
import { generateCapitalMarketSites } from './capitalSites';
import { generateLots, lotCount } from './citygen';
import { generateCompetitionSites } from './competitionSites';
import { generateSites } from './hqSites';
import { generateInvestmentSites } from './investmentSites';
import { generateLandmarkTower } from './landmarkTowers';
import { generatePersonalSites } from './personalSites';
import { refreshManagerPool } from './people';
import { refreshListings } from './propertyListings';
import { updateMarketRefs } from './rates';
import { competitorsFor, seedRivals } from './rivals';
import type { GameState } from './state';

/** Whether a city has been generated in this save. */
export const isGenerated = (state: GameState, cityId: string): boolean =>
  state.world.cities[cityId]?.generated === true;

/**
 * Generates a city once: lots and rivals, then each stage's buildings in the
 * order the start city has always used (so start-city saves never move).
 * `firstListings` seeds buildings for sale; newGame leaves it to initInvestments.
 * `layout` picks the street layout (cityGeo.ts); new cities get LATEST_LAYOUT.
 */
export function generateCity(
  state: GameState,
  cityId: string,
  opts: { firstListings?: boolean; layout?: LayoutVersion } = {},
): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  if (isGenerated(state, cityId)) return;
  state.world.cities[cityId] = {
    id: cityId,
    generated: true,
    layout: opts.layout ?? LATEST_LAYOUT,
    marketRef: {},
  };
  if (city.regional) {
    generateCompetitionSites(state, cityId);
    updateMarketRefs(state);
    return;
  }
  const layout = state.world.cities[cityId]!.layout;
  const lots = generateLots(state, cityId, lotCount(city, layout, competitorsFor(state, cityId)));
  // Lots first: seeding folds each rival's branches into one office (C2b) and frees the rest.
  for (const lot of lots) state.world.lots[lot.id] = lot;
  seedRivals(state, cityId, lots);
  generateSites(state, cityId);
  generateCompetitionSites(state, cityId);
  generateCapitalMarketSites(state, cityId);
  generateInvestmentSites(state, cityId);
  generatePersonalSites(state, cityId);
  generateLandmarkTower(state, cityId);
  // C5a: spare storefronts become businesses and employers anchor accounts.
  seedBusinesses(state, cityId);
  updateMarketRefs(state);
  refreshManagerPool(state, cityId, true);
  if (opts.firstListings) refreshListings(state, cityId);
}
