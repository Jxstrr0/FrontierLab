// M&A stories in The Weekly Ledger (Stage 6, SIMULATION §24): your offers
// (only the big ones make the paper), rejections, regulator blocks, deals that
// fall through, closings (front page of Banking), finished conversions, and a
// failed rival's network going on sale (BANK_FAILURE in newsRivals.ts covers
// the seizure; this story is about the price).
import { MERGERS, NEWS_PRIORITY as P } from '../config/balance';
import { newsMoney, newsPct } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

export function mergersStories(ctx: NewsContext): Story[] {
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
  const base = { subject: rivalId, tab: 'banking' as const };
  const tokens = { bank: ctx.bank, target: str(p.bank, 'a rival bank') };
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  switch (e.type) {
    case 'MERGER_OFFER':
      if (num(p.total) < MERGERS.offerNewsMin) return undefined;
      return {
        ...base,
        key: 'MERGER_OFFER',
        icon: 'handshake',
        priority: P.companyRoutine,
        tokens: { ...tokens, total: m(p.total), premium: newsPct(num(p.premiumPct), 0) },
      };
    case 'MERGER_REJECTED':
      return {
        ...base,
        key: 'MERGER_REJECTED',
        icon: 'handshake',
        priority: P.companyRoutine,
        tokens,
      };
    case 'MERGER_BLOCKED':
      return {
        ...base,
        key: 'MERGER_BLOCKED',
        icon: 'gavel',
        priority: P.company,
        tokens: { ...tokens, reason: str(p.reason) },
      };
    case 'MERGER_LAPSED':
      return {
        ...base,
        key: 'MERGER_LAPSED',
        icon: 'handshake',
        priority: P.companyRoutine,
        tokens: { ...tokens, reason: str(p.reason) },
      };
    case 'ACQUISITION_CLOSED':
      return {
        ...base,
        key:
          p.distressed === true
            ? 'ACQUISITION_CLOSED_DISTRESSED'
            : num(p.stockPct) > 0
              ? 'ACQUISITION_CLOSED_STOCK'
              : 'ACQUISITION_CLOSED',
        icon: 'handshake',
        priority: P.companyAlarm,
        tokens: { ...tokens, price: m(p.price), n: String(num(p.branches)) },
      };
    case 'CONVERSION_DONE':
      return {
        ...base,
        key: 'CONVERSION_DONE',
        icon: 'facade',
        priority: P.companyRoutine,
        tokens: { ...tokens, n: String(num(p.branches)) },
      };
    case 'DISTRESSED_SALE': {
      const rival = ctx.state.rivals[rivalId];
      const local = !!rival && rival.cities.some((c) => ctx.yourCities.has(c));
      return {
        ...base,
        key: 'DISTRESSED_SALE',
        tab: 'markets',
        icon: 'coin',
        priority: local ? P.rivalLocal : P.rivalAbroad,
        tokens: {
          ...tokens,
          ask: `${ctx.sym}${num(p.ask).toFixed(2)}`,
          pb: num(p.pb).toFixed(2),
          weeks: String(num(p.weeks)),
        },
      };
    }
    default:
      return undefined;
  }
}
