// How a convention centre's map pin reads (SCREENS §17, DESIGN §5.12): it shows
// only from the announcement until the end of the event, tagged "Opens in N
// weeks" or "Open now"; at other times (and in cities without an event) it is
// hidden. Read-only view of GameState.
import { CONVENTIONS_CALENDAR } from '../../data/conventions';
import type { GameState, Site } from '../../sim/state';
import { liveRun } from '../../sim/ventureAccess';
import type { SitePinInfo } from '../map/sitePinInfo';

/** "Opens in 2 weeks", "Opens in 1 week" or "Open now". */
export function conventionTag(weeksToGo: number): string {
  if (weeksToGo <= 0) return 'Open now';
  return `Opens in ${weeksToGo} week${weeksToGo === 1 ? '' : 's'}`;
}

export function conventionPinInfo(s: GameState, site: Site): SitePinInfo {
  const run = site.refId ? liveRun(s, site.refId) : undefined;
  if (!run) return { visible: false, suffix: ', convention centre' };
  const name = CONVENTIONS_CALENDAR.find((c) => c.id === run.conventionId)?.name ?? 'Conference';
  const tag = conventionTag(run.startWeek - s.clock.week);
  return { visible: true, suffix: `, ${name}, ${tag.toLowerCase()}`, tag };
}
