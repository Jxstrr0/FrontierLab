// Ventures stories in The Daily Ledger (Stage 7, SIMULATION §24): convention
// announcements (every one, loudest in your cities), big funding rounds and
// rounds in startups you back, IPOs, acquisitions and failures. Stories about
// startups you hold lead the Business page; the rest share a small group cap.
import { NEWS_PRIORITY as P, VENTURE_NEWS } from '../config/balance';
import { CITIES } from '../data/cities';
import { newsMoney } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

const GROUP = 'ventures';

export function venturesStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function conventionStory(ctx: NewsContext, e: GameEvent): Story {
  const p = e.payload;
  const cityId = str(p.cityId);
  const country = CITIES[cityId]?.country;
  const local = ctx.yourCities.has(cityId);
  const priority = local
    ? P.rivalLocal
    : country && ctx.operated.has(country)
      ? P.politicsLocal
      : P.politicsAbroad;
  const weeks = Math.max(0, num(p.startWeek) - ctx.week);
  return {
    key: 'CONVENTION_ANNOUNCED',
    subject: `${str(p.conventionId)}:${num(p.startWeek)}`,
    tab: 'business',
    icon: 'spark',
    priority,
    tokens: {
      event: str(p.name, 'A founders convention'),
      city: str(p.city, 'town'),
      weeks: weeks === 1 ? 'next week' : `in ${weeks} weeks`,
    },
  };
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const held = p.held === true;
  const subject = str(p.startupId);
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  const startup = ctx.state.ventures.startups[subject];
  const companyHolds = !!startup?.holders.some((h) => h.id === 'company' && h.shares > 0);
  const investor = companyHolds ? ctx.bank : ctx.state.meta.founderName;
  const tokens = { name: str(p.name, 'A startup'), bank: ctx.bank, investor };
  const base = { subject, tab: 'business' as const, icon: 'spark' as const };
  const minor = { ...base, group: GROUP };
  switch (e.type) {
    case 'CONVENTION_ANNOUNCED':
      return conventionStory(ctx, e);
    case 'VENTURE_ROUND': {
      const big = num(p.amount) >= VENTURE_NEWS.bigRound;
      const backed = held;
      if (!big && !backed) return undefined;
      return {
        ...(backed ? base : minor),
        key: p.down === true ? 'VENTURE_ROUND_DOWN' : 'VENTURE_ROUND',
        priority: backed ? P.companyRoutine : P.earnings,
        tokens: { ...tokens, round: str(p.round), amount: m(p.amount), post: m(p.postMoney) },
      };
    }
    case 'VENTURE_IPO':
      return {
        ...(held ? base : minor),
        tab: 'markets',
        icon: 'chart',
        key: held ? 'VENTURE_IPO_HELD' : 'VENTURE_IPO',
        priority: held ? P.company : P.earnings,
        tokens: { ...tokens, ticker: str(p.ticker), price: `${ctx.sym}${num(p.price).toFixed(2)}` },
      };
    case 'VENTURE_ACQUIRED': {
      const big = num(p.price) >= VENTURE_NEWS.bigExit;
      return {
        ...(held ? base : minor),
        icon: 'handshake',
        key: held ? 'VENTURE_ACQUIRED_HELD' : 'VENTURE_ACQUIRED',
        priority: held ? P.company : big ? P.earnings : P.market,
        tokens: { ...tokens, price: m(p.price) },
      };
    }
    case 'VENTURE_FAILED':
      return {
        ...(held ? base : minor),
        icon: 'alert',
        key: held ? 'VENTURE_FAILED_HELD' : 'VENTURE_FAILED',
        priority: held ? P.company : P.economy,
        tokens,
      };
    default:
      return undefined;
  }
}
