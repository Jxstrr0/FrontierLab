// Company-wide weekly items that don't belong to a branch: the mobile app
// rating (SIMULATION §16.9), driven by IT coverage and the IT team's skill.
import { APP_RATING } from '../config/balance';
import { cov } from './hq';
import { clamp, ema } from './math';
import { digitalBonus } from './products';
import type { GameState } from './state';

/** The app rating the IT team is steering toward, plus digital projects (CTO terms arrive in Stage 6). */
export function appRatingTarget(state: GameState): number {
  const it = state.departments.it;
  const itSkill = it && it.staff > 0 ? it.skill : APP_RATING.noTeamSkill;
  return (
    APP_RATING.base +
    (APP_RATING.slope * Math.min(1, cov(state, 'it')) * itSkill) / 100 +
    digitalBonus(state, 'appRating')
  );
}

export function updateAppRating(state: GameState): void {
  const target = appRatingTarget(state);
  state.company.appRating = clamp(ema(state.company.appRating, target, APP_RATING.ema), 1, 5);
}
