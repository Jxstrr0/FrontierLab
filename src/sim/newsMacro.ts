// The economy in The Weekly Ledger (SIMULATION §24, §4): central bank decisions
// (your home country always, other countries you operate in, then the biggest
// moves elsewhere), the home economy, house prices for each country you
// operate in, the weekly market wrap and the year-end Fastest Growing ranking.
import {
  DAYS_PER_WEEK,
  HPI_HISTORY_WEEKS,
  NEWS_CB_ABROAD_MAX,
  NEWS_HOUSING_EVERY_WEEKS,
  NEWS_PRIORITY as P,
  RANKING_MIN_ASSETS,
  RANKING_SIZE,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import { HOUSING_REASONS, MARKET_SECTORS } from '../data/newsWorld';
import { MARKET_INDEX_NAME } from '../data/stocks';
import type { CountryId } from '../data/types';
import { dateOf, isYearStart } from './calendar';
import { hpiYoY } from './macro';
import { indexWeeklyMove } from './marketStocks';
import { basisPoints, grouped, newsAbsPct, newsPct, newsRate } from './newsFormat';
import {
  cityFor,
  countryName,
  theCountryName,
  num,
  str,
  type NewsContext,
  type Story,
} from './newsStory';
import type { Rng } from './rng';
import type { CountryState, GameEvent, NewsDesk } from './state';

const COUNTRY_ORDER = Object.keys(COUNTRIES) as CountryId[];

/** Central bank stories: home and operated countries always, then up to NEWS_CB_ABROAD_MAX elsewhere. */
export function centralBankStories(ctx: NewsContext): Story[] {
  const decisions = ctx.events.filter((e) => e.type === 'CB_DECISION');
  const ours: Story[] = [];
  const abroad: { e: GameEvent; change: number; order: number }[] = [];
  for (const e of decisions) {
    const country = str(e.payload.country) as CountryId;
    if (country === ctx.home) ours.push(cbStory(e, P.cbHome));
    else if (ctx.operated.has(country)) ours.push(cbStory(e, P.cbOperated));
    else
      abroad.push({
        e,
        change: Math.abs(num(e.payload.change)),
        order: COUNTRY_ORDER.indexOf(country),
      });
  }
  abroad.sort((a, b) => b.change - a.change || a.order - b.order);
  const picked = abroad
    .slice(0, NEWS_CB_ABROAD_MAX)
    .map((a) => cbStory(a.e, a.change > 0 ? P.cbAbroadMove : P.cbAbroadHold));
  return [...ours, ...picked];
}

function cbStory(e: GameEvent, priority: number): Story {
  const p = e.payload;
  const change = num(p.change);
  const country = str(p.country) as CountryId;
  return {
    key: change > 0 ? 'CB_RAISE' : change < 0 ? 'CB_CUT' : 'CB_HOLD',
    subject: country,
    tab: 'banking',
    icon: 'dome',
    priority,
    tokens: {
      cb: str(p.cb, COUNTRIES[country]?.centralBank ?? 'central bank'),
      country: countryName(country),
      theCountry: theCountryName(country),
      rate: newsRate(num(p.rate)),
      bp: basisPoints(change),
      gdp: newsPct(num(p.gdp)),
      fc: newsPct(num(p.forecast)),
      infl: newsPct(num(p.inflation)),
    },
  };
}

const ECONOMY_KEY = {
  expansion: 'ECONOMY_EXPANSION',
  slowdown: 'ECONOMY_SLOWDOWN',
  recession: 'ECONOMY_RECESSION',
  recovery: 'ECONOMY_RECOVERY',
} as const;

export function economyStory(c: CountryState, priority: number, group?: string): Story {
  return {
    key: ECONOMY_KEY[c.phase],
    subject: c.id,
    tab: 'business',
    icon: 'chart',
    priority,
    group,
    tokens: {
      country: countryName(c.id),
      theCountry: theCountryName(c.id),
      gdp: newsPct(c.gdp),
      infl: newsPct(c.inflation),
      unemp: newsPct(c.unemployment),
    },
  };
}

/** House prices over the year, about monthly, for each country you operate in. */
export function housingStories(ctx: NewsContext, rng: Rng): Story[] {
  const out: Story[] = [];
  for (const id of COUNTRY_ORDER) {
    const c = ctx.state.world.countries[id];
    if (!c || !ctx.operated.has(id) || c.hpiHistory.length < HPI_HISTORY_WEEKS) continue;
    if ((ctx.week + COUNTRY_ORDER.indexOf(id)) % NEWS_HOUSING_EVERY_WEEKS !== 0) continue;
    const yoy = hpiYoY(c) * 100;
    const dir = yoy >= 0 ? 'up' : 'down';
    out.push({
      key: dir === 'up' ? 'HOUSING_UP' : 'HOUSING_DOWN',
      subject: id,
      tab: 'markets',
      icon: 'house',
      priority: P.housing + (id === ctx.home ? 2 : 0),
      tokens: {
        city: cityFor(ctx.state, id),
        country: countryName(id),
        theCountry: theCountryName(id),
        pct: newsAbsPct(yoy),
        reason: rng.pick(HOUSING_REASONS[dir][c.phase]),
      },
    });
  }
  return out;
}

/** The market's week, from the Ledger Composite's weekly move (Stage 6, src/sim/market.ts). */
export function marketStory(ctx: NewsContext, rng: Rng): Story | undefined {
  const c = ctx.state.world.countries[ctx.home];
  if (!c) return undefined;
  const pct = indexWeeklyMove(ctx.state) * 100;
  return {
    key: pct >= 0 ? 'MARKET_UP' : 'MARKET_DOWN',
    subject: ctx.home,
    tab: 'markets',
    icon: 'chart',
    priority: P.market,
    tokens: {
      index: MARKET_INDEX_NAME,
      pct: newsAbsPct(pct),
      sector: rng.pick(MARKET_SECTORS),
    },
  };
}

/** Total assets per bank now: yours from the weekly close, rivals' from their books and equity. */
function currentAssets(ctx: NewsContext): Map<string, { name: string; assets: number }> {
  const s = ctx.state;
  const out = new Map<string, { name: string; assets: number }>();
  const snap = s.history.weekly.at(-1);
  if (snap) out.set('you', { name: ctx.bank, assets: snap.totals.assets });
  for (const r of Object.values(s.rivals)) {
    if (r.status !== 'active') continue;
    const deposits = r.branches.reduce((sum, b) => sum + b.deposits, 0);
    out.set(r.id, { name: r.name, assets: deposits + r.equity });
  }
  return out;
}

const growthText = (pct: number) => (Math.abs(pct) >= 100 ? `${grouped(pct)}%` : newsAbsPct(pct));

/**
 * Year end (tick step 14): Fastest Growing Banks by asset growth since the
 * last marks, then new marks for next year. The first issue sets the marks.
 */
export function rankingStory(ctx: NewsContext, desk: NewsDesk): Story | undefined {
  const s = ctx.state;
  const now = currentAssets(ctx);
  const firstIssue = Object.keys(desk.assetMarks).length === 0;
  const yearEnd = isYearStart(s.meta.startDate, s.clock.day);
  if (!firstIssue && !yearEnd) return undefined;
  const ranked: { name: string; growth: number }[] = [];
  if (yearEnd) {
    for (const [id, cur] of now) {
      const mark = desk.assetMarks[id];
      if (mark === undefined || mark < RANKING_MIN_ASSETS) continue;
      ranked.push({ name: cur.name, growth: (cur.assets / mark - 1) * 100 });
    }
    ranked.sort((a, b) => b.growth - a.growth || (a.name < b.name ? -1 : 1));
  }
  desk.assetMarks = {};
  for (const [id, cur] of now) desk.assetMarks[id] = cur.assets;
  if (ranked.length < RANKING_SIZE || ranked[0]!.growth <= 0) return undefined;
  const year = dateOf(s.meta.startDate, s.clock.day - DAYS_PER_WEEK).getUTCFullYear();
  return {
    key: 'FASTEST_GROWING',
    subject: 'ranking',
    tab: 'business',
    icon: 'trophy',
    priority: P.ranking,
    tokens: {
      year: String(year),
      bank: ranked[0]!.name,
      pct: growthText(ranked[0]!.growth),
      second: ranked[1]!.name,
      third: ranked[2]!.name,
    },
  };
}
