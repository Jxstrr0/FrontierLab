// Governance (DESIGN §5.13): board meetings, CEO pay and dividends.
// Stage 6 foundation stub.
import type { GameState } from './state';

/** Weekly: pays declared dividends when due. */
export function runGovernance(_state: GameState): void {}

/** Quarter-end: the board meeting unlocks for the new quarter. */
export function governanceQuarter(_state: GameState): void {}
