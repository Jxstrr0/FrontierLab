// Corporate debt from rival banks (SIMULATION §19.9): business loan offers at
// rival head offices, amortized loans and lines of credit. Corporate cash, never
// deposits. Stage 5 foundation stub: the rivals work fills in the weekly step.
import type { CorporateDebt, GameState } from './state';

export function emptyCorporateDebt(): CorporateDebt {
  return { loans: {}, lines: {}, offers: [], offersRefreshWeek: -1 };
}

/** Tick step 8: interest and payments on corporate loans and lines, offer refresh. */
export function runCorporateDebt(_state: GameState): void {}
