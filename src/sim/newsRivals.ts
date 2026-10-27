// Rival banks in The Weekly Ledger (SIMULATION §24, priorities 3 and 4):
// branch openings and closures, new storefronts as cities grow, new charters,
// mergers between rivals, rival ad campaigns, app launches, price wars, failures and network carve-ups
// (rivals in your cities first), quarterly earnings, dividends and executive
// exits, plus the weekly "rate watch" on the best savings rate in your city.
import { NEWS_PRIORITY as P } from '../config/balance';
import { branchPrice, isOffered } from './branch/pricing';
import { rivalPriceInCity } from './rivalPrices';
import {
  busiestCity,
  cityName,
  districtName,
  num,
  str,
  type NewsContext,
  type Story,
} from './newsStory';
import { newsAbsPct, newsPct, newsMoney } from './newsFormat';
import type { GameEvent } from './state';

/** How a chartered bank's strategy reads in a headline. */
const STRATEGY_WORD: Record<string, string> = {
  incumbent: 'established lab',
  premium: 'premium lab',
  community: 'open-model lab',
  disruptor: 'app-first lab',
};

/** True when the rival has a branch in one of your cities. */
function isLocal(ctx: NewsContext, rivalId: string): boolean {
  const rival = ctx.state.rivals[rivalId];
  return !!rival && rival.cities.some((c) => ctx.yourCities.has(c));
}

