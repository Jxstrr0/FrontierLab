// The Nations Cup and World Games (SIMULATION §24.6): when one is announced,
// the whole event is played out at once from the `news` stream and written as
// a script of stories, one per week (announcement, opening, groups or midway
// table, semi-finals, final or closing day). newsWorldCalendar.ts stores the
// script in the news desk and prints each story in its week. Flavour only.
import { NEWS_CALENDAR as K, NEWS_PRIORITY as P } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { SPORT_FIRST_NAMES, SPORT_LAST_NAMES } from '../data/namesSport';
import { FIXTURES, GAMES_SPORTS, NATIONS } from '../data/worldCalendar';
import type { CountryId } from '../data/types';
import { grouped } from './newsFormat';
import type { Rng } from './rng';
import type { ScheduledStory } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];
const team = (id: CountryId) => NATIONS[id].team;
const person = (rng: Rng) => `${rng.pick(SPORT_FIRST_NAMES)} ${rng.pick(SPORT_LAST_NAMES)}`;

type Script = Omit<ScheduledStory, 'week'> & { offset: number };

interface Host {
  city: string;
  country: CountryId;
}

function strength(id: CountryId, host: Host): number {
  return NATIONS[id].cup + (id === host.country ? K.hostEdge : 0);
}

/** One game: [goals a, goals b]. */
function play(a: CountryId, b: CountryId, host: Host, rng: Rng): [number, number] {
  const edge = strength(a, host) - strength(b, host);
  const mean = (e: number) => Math.max(K.goalMin, K.goalBase + K.goalEdge * e);
  return [rng.poisson(mean(edge)), rng.poisson(mean(-edge))];
}

/** A knockout game: the winner, loser and score text (penalties when level). */
function knockout(a: CountryId, b: CountryId, host: Host, rng: Rng) {
  const [ga, gb] = play(a, b, host, rng);
  if (ga !== gb) {
    const aWins = ga > gb;
    return {
      win: aWins ? a : b,
      lose: aWins ? b : a,
      score: `${Math.max(ga, gb)}–${Math.min(ga, gb)}`,
    };
  }
  const aWins = rng.chance(0.5 + K.penaltyEdge * (strength(a, host) - strength(b, host)));
  return {
    win: aWins ? a : b,
    lose: aWins ? b : a,
    score: `on penalties after a ${ga}–${gb} draw`,
  };
}

/** The group's final order after a round robin: points, then goal difference, then strength. */
function groupStage(group: CountryId[], host: Host, rng: Rng): CountryId[] {
  const pts = new Map<CountryId, number>(group.map((id) => [id, 0]));
  const gd = new Map<CountryId, number>(group.map((id) => [id, 0]));
  for (let i = 0; i < group.length; i++)
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]!;
      const b = group[j]!;
      const [ga, gb] = play(a, b, host, rng);
      pts.set(a, pts.get(a)! + (ga > gb ? 3 : ga === gb ? 1 : 0));
      pts.set(b, pts.get(b)! + (gb > ga ? 3 : ga === gb ? 1 : 0));
      gd.set(a, gd.get(a)! + ga - gb);
      gd.set(b, gd.get(b)! + gb - ga);
    }
  return [...group].sort(
    (x, y) =>
      pts.get(y)! - pts.get(x)! ||
      gd.get(y)! - gd.get(x)! ||
      strength(y, host) - strength(x, host) ||
      COUNTRY_ORDER.indexOf(x) - COUNTRY_ORDER.indexOf(y),
  );
}

