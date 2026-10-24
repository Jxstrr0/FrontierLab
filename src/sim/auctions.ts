// Auction houses (SIMULATION §22 "Auctions", SCREENS §19): each house's sale
// every AUCTIONS.everyWeeks weeks with 3–5 lots, bids, counterfeits, appraisal
// and consignment. Stream: `auctions`. (Stage 9 stub: filled in by its owner.)
import type { GameState } from './state';

/** First sale for every house (newGame and migration 9 → 10). */
export function seedAuctions(_state: GameState): void {}

/** Weekly: list upcoming lots, hold due sales, finish appraisals, drift values. */
export function runAuctions(_state: GameState): void {}
