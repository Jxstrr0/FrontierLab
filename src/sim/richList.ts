// The rich list (SIMULATION §22): 50 generated fortunes growing 4–8% a year,
// and your rank by net worth at each year end. Stream: `richList`. (Stage 9 stub.)
import type { GameState } from './state';

/** Generates the fixed fortunes (newGame and migration 9 → 10). */
export function seedRichList(_state: GameState): void {}

/** Year end: grow the fortunes and rank you (RICH_LIST event). */
export function richListYear(_state: GameState): void {}
