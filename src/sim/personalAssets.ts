// The founder's homes, cars and collectibles over time (SIMULATION §22): values
// (homes track hpi, cars depreciate or appreciate, collectibles drift yearly),
// rebuilds finishing, upkeep and insurance from personal cash; car-dealer
// financing fees; insider-trading cases resolving at quarter-end. (Stage 9 stub.)
import type { GameState } from './state';

/** Weekly (tick step 11): asset values, rebuilds, upkeep; dealer financing fees. */
export function runPersonalAssets(_state: GameState): void {}

/** Quarter-end: resolve insider-trading cases opened in the window before it. */
export function insiderQuarter(_state: GameState): void {}
