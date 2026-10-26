// Who can see a startup and when (SIMULATION §20.3, DESIGN §5.12): pipeline
// startups while the Investment floor shows them, convention startups only at
// their convention, in its city, while it is open. Startups you already hold
// stay visible wherever you are. Also the convention calendar status helpers
// the conventions system, the commands and the map pin share.
import { CONVENTIONS } from '../config/balance';
import type { ConventionRun, GameState, Startup } from './state';
import { heldByYou } from './ventureRounds';

/** Investment floor staff, or undefined without an Investment floor. */
export function investmentStaff(state: GameState): number | undefined {
  return state.departments.investment?.staff;
}

/** First week a run is announced (CONVENTIONS.announceWeeks before it opens). */
export const announceWeek = (run: ConventionRun) => run.startWeek - CONVENTIONS.announceWeeks;

/** Where a run is on the calendar at `week`. */
export function conventionPhase(
  run: ConventionRun,
  week: number,
): 'upcoming' | 'announced' | 'open' | 'over' {
  if (week >= run.endWeek) return 'over';
  if (week >= run.startWeek) return 'open';
  if (week >= announceWeek(run) && run.announced) return 'announced';
  return 'upcoming';
}

/** The run a convention startup was shown at. */
export function conventionRunFor(state: GameState, s: Startup): ConventionRun | undefined {
  return state.conventions.runs.find((r) => r.startupIds.includes(s.id));
}

/** The current or next announced run at a convention (by convention id). */
export function liveRun(state: GameState, conventionId: string): ConventionRun | undefined {
  const week = state.clock.week;
  return state.conventions.runs.find(
    (r) =>
      r.conventionId === conventionId && r.announced && week >= announceWeek(r) && week < r.endWeek,
  );
}

/** True while you are standing in the convention's city during its open week. */
export function atOpenConvention(state: GameState, run: ConventionRun): boolean {
  return (
    conventionPhase(run, state.clock.week) === 'open' && state.world.currentCityId === run.cityId
  );
}

/** Why you can't deal with this startup now, or undefined when you can. */
export function accessBlock(state: GameState, s: Startup): string | undefined {
  if (heldByYou(s)) return undefined;
  if (s.seenAt === 'pipeline') {
    return state.ventures.pipeline.includes(s.id)
      ? undefined
      : 'This startup is not in your Investment floor pipeline.';
  }
  const run = conventionRunFor(state, s);
  if (!run) return 'You can only meet this startup at its convention.';
  const phase = conventionPhase(run, state.clock.week);
  if (phase === 'over') return 'The convention is over.';
  if (phase !== 'open') return 'The convention has not opened yet.';
  if (state.world.currentCityId !== run.cityId) return 'You need to be at the convention.';
  return undefined;
}
