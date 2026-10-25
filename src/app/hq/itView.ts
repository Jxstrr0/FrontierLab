// Read-only views for the IT & Security floor (SCREENS §10): the app rating's
// 26-week trend from the weekly snapshots, this week's data-breach odds turned
// into a yearly figure, and the app-rating drag while the CTO seat is empty
// after you've had one (SIMULATION §16.9). Formulas come from the simulation.
import { APP_RATING, WEEKS_PER_YEAR } from '../../config/balance';
import { breachChance } from '../../sim/incident/companyRules';
import type { GameState, WeeklySnapshot } from '../../sim/state';

/** Weeks of history in the app rating chart (about half a year). */
export const APP_TREND_WEEKS = 26;

/** App ratings of the last 26 weekly closes, skipping older snapshots that lack one. */
export function appRatingTrend(
  weekly: WeeklySnapshot[],
  weeks = APP_TREND_WEEKS,
): { week: number; rating: number }[] {
  return weekly
    .slice(-weeks)
    .filter((w) => w.appRating !== undefined)
    .map((w) => ({ week: w.week, rating: w.appRating! }));
}

/** Chance of at least one breach over a year at this week's odds: 1 − (1 − p)^52. */
export function yearlyOdds(weekly: number): number {
  const p = Math.min(1, Math.max(0, weekly));
  return 1 - Math.pow(1 - p, WEEKS_PER_YEAR);
}

/** This week's data-breach chance, as yearly odds. */
export function breachRiskYear(state: GameState): number {
  return yearlyOdds(breachChance(state));
}

/** Stars the empty CTO seat takes off the app rating's target, or 0 (company.ts ctoTerm). */
export function ctoVacancyDrag(state: GameState): number {
  const e = state.executives;
  return e.hadCto && !e.seats.cto ? APP_RATING.ctoVacancy : 0;
}
