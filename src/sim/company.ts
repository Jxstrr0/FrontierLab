// Company-wide weekly items that don't belong to a branch: the mobile app
// rating (SIMULATION §16.9), driven by IT coverage, the IT team's skill and
// the CTO seat (a bonus while filled, a vacancy penalty once you've had one).
import { APP_RATING } from '../config/balance';
import { cov } from './hq';
import { clamp, ema } from './math';
import { digitalBonus } from './products';
import type { GameState } from './state';

/** §16.9: ctoBonus = 0.4 × CTO expertise/100; ctoVacancy = 0.3 once you've had a CTO. */
export function ctoTerm(state: GameState): number {
  const cto = state.executives.seats.cto;
  if (cto) return (APP_RATING.ctoBonus * cto.expertise) / 100;
  return state.executives.hadCto ? -APP_RATING.ctoVacancy : 0;
}

/** The app rating the IT team is steering toward, plus the CTO term and digital projects. */
export function appRatingTarget(state: GameState): number {
  const it = state.departments.it;
  const itSkill = it && it.staff > 0 ? it.skill : APP_RATING.noTeamSkill;
  return (
    APP_RATING.base +
    (APP_RATING.slope * Math.min(1, cov(state, 'it')) * itSkill) / 100 +
    ctoTerm(state) +
    digitalBonus(state, 'appRating')
  );
}

export function updateAppRating(state: GameState): void {
  const target = appRatingTarget(state);
  state.company.appRating = clamp(ema(state.company.appRating, target, APP_RATING.ema), 1, 5);
}
