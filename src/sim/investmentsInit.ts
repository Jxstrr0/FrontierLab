// Stage 7 starting state (SIMULATION §20, §21): the venture pipeline and seed
// startups, the conventions calendar, real estate listings and empty lobbying
// records. Used by newGame and the 7 → 8 save migration.
import type {
  ConventionsState,
  GameState,
  LobbyingState,
  RealEstateState,
  VenturesState,
} from './state';
import { seedListings } from './propertyListings';

export const emptyVentures = (): VenturesState => ({
  startups: {},
  pipeline: [],
  pipelineRefreshWeek: 0,
});
export const emptyConventions = (): ConventionsState => ({ runs: [] });
export const emptyRealEstate = (): RealEstateState => ({
  properties: {},
  listings: {},
  listingsRefreshWeek: {},
});
export const emptyLobbying = (): LobbyingState => ({ campaigns: [] });

/**
 * Fresh Stage 7 records. Systems seed their own starting content here (seed
 * startups, the first conventions calendar, first listings) once built.
 */
export function initInvestments(state: GameState): void {
  state.ventures = emptyVentures();
  state.conventions = emptyConventions();
  state.realEstate = emptyRealEstate();
  state.lobbying = emptyLobbying();
  seedListings(state);
}
