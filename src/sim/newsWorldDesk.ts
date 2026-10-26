// The Weekly Ledger's World desk (SIMULATION §24.1): a few stories a week from
// around the ten countries that have nothing to do with your bank. Each slot
// picks a country (sometimes home, usually abroad), then a beat that fits that
// country's economy, season and climate (data/newsWorldBeats.ts), so a
// recession brings strikes and layoffs, a boom brings hiring and new plants,
// and winter brings snowstorms in the north and bushfires in Australia. A beat
// rests NEWS_WORLD.cooldownWeeks in a country before it can run there again.
// Flavour only: nothing here changes the simulation.
import { NEWS_PRIORITY as P, NEWS_WORLD } from '../config/balance';
import { CITIES } from '../data/cities';
import { COUNTRIES } from '../data/countries';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import type { CountryId } from '../data/types';
import {
  SOUTHERN,
  WORLD_BEATS,
  WORLD_JOBS,
  type BeatCondition,
  type WorldBeat,
} from '../data/newsWorldBeats';
import type { TemplateKey } from '../data/ledgerTemplates';
import { dateOf } from './calendar';
import { hpiYoY } from './macro';
import { grouped, newsMoney, newsPct } from './newsFormat';
import { countryName, theCountryName, type NewsContext, type Story } from './newsStory';
import type { Rng } from './rng';
import type { CountryState, NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];

/** The cities of each country, in table order. */
const CITIES_BY_COUNTRY = new Map<CountryId, string[]>();
for (const c of Object.values(CITIES)) {
  const list = CITIES_BY_COUNTRY.get(c.country) ?? [];
  list.push(c.name);
  CITIES_BY_COUNTRY.set(c.country, list);
}

function meets(c: CountryState, when: BeatCondition | undefined): boolean {
  switch (when) {
    case 'highInflation':
      return c.inflation >= NEWS_WORLD.highInflation;
    case 'lowUnemployment':
      return c.unemployment <= NEWS_WORLD.lowUnemployment;
    case 'housingUp':
      return hpiYoY(c) > NEWS_WORLD.housingHot;
    case 'housingDown':
      return hpiYoY(c) < 0;
    default:
      return true;
  }
}

/** Can this beat run in this country this month? */
export function beatFits(beat: WorldBeat, c: CountryState, month: number): boolean {
  if (beat.countries && !beat.countries.includes(c.id)) return false;
  if (beat.phases && !beat.phases.includes(c.phase)) return false;
  const months = SOUTHERN.includes(c.id) ? (beat.monthsSouth ?? beat.months) : beat.months;
  if (months && !months.includes(month)) return false;
  return meets(c, beat.when);
}

/** This week's World desk stories (draws from the `news` stream; updates the cooldowns). */
export function worldDeskStories(ctx: NewsContext, desk: NewsDesk, rng: Rng): Story[] {
  const s = ctx.state;
  const month = dateOf(s.meta.startDate, s.clock.day).getUTCMonth() + 1;
  for (const [id, week] of Object.entries(desk.worldRecent))
    if (week <= ctx.week - NEWS_WORLD.cooldownWeeks) delete desk.worldRecent[id];
  // One story per beat per issue, so two zoos never share a page.
  const usedBeats = new Set<string>();
  const openBeats = (c: CountryState) =>
    WORLD_BEATS.filter(
      (b) =>
        !usedBeats.has(b.key) &&
        beatFits(b, c, month) &&
        desk.worldRecent[`${b.key}:${c.id}`] === undefined,
    );
  const out: Story[] = [];
  const used = new Set<CountryId>();
  for (let slot = 0; slot < NEWS_WORLD.perIssue; slot++) {
    // Home with NEWS_WORLD.homeShare, else abroad; any country with a story left if that side has none.
    const home = rng.chance(NEWS_WORLD.homeShare);
    const ready = COUNTRY_ORDER.filter((id) => {
      const c = s.world.countries[id];
      return c && !used.has(id) && openBeats(c).length > 0;
    });
    const side = ready.filter((id) => (id === ctx.home) === home);
    const pool = side.length > 0 ? side : ready;
    if (pool.length === 0) break;
    const c = s.world.countries[rng.pick(pool)]!;
    used.add(c.id);
    const open = openBeats(c);
    const beat = rng.pickWeighted(open.map((b) => ({ item: b, weight: b.weight ?? 1 })));
    desk.worldRecent[`${beat.key}:${c.id}`] = ctx.week;
    usedBeats.add(beat.key);
    out.push(beatStory(ctx, beat, c, rng));
  }
  return out;
}

function beatStory(ctx: NewsContext, beat: WorldBeat, c: CountryState, rng: Rng): Story {
  const others = COUNTRY_ORDER.filter((id) => id !== c.id);
  const n = beat.n ? rng.int(beat.n[0], beat.n[1]) : 0;
  const money = beat.money ? rng.range(beat.money[0], beat.money[1]) * c.nominal : 0;
  return {
    key: beat.key as TemplateKey,
    subject: c.id,
    tab: 'world',
    icon: beat.icon,
    priority: c.id === ctx.home ? P.worldHome : P.world,
    group: 'world',
    tokens: {
      city: rng.pick(CITIES_BY_COUNTRY.get(c.id) ?? [countryName(c.id)]),
      country: countryName(c.id),
      theCountry: theCountryName(c.id),
      other: countryName(rng.pick(others)),
      n: grouped(n),
      money: newsMoney(money, ctx.sym),
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      job: rng.pick(WORLD_JOBS),
      gdp: newsPct(c.gdp),
      infl: newsPct(c.inflation),
      unemp: newsPct(c.unemployment),
    },
  };
}
