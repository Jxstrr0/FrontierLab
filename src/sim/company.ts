// Company-wide weekly items that don't belong to a branch: the mobile app
// rating (SIMULATION §16.9) while there is no IT floor.
import { APP_RATING } from '../config/balance';
import { clamp, ema } from './math';
import type { GameState } from './state';

export function updateAppRating(state: GameState): void {
  // IT coverage is 1 and skill 70 until the IT floor exists (Stage 4).
  const target = APP_RATING.base + APP_RATING.slope * 1 * (APP_RATING.noTeamSkill / 100);
  state.company.appRating = clamp(ema(state.company.appRating, target, APP_RATING.ema), 1, 5);
}
