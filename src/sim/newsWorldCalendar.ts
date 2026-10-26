// The world calendar in The Weekly Ledger (SIMULATION §24.6): the Nations Cup
// and World Games every four years and a World Expo every five, each hosted by
// a game city and written ahead as a script of weekly stories (stored in
// `desk.scheduled`); and the annual fixtures on their week of the year: film
// awards in March, New Year fireworks, a science prize in October and the
// Grand Sale Weekend in November, which reads the home economy. Flavour only.
import { NEWS_CALENDAR as K, NEWS_PRIORITY as P } from '../config/balance';
import { CITIES } from '../data/cities';
import type { TemplateKey } from '../data/ledgerTemplates';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { FILMS, FIXTURES, NATIONS, PRIZE_FIELDS } from '../data/worldCalendar';
import { dateOf, weekOfYear } from './calendar';
import { grouped, newsMoney } from './newsFormat';
import {
  cityName,
  countryName,
  theCountryName,
  type LedgerIconId,
  type NewsContext,
  type Story,
} from './newsStory';
import { cupScript, gamesScript } from './newsTournaments';
import type { Rng } from './rng';
import type { NewsDesk, ScheduledStory } from './state';

const HOST_CITIES = Object.values(CITIES);
const person = (rng: Rng) => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;

/** Does a fixture that runs every `every` years (year % every === offset) fall this year? */
const inYear = (year: number, f: { every: number; offset: number }) => year % f.every === f.offset;

/** Writes this week's new scripts into the desk, then returns everything due this week. */
export function calendarStories(ctx: NewsContext, desk: NewsDesk, rng: Rng): Story[] {
  const s = ctx.state;
  const date = dateOf(s.meta.startDate, s.clock.day);
  const year = date.getUTCFullYear();
  const woy = weekOfYear(date);
  const schedule = (script: (Omit<ScheduledStory, 'week'> & { offset: number })[]) => {
    for (const { offset, ...story } of script)
      desk.scheduled.push({ ...story, week: ctx.week + offset });
  };
  const host = () => {
    const c = rng.pick(HOST_CITIES);
    return { city: c.name, country: c.country };
  };
  const { cup, games, expo } = FIXTURES;
  if (inYear(year, cup) && woy === cup.week - cup.announceWeeks)
    schedule(cupScript(year, host(), rng));
  if (inYear(year, games) && woy === games.week - games.announceWeeks)
    schedule(gamesScript(year, host(), rng));
  if (inYear(year, expo) && woy === expo.week) {
    const h = host();
    const base = {
      subject: `expo:${year}`,
      tab: 'world' as const,
      icon: 'globe',
      group: 'calendar',
    };
    const tokens = {
      expo: expo.name,
      city: h.city,
      country: theCountryName(h.country),
      year: String(year),
    };
    schedule([
      {
        ...base,
        offset: 0,
        key: 'EXPO_OPENS',
        priority: P.calendar,
        tokens: { ...tokens, n: String(rng.int(K.pavilions[0], K.pavilions[1])) },
      },
      {
        ...base,
        offset: expo.runWeeks,
        key: 'EXPO_CLOSES',
        priority: P.calendar,
        tokens: { ...tokens, n: String(rng.int(K.visitors[0], K.visitors[1])) },
      },
    ]);
  }

  const out: Story[] = [];
  const due = desk.scheduled.filter((x) => x.week <= ctx.week);
  desk.scheduled = desk.scheduled.filter((x) => x.week > ctx.week);
  for (const x of due) {
    if (x.week !== ctx.week) continue; // a missed week (never in normal play) is skipped
    out.push({
      key: x.key as TemplateKey,
      subject: x.subject,
      tab: x.tab,
      icon: x.icon as LedgerIconId,
      priority: x.priority,
      group: x.group,
      tokens: x.tokens,
    });
  }
  out.push(...annualStories(ctx, woy, year, rng));
  return out;
}

/** The fixtures that come round every year on their week. */
function annualStories(ctx: NewsContext, woy: number, year: number, rng: Rng): Story[] {
  const base = { subject: `annual:${year}`, priority: P.annual, group: 'calendar' };
  const { filmAwards, prize, fireworks, saleWeekend } = FIXTURES;
  const out: Story[] = [];
  if (woy === filmAwards.week) {
    const c = rng.pick(HOST_CITIES);
    out.push({
      ...base,
      key: 'FILM_AWARDS',
      tab: 'world',
      icon: 'trophy',
      tokens: {
        awards: filmAwards.name,
        film: rng.pick(FILMS),
        director: person(rng),
        nation: NATIONS[c.country].team,
        city: c.name,
      },
    });
  }
  if (woy === prize.week) {
    const c = rng.pick(HOST_CITIES);
    const f = rng.pick(PRIZE_FIELDS);
    out.push({
      ...base,
      key: 'SCIENCE_PRIZE',
      tab: 'world',
      icon: 'spark',
      tokens: { prize: prize.name, field: f.field, work: f.work, name: person(rng), city: c.name },
    });
  }
  if (woy === fireworks.week)
    out.push({
      ...base,
      key: 'NEW_YEAR',
      tab: 'world',
      icon: 'spark',
      tokens: { city: rng.pick(HOST_CITIES).name, year: String(year) },
    });
  if (woy === saleWeekend.week) {
    const home = ctx.state.world.countries[ctx.home];
    const boom = home?.phase === 'expansion' || home?.phase === 'recovery';
    const [lo, hi] = boom ? K.saleBoom : K.saleQuiet;
    out.push({
      ...base,
      key: boom ? 'SALE_BOOM' : 'SALE_QUIET',
      tab: 'business',
      icon: 'coin',
      tokens: {
        sale: saleWeekend.name,
        country: countryName(ctx.home),
        city: cityName(ctx.state.meta.homeCityId),
        money: newsMoney(rng.range(lo, hi) * (home?.nominal ?? 1), ctx.sym),
        n: grouped(rng.int(K.saleShoppers[0], K.saleShoppers[1])),
      },
    });
  }
  return out;
}
