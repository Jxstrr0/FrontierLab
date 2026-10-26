// The Money Column in The Weekly Ledger (SIMULATION §24.3): every other week, a
// short personal-finance column for readers in your home country. Its topic
// follows the home economy (a recent rate move, high inflation, a hot housing
// market, a downturn), or a timeless tip when nothing stands out, and it
// quotes the real policy rate, inflation, house prices and unemployment.
import { NEWS_COLUMN, NEWS_PRIORITY as P, NEWS_WORLD } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import type { TemplateKey } from '../data/ledgerTemplates';
import { hpiYoY } from './macro';
import { newsAbsPct, newsPct, newsRate } from './newsFormat';
import { countryName, theCountryName, type NewsContext, type Story } from './newsStory';
import type { Rng } from './rng';

/** This fortnight's column, or undefined in an off week. */
export function columnStory(ctx: NewsContext, rng: Rng): Story | undefined {
  if (ctx.week % NEWS_COLUMN.everyWeeks !== 0) return undefined;
  const c = ctx.state.world.countries[ctx.home];
  if (!c) return undefined;
  const topics: TemplateKey[] = ['COLUMN_EVERGREEN'];
  const move = c.lastDecision;
  if (move && move.week > ctx.week - NEWS_COLUMN.rateWindowWeeks && move.change !== 0)
    topics.push(move.change > 0 ? 'COLUMN_RATES_UP' : 'COLUMN_RATES_DOWN');
  if (c.inflation >= NEWS_WORLD.highInflation) topics.push('COLUMN_INFLATION');
  if (hpiYoY(c) > NEWS_WORLD.housingHot) topics.push('COLUMN_HOUSING');
  if (c.phase === 'recession' || c.phase === 'slowdown') topics.push('COLUMN_DOWNTURN');
  // A topical column wins over the evergreen tip whenever the news offers one.
  const key = topics.length > 1 ? rng.pick(topics.slice(1)) : topics[0]!;
  return {
    key,
    subject: 'column',
    tab: 'business',
    icon: 'coin',
    priority: P.column,
    tokens: {
      cb: COUNTRIES[ctx.home]?.centralBank ?? 'central bank',
      rate: newsRate(c.policyRate),
      infl: newsPct(c.inflation),
      hpi: newsAbsPct(hpiYoY(c) * 100),
      unemp: newsPct(c.unemployment),
      country: countryName(ctx.home),
      theCountry: theCountryName(ctx.home),
    },
  };
}
