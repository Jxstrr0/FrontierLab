// The Weekly Ledger's company desk (SIMULATION §24.2): the week's biggest share
// moves among listed companies, read from their real price history so the
// numbers match the Market screen, each with a reason that fits its sector and
// direction; and now and then a piece of corporate news (a new chief
// executive, a product launch, a new site) from a non-bank listed company.
// The reasons and corporate news are flavour: they explain a move the market
// model already made and never move a price themselves.
import { NEWS_COMPANY_DESK, NEWS_PRIORITY as P, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { LAUNCH_PRODUCTS, MOVER_REASONS } from '../data/newsWorldBeats';
import { STOCKS } from '../data/stocks';
import { grouped, newsAbsPct, newsExact } from './newsFormat';
import type { NewsContext, Story } from './newsStory';
import type { Rng } from './rng';
import type { ListedCompany } from './state';

/** This week's share move in percent, or undefined before two weeks of prices. */
function weeklyMove(c: ListedCompany): number | undefined {
  const h = c.history;
  if (h.length < 2 || !(h[h.length - 2]! > 0)) return undefined;
  return (h[h.length - 1]! / h[h.length - 2]! - 1) * 100;
}

/** Stories for listed companies whose shares moved unusually this week, biggest first. */
export function moverStories(ctx: NewsContext, rng: Rng): Story[] {
  const moves: { c: ListedCompany; pct: number }[] = [];
  for (const c of Object.values(ctx.state.market.companies)) {
    const pct = weeklyMove(c);
    // A move is news when it is big in itself and big for this company (§24.2).
    const usual = (NEWS_COMPANY_DESK.moverSigma * c.vol * 100) / Math.sqrt(WEEKS_PER_YEAR);
    const bar = Math.max(NEWS_COMPANY_DESK.moverMin, usual);
    if (pct !== undefined && Math.abs(pct) >= bar) moves.push({ c, pct });
  }
  moves.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct) || a.c.id.localeCompare(b.c.id));
  return moves.map(({ c, pct }) => {
    const up = pct >= 0;
    return {
      key: up ? 'STOCK_MOVER_UP' : 'STOCK_MOVER_DOWN',
      subject: c.id,
      tab: 'markets',
      icon: 'chart',
      priority: P.mover + Math.min(10, Math.abs(pct) / 2),
      group: 'movers',
      tokens: {
        company: c.name,
        ticker: c.ticker,
        pct: newsAbsPct(pct),
        price: newsExact(c.price, ctx.sym),
        reason: rng.pick(MOVER_REASONS[c.sector][up ? 'up' : 'down']),
      },
    };
  });
}

const CORPORATE_KEYS = ['COMPANY_CEO', 'COMPANY_LAUNCH', 'COMPANY_EXPAND'] as const;

/** Sometimes a piece of corporate news from a non-bank listed company. */
export function corporateStory(ctx: NewsContext, rng: Rng): Story | undefined {
  if (!rng.chance(NEWS_COMPANY_DESK.corporateChance)) return undefined;
  const listed = Object.values(ctx.state.market.companies).filter((c) => STOCKS[c.id]);
  if (listed.length === 0) return undefined;
  const c = rng.pick(listed);
  const key = rng.pick(CORPORATE_KEYS);
  const country = STOCKS[c.id]!.country;
  const cities = Object.values(CITIES).filter((x) => x.country === country);
  return {
    key,
    subject: c.id,
    tab: 'business',
    icon: key === 'COMPANY_CEO' ? 'person' : 'spark',
    priority: P.corporate,
    group: 'corporate',
    tokens: {
      company: c.name,
      name: `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`,
      product: rng.pick(LAUNCH_PRODUCTS[c.sector]),
      city: cities.length > 0 ? rng.pick(cities).name : 'its home city',
      n: grouped(rng.int(NEWS_COMPANY_DESK.siteJobs[0], NEWS_COMPANY_DESK.siteJobs[1])),
    },
  };
}
