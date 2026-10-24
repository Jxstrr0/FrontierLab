// Conventions (CONTENT §19, SIMULATION §20.3): this year's and next year's
// runs from the calendar. Two weeks before a run opens it is announced in the
// Ledger and 3–6 exclusive startups start raising, their rounds open through
// the event; it is open for one week, then closes (unsold exclusive lots go
// to funds when the rounds close in runVentures). At year end, exclusives you
// never backed leave the game. Draws from `conventions`.
import { CONVENTIONS, DAYS_PER_WEEK, VENTURES } from '../config/balance';
import { CITIES } from '../data/cities';
import { CONVENTIONS_CALENDAR } from '../data/conventions';
import { pushEvent } from './events';
import { stream } from './rng';
import type { ConventionRun, GameState } from './state';
import { announceWeek } from './ventureAccess';
import { gameYear } from './ventureGen';
import { heldByYou } from './ventureRounds';
import { newRaisingStartup } from './ventures';

const MS_PER_DAY = 86_400_000;

/**
 * The game week whose tick falls in week-of-year `woy` of `year` (weeks of the
 * year count 7-day blocks from 1 January, like calendar.ts weekOfYear).
 */
export function absoluteWeek(startDate: string, year: number, woy: number): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const blockStart = Date.UTC(year, 0, 1) + (woy - 1) * DAYS_PER_WEEK * MS_PER_DAY;
  // `+ 0` turns a −0 (a block starting just before the first day) into 0.
  return Math.ceil((blockStart - start) / MS_PER_DAY / DAYS_PER_WEEK) + 0;
}

/** One year's runs from the calendar, in opening order. */
export function runsForYear(state: GameState, year: number): ConventionRun[] {
  return CONVENTIONS_CALENDAR.map((c) => {
    const startWeek = absoluteWeek(state.meta.startDate, year, c.week);
    return {
      conventionId: c.id,
      cityId: c.cityId,
      year,
      startWeek,
      endWeek: startWeek + CONVENTIONS.activeWeeks,
      startupIds: [],
      announced: false,
    };
  }).sort((a, b) => a.startWeek - b.startWeek);
}

/** New game (and the 7 → 8 migration): this year's and next year's calendar. */
export function seedConventions(state: GameState): void {
  const year = gameYear(state);
  const week = state.clock.week;
  const runs = [...runsForYear(state, year), ...runsForYear(state, year + 1)];
  // Runs already past when the calendar is made never announce.
  for (const r of runs) if (r.endWeek <= week) r.announced = true;
  state.conventions.runs = runs;
}

const specOf = (id: string) => CONVENTIONS_CALENDAR.find((c) => c.id === id);
const cityName = (id: string) => CITIES[id]?.name ?? id;

function announce(state: GameState, run: ConventionRun): void {
  const rng = stream(state, 'conventions');
  const [lo, hi] = VENTURES.conventionExtra;
  const n = rng.int(lo, hi);
  for (let i = 0; i < n; i++) {
    const s = newRaisingStartup(state, rng, 'convention', run.endWeek, run.conventionId);
    run.startupIds.push(s.id);
  }
  run.announced = true;
  const spec = specOf(run.conventionId);
  pushEvent(
    state,
    'CONVENTION_ANNOUNCED',
    {
      conventionId: run.conventionId,
      name: spec?.name ?? 'A convention',
      cityId: run.cityId,
      city: cityName(run.cityId),
      startWeek: run.startWeek,
      local: run.cityId === state.world.currentCityId,
    },
    run.cityId === state.world.currentCityId ? 3 : 1,
    run.cityId,
  );
}

/** Tick step 8: announce runs two weeks out, open them on their week. */
export function runConventions(state: GameState): void {
  const week = state.clock.week;
  for (const run of state.conventions.runs) {
    if (!run.announced && week >= announceWeek(run) && week < run.endWeek) announce(state, run);
    if (run.announced && !run.opened && week >= run.startWeek && week < run.endWeek) {
      run.opened = true;
      pushEvent(
        state,
        'CONVENTION_OPEN',
        {
          conventionId: run.conventionId,
          name: specOf(run.conventionId)?.name ?? 'A convention',
          cityId: run.cityId,
          city: cityName(run.cityId),
          local: run.cityId === state.world.currentCityId,
        },
        run.cityId === state.world.currentCityId ? 2 : 0,
        run.cityId,
      );
    }
  }
}

/**
 * Year-end (tick step 14): drop last year's runs and add next year's calendar.
 * Exclusive startups of a dropped run that you never backed leave the game
 * (nobody can see them any more), which keeps the save small.
 */
export function conventionsYear(state: GameState): void {
  const year = gameYear(state);
  for (const run of state.conventions.runs) {
    if (run.year >= year) continue;
    for (const id of run.startupIds) {
      const s = state.ventures.startups[id];
      if (s && !heldByYou(s)) delete state.ventures.startups[id];
    }
  }
  const kept = state.conventions.runs.filter((r) => r.year >= year);
  const hasNext = kept.some((r) => r.year === year + 1);
  state.conventions.runs = hasNext ? kept : [...kept, ...runsForYear(state, year + 1)];
}