export function rivalStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const rivalId = str(p.rivalId);
  const local = isLocal(ctx, rivalId);
  // Earnings and dividends rank by size of the move; locals edge ahead.
  const marketBoost = local ? 4 : 0;
  switch (e.type) {
    case 'RIVAL_BRANCH_OPENED':
    case 'RIVAL_BRANCH_CLOSED': {
      const here = ctx.yourCities.has(str(p.city));
      return {
        key: e.type,
        subject: rivalId,
        tab: 'banking',
        icon: 'facade',
        priority: here ? P.rivalLocal : P.rivalAbroad,
        group: 'rivalBranch',
        tokens: {
          bank: str(p.bank, 'A rival'),
          city: cityName(str(p.city)),
          district: districtName(str(p.district)),
          address: str(p.address, 'a new storefront'),
        },
      };
    }
    case 'RIVAL_OFFICE_GROWN':
    case 'RIVAL_OFFICE_SHRUNK': {
      const here = ctx.yourCities.has(str(p.city));
      return {
        key: e.type,
        subject: rivalId,
        tab: 'banking',
        icon: 'facade',
        priority: here ? P.rivalLocal : P.rivalAbroad,
        group: 'rivalBranch',
        tokens: {
          bank: str(p.bank, 'A rival'),
          city: cityName(str(p.city)),
          size: str(p.size, 'bigger').toLowerCase(),
        },
      };
    }
    case 'RIVAL_CITY_ENTRY': {
      const here = ctx.yourCities.has(str(p.city));
      return {
        key: 'RIVAL_CITY_ENTRY',
        subject: rivalId,
        tab: 'banking',
        icon: 'facade',
        priority: here ? P.rivalLocal + 5 : P.rivalAbroad + 5,
        tokens: {
          bank: str(p.bank, 'A rival'),
          city: cityName(str(p.city)),
          district: districtName(str(p.district)),
          address: str(p.address, 'a new storefront'),
          cities: String(num(p.cities)),
        },
      };
    }
    case 'RIVAL_CHARTERED': {
      const here = ctx.yourCities.has(str(p.city));
      return {
        key: 'RIVAL_CHARTERED',
        subject: rivalId,
        tab: 'banking',
        icon: 'spark',
        priority: here ? P.rivalLocal + 6 : P.rivalAbroad + 6,
        tokens: {
          bank: str(p.bank, 'A new lab'),
          city: cityName(str(p.city)),
          kind: STRATEGY_WORD[str(p.strategy)] ?? 'lab',
          n: String(num(p.branches)),
        },
      };
    }
    case 'RIVAL_MODEL_RELEASED':
      return {
        key: p.leads ? 'RIVAL_MODEL_LEADS' : 'RIVAL_MODEL_RELEASED',
        subject: rivalId,
        tab: 'banking',
        icon: 'spark',
        priority: p.leads ? P.rivalAbroad + 8 : P.rivalAbroad,
        tokens: {
          bank: str(p.rival, 'A rival lab'),
          model: str(p.model, 'a new model'),
          score: num(p.quality).toFixed(1),
        },
      };
    case 'RIVAL_MERGER': {
      const buyerLocal = isLocal(ctx, str(p.buyerId));
      return {
        key: 'RIVAL_MERGER',
        subject: rivalId,
        tab: 'banking',
        icon: 'handshake',
        priority: buyerLocal ? P.rivalLocal + 8 : P.rivalAbroad + 8,
        tokens: {
          buyer: str(p.buyer, 'A rival'),
          bank: str(p.bank, 'a smaller lab'),
          price: newsMoney(num(p.price), ctx.sym),
          n: String(num(p.branches)),
          cities: String(num(p.cities)),
        },
      };
    }
    case 'RIVAL_CAMPAIGN':
      return {
        key: 'RIVAL_CAMPAIGN',
        subject: `${rivalId}:${str(p.city)}`,
        tab: 'banking',
        icon: 'spark',
        priority: P.rivalLocal - 5,
        tokens: {
          bank: str(p.bank, 'A rival'),
          city: cityName(str(p.city)),
          weeks: String(num(p.weeks)),
        },
      };
    case 'RIVAL_APP_LAUNCH':
      return {
        key: 'RIVAL_APP_LAUNCH',
        subject: rivalId,
        tab: 'banking',
        icon: 'spark',
        priority: local ? P.rivalLocal - 8 : P.rivalAbroad - 8,
        tokens: { bank: str(p.bank, 'A rival'), app: num(p.app).toFixed(1) },
      };
    case 'RIVAL_GROWS_UP':
      return {
        key: 'RIVAL_GROWS_UP',
        subject: rivalId,
        tab: 'banking',
        icon: 'facade',
        priority: local ? P.rivalLocal : P.rivalAbroad,
        tokens: { bank: str(p.bank, 'A rival'), n: String(num(p.branches)) },
      };
    case 'CITY_GROWTH': {
      const here = ctx.yourCities.has(str(p.city));
      return {
        key: 'CITY_GROWTH',
        subject: str(p.city),
        tab: 'banking',
        icon: 'facade',
        priority: here ? P.rivalLocal : P.rivalAbroad,
        tokens: { city: cityName(str(p.city)), lots: String(num(p.lots)) },
      };
    }
    case 'PRICE_WAR':
      return {
        key: 'PRICE_WAR',
        subject: `${rivalId}:${str(p.city)}`,
        tab: 'banking',
        icon: 'chart',
        priority: ctx.yourCities.has(str(p.city)) ? P.rivalLocal + 3 : P.rivalAbroad,
        tokens: {
          bank: str(p.bank, 'A rival'),
          city: cityName(str(p.city)),
          bump: newsAbsPct(num(p.bump) * 100, 0),
          plusPrice: newsMoney(num(p.plusPrice), ctx.sym),
        },
      };
    case 'BANK_FAILURE':
      return {
        key: 'BANK_FAILURE',
        subject: rivalId,
        tab: 'banking',
        icon: 'gavel',
        priority: P.rivalLocal + 10,
        tokens: { bank: str(p.bank), n: String(num(p.n)) },
      };
    case 'RIVAL_RAISE':
      return {
        key: 'RIVAL_RAISE',
        subject: rivalId,
        tab: 'markets',
        icon: 'coin',
        priority: isLocal(ctx, rivalId) ? P.rivalLocal + 2 : P.rivalAbroad,
        tokens: {
          bank: str(p.bank),
          amount: newsMoney(num(p.amount), ctx.sym),
          price: `${ctx.sym}${num(p.price).toFixed(2)}`,
        },
      };
    case 'RIVAL_NETWORK_SPLIT': {
      const takers = Array.isArray(p.takers) ? p.takers.map((t) => str(t)).filter(Boolean) : [];
      return {
        key: 'RIVAL_NETWORK_SPLIT',
        subject: rivalId,
        tab: 'banking',
        icon: 'handshake',
        priority: P.rivalLocal + 2,
        tokens: {
          bank: str(p.bank),
          n: String(num(p.n)),
          takers: takers.length ? listText(takers) : 'its rivals',
        },
      };
    }
    case 'RIVAL_EARNINGS': {
      const pct = num(p.pct);
      return {
        key: pct >= 0 ? 'RIVAL_EARNINGS_UP' : 'RIVAL_EARNINGS_DOWN',
        subject: rivalId,
        tab: 'markets',
        icon: 'chart',
        priority: P.earnings + marketBoost + Math.min(6, Math.abs(pct) / 2),
        group: 'earnings',
        tokens: {
          company: str(p.company),
          revenue: newsMoney(num(p.revenue), ctx.sym),
          net: newsMoney(num(p.netIncome), ctx.sym),
          pct: newsAbsPct(pct),
          quarter: str(p.quarter),
        },
      };
    }
    case 'RIVAL_DIVIDEND':
      return {
        key: 'RIVAL_DIVIDEND',
        subject: rivalId,
        tab: 'markets',
        icon: 'coin',
        priority: P.earnings - 4 + marketBoost,
        group: 'dividend',
        tokens: {
          company: str(p.company),
          dps: `${ctx.sym}${num(p.dps).toFixed(2)}`,
          yield: newsPct(num(p.yieldPct), 2),
          quarter: str(p.quarter),
        },
      };
    case 'RIVAL_EXEC_RESIGN':
      return {
        key: 'RIVAL_EXEC_RESIGN',
        subject: rivalId,
        tab: 'business',
        icon: 'person',
        priority: local ? P.earnings : P.rivalAbroad,
        group: 'exec',
        tokens: { company: str(p.company), title: str(p.title), name: str(p.name) },
      };
    default:
      return undefined;
  }
}