/** The whole Nations Cup, as stories at week offsets from its announcement. */
export function cupScript(year: number, host: Host, rng: Rng): Script[] {
  const name = FIXTURES.cup.name;
  const lead = FIXTURES.cup.announceWeeks;
  const draw = [...COUNTRY_ORDER];
  for (let i = draw.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [draw[i], draw[j]] = [draw[j]!, draw[i]!];
  }
  const half = Math.ceil(draw.length / 2);
  const a = groupStage(draw.slice(0, half), host, rng);
  const b = groupStage(draw.slice(half), host, rng);
  const hostGroup = a.includes(host.country) ? a : b;
  const rival = rng.pick(hostGroup.filter((id) => id !== host.country));
  const [ho, ri] = play(host.country, rival, host, rng);
  const semi1 = knockout(a[0]!, b[1]!, host, rng);
  const semi2 = knockout(b[0]!, a[1]!, host, rng);
  const final = knockout(semi1.win, semi2.win, host, rng);
  const favourites = [...COUNTRY_ORDER].sort((x, y) => NATIONS[y].cup - NATIONS[x].cup);
  const base = {
    subject: `cup:${year}`,
    tab: 'sports' as const,
    icon: 'trophy',
    group: 'calendar',
  };
  const story = (offset: number, key: string, tokens: Record<string, string>, final = false) => ({
    ...base,
    offset,
    key,
    priority: final ? P.calendarFinal : P.calendar,
    tokens: { cup: name, city: host.city, host: team(host.country), year: String(year), ...tokens },
  });
  return [
    story(0, 'CUP_ANNOUNCED', {
      weeks: String(lead),
      fav: team(favourites[0]!),
      fav2: team(favourites[1]!),
    }),
    story(lead, 'CUP_OPENING', {
      rival: team(rival),
      score: `${ho}–${ri}`,
      result: ho > ri ? 'beat' : ho < ri ? 'lose to' : 'draw with',
    }),
    story(lead + 1, 'CUP_GROUPS', {
      a1: team(a[0]!),
      a2: team(a[1]!),
      b1: team(b[0]!),
      b2: team(b[1]!),
      out: team(a.includes(host.country) ? a.at(-1)! : b.at(-1)!),
    }),
    story(lead + 2, 'CUP_SEMIS', {
      f1: team(semi1.win),
      s1: semi1.score,
      l1: team(semi1.lose),
      f2: team(semi2.win),
      s2: semi2.score,
      l2: team(semi2.lose),
    }),
    story(
      lead + 3,
      'CUP_FINAL',
      { winner: team(final.win), loser: team(final.lose), score: final.score, star: person(rng) },
      true,
    ),
  ];
}

/** The whole World Games, as stories at week offsets from its announcement. */
export function gamesScript(year: number, host: Host, rng: Rng): Script[] {
  const name = FIXTURES.games.name;
  const lead = FIXTURES.games.announceWeeks;
  const table = COUNTRY_ORDER.map((id) => {
    const lambda =
      K.goldBase + K.goldPerStrength * NATIONS[id].games + (id === host.country ? K.hostGolds : 0);
    return {
      id,
      gold: rng.poisson(lambda),
      silver: rng.poisson(lambda),
      bronze: rng.poisson(lambda),
    };
  }).sort(
    (x, y) =>
      y.gold - x.gold ||
      y.silver - x.silver ||
      y.bronze - x.bronze ||
      COUNTRY_ORDER.indexOf(x.id) - COUNTRY_ORDER.indexOf(y.id),
  );
  const [t1, t2, t3] = table;
  const starNation = rng.pick(table.slice(0, 3)).id;
  const base = {
    subject: `games:${year}`,
    tab: 'sports' as const,
    icon: 'trophy',
    group: 'calendar',
  };
  const story = (offset: number, key: string, tokens: Record<string, string>, final = false) => ({
    ...base,
    offset,
    key,
    priority: final ? P.calendarFinal : P.calendar,
    tokens: {
      games: name,
      city: host.city,
      host: team(host.country),
      year: String(year),
      ...tokens,
    },
  });
  return [
    story(0, 'GAMES_ANNOUNCED', { weeks: String(lead) }),
    story(lead, 'GAMES_OPEN', {
      n: grouped(rng.int(K.athletes[0], K.athletes[1])),
      flag: person(rng),
    }),
    story(lead + 1, 'GAMES_MIDWAY', {
      star: person(rng),
      nation: team(starNation),
      golds: String(rng.int(K.starGolds[0], K.starGolds[1])),
      sport: rng.pick(GAMES_SPORTS),
      leader: team(t1!.id),
    }),
    story(
      lead + 2,
      'GAMES_CLOSE',
      {
        c1: team(t1!.id),
        g1: String(t1!.gold),
        c2: team(t2!.id),
        g2: String(t2!.gold),
        c3: team(t3!.id),
        g3: String(t3!.gold),
        hostGolds: String(table.find((r) => r.id === host.country)!.gold),
      },
      true,
    ),
  ];
}
