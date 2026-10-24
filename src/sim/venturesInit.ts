// Starting ventures content (SIMULATION §20.1, CONTENT §18–19): the seed
// startups and the conventions calendar for this year and next. Called once
// from initInvestments (new game and the 7 → 8 save migration).
import { seedConventions } from './conventions';
import type { GameState } from './state';
import { seedStartups } from './ventureGen';

export function seedVentures(state: GameState): void {
  seedStartups(state);
  seedConventions(state);
}