/** "A", "A and B", "A, B and C". */
function listText(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** The cheapest Plus price among rivals in your busiest city (your home city before any office), and yours. */
export function rateWatchStory(ctx: NewsContext): Story | undefined {
  const s = ctx.state;
  const cityId = busiestCity(s) ?? s.meta.homeCityId;
  let leader: { name: string; rate: number } | undefined;
  for (const rival of Object.values(s.rivals)) {
    if (rival.status !== 'active' || !rival.branches.some((b) => b.cityId === cityId)) continue;
    const rate = rivalPriceInCity(s, rival, 'plus', cityId);
    if (rate === undefined) continue;
    if (!leader || rate < leader.rate) leader = { name: rival.name, rate };
  }
  if (!leader) return undefined;
  const mine = Object.values(s.branches).find((b) => b.cityId === cityId && b.status === 'open');
  const myRate = mine && isOffered(mine, 'plus') ? branchPrice(s, mine, 'plus') : undefined;
  const yours =
    myRate === undefined
      ? `${ctx.bank} has yet to sell Plus here.`
      : myRate <= leader.rate
        ? `${ctx.bank} matches or beats it at ${newsMoney(myRate, ctx.sym)}.`
        : `${ctx.bank} charges ${newsMoney(myRate, ctx.sym)}.`;
  return {
    key: 'RATE_WATCH',
    subject: cityId,
    tab: 'banking',
    icon: 'coin',
    priority: P.rateWatch,
    group: 'youRoutine',
    tokens: {
      city: cityName(cityId),
      leader: leader.name,
      leaderRate: newsMoney(leader.rate, ctx.sym),
      yours,
    },
  };
}
