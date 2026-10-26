// The Weekly Ledger's Stage 9 personal stories (SIMULATION §24): your place on
// the year-end rich list, insider-trading probes and their fines, and home
// purchases of HOMES_CFG.newsMin or more, and every trophy asset bought or sold (§22a).
import { HOMES_CFG, NEWS_PRIORITY as P } from '../config/balance';
import { newsMoney } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

export function personalStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const founder = ctx.state.meta.founderName;
  const base = { bank: ctx.bank, founder, name: str(p.name, founder) };
  switch (e.type) {
    case 'RICH_LIST': {
      const prev = num(p.prevRank);
      const rank = num(p.rank);
      return {
        key: p.entered === true ? 'RICH_LIST' : 'RICH_LIST_RANK',
        subject: 'you',
        tab: 'business',
        icon: 'trophy',
        priority: P.ranking,
        tokens: {
          ...base,
          rank: String(rank),
          worth: newsMoney(num(p.worth), ctx.sym),
          moves: prev === 0 || prev === rank ? 'holds' : rank < prev ? 'climbs' : 'slips',
        },
      };
    }
    case 'INSIDER_PROBE_OPENED':
      return {
        key: 'INSIDER_PROBE',
        subject: 'you',
        tab: 'markets',
        icon: 'gavel',
        priority: P.companyAlarm,
        tokens: { ...base, fine: newsMoney(num(p.fine), ctx.sym) },
      };
    case 'INSIDER_FINED':
      return {
        key: 'INSIDER_FINED',
        subject: 'you',
        tab: 'markets',
        icon: 'gavel',
        priority: P.companyAlarm,
        tokens: {
          ...base,
          fine: newsMoney(num(p.fine), ctx.sym),
          how:
            p.fought === true ? 'fought the case and lost' : 'settled without admitting wrongdoing',
        },
      };
    case 'HOME_BOUGHT':
      if (num(p.price) < HOMES_CFG.newsMin) return undefined;
      return {
        key: 'HOME_BOUGHT',
        subject: str(p.homeId),
        tab: 'business',
        icon: 'house',
        priority: P.companyRoutine,
        tokens: { ...base, home: str(p.name, 'a home'), price: newsMoney(num(p.price), ctx.sym) },
      };
    case 'TROPHY_BOUGHT':
    case 'TROPHY_SOLD':
      return {
        key: e.type,
        subject: `trophy:${str(p.trophyId)}`,
        tab: 'business',
        icon: 'trophy',
        priority: P.companyRoutine,
        tokens: {
          ...base,
          trophy: str(p.name),
          kind: str(p.kind).toLowerCase(),
          price: newsMoney(num(p.price), ctx.sym),
        },
      };
    default:
      return undefined;
  }
}
