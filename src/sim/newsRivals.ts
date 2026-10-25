// Rival banks in The Weekly Ledger (SIMULATION §24, priorities 3 and 4):
// branch openings and closures, price wars, failures and network carve-ups
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
import { basisPoints, newsAbsPct, newsPct, newsMoney, newsRate } from './newsFormat';
import type { GameEvent } from './state';

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
          bump: basisPoints(num(p.bump)),
          savingsRate: newsRate(num(p.savingsRate)),
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

/** The best savings rate among rivals in your busiest city (your home city before any branch), and yours. */
export function rateWatchStory(ctx: NewsContext): Story | undefined {
  const s = ctx.state;
  const cityId = busiestCity(s) ?? s.meta.homeCityId;
  let leader: { name: string; rate: number } | undefined;
  for (const rival of Object.values(s.rivals)) {
    if (rival.status !== 'active' || !rival.branches.some((b) => b.cityId === cityId)) continue;
    const rate =
      (rivalPriceInCity(s, rival, 'savings', cityId) ?? 0) + (rival.priceWar[cityId] ?? 0);
    if (!leader || rate > leader.rate) leader = { name: rival.name, rate };
  }
  if (!leader) return undefined;
  const mine = Object.values(s.branches).find((b) => b.cityId === cityId && b.status === 'open');
  const myRate = mine && isOffered(mine, 'savings') ? branchPrice(s, mine, 'savings') : undefined;
  const yours =
    myRate === undefined
      ? `${ctx.bank} has yet to post a rate here.`
      : myRate >= leader.rate
        ? `${ctx.bank} matches or beats it at ${newsRate(myRate)}.`
        : `${ctx.bank} pays ${newsRate(myRate)}.`;
  return {
    key: 'RATE_WATCH',
    subject: cityId,
    tab: 'banking',
    icon: 'coin',
    priority: P.rateWatch,
    tokens: {
      city: cityName(cityId),
      leader: leader.name,
      leaderRate: newsRate(leader.rate),
      yours,
    },
  };
}
