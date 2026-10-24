// Read-only views for the convention panel (SCREENS §17): which run the
// centre is hosting, its dates and status, the exclusive startups and two
// small networking leads (an executive candidate, an employer to court).
import { CONVENTIONS, DAYS_PER_WEEK } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { CONVENTIONS_CALENDAR, type ConventionSpec } from '../../data/conventions';
import type { ConventionRun, GameState, Site, Startup } from '../../sim/state';
import { conventionPhase, liveRun } from '../../sim/ventureAccess';
import { shortDate } from '../format/format';

export interface ConventionView {
  spec: ConventionSpec;
  run: ConventionRun;
  phase: ReturnType<typeof conventionPhase>;
  weeksToGo: number;
  dates: string;
  city: string;
  inCity: boolean;
  startups: Startup[];
}

/** The next run of a convention: the live one, else the next on the calendar. */
function nextRun(s: GameState, id: string): ConventionRun | undefined {
  return (
    liveRun(s, id) ??
    s.conventions.runs.find((r) => r.conventionId === id && r.endWeek > s.clock.week)
  );
}

export function conventionView(s: GameState, site: Site | undefined): ConventionView | undefined {
  const spec = site && CONVENTIONS_CALENDAR.find((c) => c.id === site.refId);
  if (!spec) return undefined;
  const run = nextRun(s, spec.id);
  if (!run) return undefined;
  const first = run.startWeek * DAYS_PER_WEEK;
  const last = first + CONVENTIONS.activeWeeks * DAYS_PER_WEEK - 1;
  const year = run.year;
  return {
    spec,
    run,
    phase: conventionPhase(run, s.clock.week),
    weeksToGo: run.startWeek - s.clock.week,
    dates: `${shortDate(s.meta.startDate, first)} – ${shortDate(s.meta.startDate, last)} ${year}`,
    city: CITIES[run.cityId]?.name ?? run.cityId,
    inCity: s.world.currentCityId === run.cityId,
    startups: run.startupIds.map((id) => s.ventures.startups[id]).filter((x): x is Startup => !!x),
  };
}

export function conventionAdvisor(v: ConventionView): string {
  if (v.phase === 'open')
    return v.inCity
      ? "Founders everywhere. Let's find a deal."
      : `You need to be in ${v.city} to make a deal here.`;
  if (v.phase === 'announced' || v.phase === 'upcoming')
    return `Doors open in ${v.weeksToGo} week${v.weeksToGo === 1 ? '' : 's'}. Deals are made on the floor that week.`;
  return 'The halls are empty until next year.';
}

/** An employer in the city to court for a payroll partnership (first by name). */
export function employerLead(s: GameState, cityId: string): Site | undefined {
  return Object.values(s.world.sites)
    .filter((x) => x.kind === 'employer' && x.cityId === cityId && x.employer)
    .sort((a, b) => (a.employer!.name < b.employer!.name ? -1 : 1))[0];
}
