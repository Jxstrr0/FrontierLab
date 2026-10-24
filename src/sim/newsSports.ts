// Sports for The Daily Ledger (SIMULATION §24 priority 6, §2 step 14): every
// country's fictional league (src/data/newsWorld.ts) plays three games a week
// all year. The paper reports the match of the week from the leagues of the
// countries you operate in, and at year end the champions, before records reset.
import {
  NEWS_PRIORITY as P,
  SPORTS_DRAW_P,
  SPORTS_EXTRA_TIME_P,
  SPORTS_POINTS,
  SPORTS_STRENGTH_WEIGHT,
  SPORTS_WIN_P_RANGE,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { LEAGUES, type LeagueSpec } from '../data/newsWorld';
import type { CountryId } from '../data/types';
import { isYearStart } from './calendar';
import { clamp } from './math';
import { ordinal } from './newsFormat';
import type { NewsContext, Story } from './newsStory';
import type { Rng } from './rng';
import type { NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];
type Record3 = [number, number, number];

const points = (r: Record3) => r[0] * SPORTS_POINTS.win + r[1] * SPORTS_POINTS.draw;

function recordText(league: LeagueSpec, r: Record3): string {
  return league.draws ? `${r[0]}–${r[1]}–${r[2]}` : `${r[0]}–${r[2]}`;
}

function table(desk: NewsDesk, league: LeagueSpec): Record<string, Record3> {
  const t = (desk.seasons[league.id] ??= {});
  for (const c of league.clubs) t[c.id] ??= [0, 0, 0];
  return t;
}

/** Season finish (at year end) for leagues you follow, then a reset of every league. */
function seasonStories(ctx: NewsContext, desk: NewsDesk): Story[] {
  const out: Story[] = [];
  for (const country of COUNTRY_ORDER) {
    const league = LEAGUES[country];
    const t = table(desk, league);
    if (ctx.operated.has(country)) {
      const standings = league.clubs
        .map((c, i) => ({ c, i, r: t[c.id]! }))
        .sort((a, b) => points(b.r) - points(a.r) || b.r[0] - a.r[0] || a.i - b.i);
      const [champ, runner] = standings;
      if (champ && runner && champ.r[0] + champ.r[1] + champ.r[2] > 0) {
        out.push({
          key: 'SPORTS_SEASON',
          subject: league.id,
          tab: 'sports',
          icon: 'trophy',
          priority: P.sports + (country === ctx.home ? 10 : 8),
          group: 'sports',
          tokens: {
            club: champ.c.name,
            pos: ordinal(1),
            league: league.name,
            record: recordText(league, champ.r),
            runnerUp: runner.c.name,
          },
        });
      }
    }
    desk.seasons[league.id] = {};
  }
  return out;
}

/** One round of three games; returns the story for the first (the match of the week). */
function playRound(
  league: LeagueSpec,
  t: Record<string, Record3>,
  rng: Rng,
): Omit<Story, 'priority'> {
  const order = league.clubs.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  let lead: Omit<Story, 'priority'> | undefined;
  const [lo, hi] = league.score;
  for (let k = 0; k + 1 < order.length; k += 2) {
    const home = order[k]!;
    const away = order[k + 1]!;
    const pHome = clamp(
      0.5 + (home.strength - away.strength) * SPORTS_STRENGTH_WEIGHT,
      SPORTS_WIN_P_RANGE[0],
      SPORTS_WIN_P_RANGE[1],
    );
    let story: Omit<Story, 'priority'>;
    if (league.draws && rng.chance(SPORTS_DRAW_P)) {
      const goals = rng.int(lo, Math.max(lo, hi - 2));
      t[home.id]![1] += 1;
      t[away.id]![1] += 1;
      story = {
        key: 'SPORTS_DRAW',
        subject: league.id,
        tab: 'sports',
        icon: 'trophy',
        group: 'sports',
        tokens: {
          home: home.name,
          away: away.name,
          score: `${goals}–${goals}`,
          league: league.name,
        },
      };
    } else {
      const [w, l] = rng.chance(pHome) ? [home, away] : [away, home];
      const extra = !league.draws && rng.chance(SPORTS_EXTRA_TIME_P);
      const ws = rng.int(lo + 1, hi);
      const ls = extra ? ws - 1 : rng.int(lo, ws - 1);
      t[w.id]![0] += 1;
      t[l.id]![2] += 1;
      const margin = ws - ls;
      story = {
        key: 'SPORTS_RESULT',
        subject: league.id,
        tab: 'sports',
        icon: 'trophy',
        group: 'sports',
        tokens: {
          winner: w.name,
          loser: l.name,
          score: `${ws}–${ls}`,
          league: league.name,
          margin: margin === 1 ? 'narrow' : margin >= (hi - lo) / 2 ? 'commanding' : 'solid',
          extra: extra ? league.extraTime : '',
          record: recordText(league, t[w.id]!),
          loserRecord: recordText(league, t[l.id]!),
        },
      };
    }
    lead ??= story;
  }
  return lead!;
}

/**
 * Tick step 16: season finish at year end and this week's games. `stories` are
 * from leagues you follow; `spare` from the rest, to fill a thin issue.
 */
export function runSports(
  ctx: NewsContext,
  desk: NewsDesk,
  rng: Rng,
): { stories: Story[]; spare: Story[] } {
  const s = ctx.state;
  const stories = isYearStart(s.meta.startDate, s.clock.day) ? seasonStories(ctx, desk) : [];
  const spare: Story[] = [];
  for (const country of COUNTRY_ORDER) {
    const league = LEAGUES[country];
    const lead = playRound(league, table(desk, league), rng);
    if (ctx.operated.has(country))
      stories.push({ ...lead, priority: P.sports + (country === ctx.home ? 1 : 0) });
    else spare.push({ ...lead, group: undefined, priority: P.filler });
  }
  return { stories, spare };
}
