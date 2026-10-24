// Rival bank AI (SIMULATION §18): branch books, weekly financials, monthly
// expansion and closures, price wars, quarterly earnings and recession
// failures with distressed sales. Stage 5 foundation stub.
import type { GameState } from './state';

/** Tick step 3, after rival prices: books, financials, expansion, closures, price wars. */
export function runRivals(_state: GameState): void {}

/** Quarter-end (tick step 13): rival earnings, dividends and the failure check. */
export function rivalsQuarter(_state: GameState): void {}
