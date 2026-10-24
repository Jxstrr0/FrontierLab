// conventions (Stage 7). Placeholder from the Stage 7 foundation: the engine calls
// these hooks in tick order (SIMULATION §2).
import type { GameState } from './state';

export function runConventions(_state: GameState): void {}

export function conventionsYear(_state: GameState): void {}
