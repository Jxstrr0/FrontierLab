// Stage 9 starting state (SIMULATION §22): an empty personal empire, each
// auction house's first sale, every sports club with its outside owner and the
// rich list. Used by newGame and the 9 → 10 save migration; each system seeds
// its own records in its own module.
import { seedAuctions } from './auctions';
import { seedClubs } from './franchise';
import { seedRichList } from './richList';
import type { GameState, PersonalEmpire } from './state';

export const emptyEmpire = (): PersonalEmpire => ({
  homes: [],
  cars: [],
  collectibles: [],
  richList: { fortunes: [] },
  insider: { pending: [] },
  offerLocks: {},
  netWorthLog: [],
});

/** Fresh Stage 9 records on a state that has none. */
export function initPersonalEmpire(state: GameState): void {
  state.personal.empire = emptyEmpire();
  state.auctions = {};
  state.clubs = {};
  state.dealerDeals = {};
  seedAuctions(state);
  seedClubs(state);
  seedRichList(state);
}
