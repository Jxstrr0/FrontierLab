// Sports franchises (DESIGN §5.16, SCREENS §20, FRANCHISE in balance.ts): every
// club's value and outside owner, and for yours the season, squad, transfers,
// finances and kit sponsorship. Stream: `franchise`. (Stage 9 stub.)
import type { GameState } from './state';

/** Every club with its outside owner and squad (newGame and migration 9 → 10). */
export function seedClubs(_state: GameState): void {}

/** Weekly: games, finances, value, kit-sponsor brand awareness. */
export function runFranchises(_state: GameState): void {}
