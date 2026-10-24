// Rival bank AI (SIMULATION §18): branch books, weekly financials, monthly
// expansion and closures, price wars, quarterly earnings and recession
// failures with distressed sales. The pieces live in rivalBooks.ts,
// rivalExpansion.ts, priceWar.ts and rivalQuarter.ts; this module calls them in order.
import { runPriceWars } from './priceWar';
import { runRivalFinancials } from './rivalBooks';
import { runClosures, runExpansion } from './rivalExpansion';
import { runRivalQuarter, splitDistressed } from './rivalQuarter';
import type { GameState } from './state';

/** Tick step 3, after rival prices: books, financials, expansion, closures, price wars. */
export function runRivals(state: GameState): void {
  runRivalFinancials(state);
  runClosures(state);
  runExpansion(state);
  runPriceWars(state);
  splitDistressed(state);
}

/** Quarter-end (tick step 13): rival earnings, dividends and the failure check. */
export function rivalsQuarter(state: GameState): void {
  runRivalQuarter(state);
}
