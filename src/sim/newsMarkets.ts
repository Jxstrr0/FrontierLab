// Markets stories in The Weekly Ledger (Stage 6, SIMULATION §24): your
// placements, IPO and secondary offerings (Business tab, company priority),
// sharp moves in your share price, notable results from listed companies, and
// the weekly market wrap when the Ledger Composite moves sharply (it outranks
// and replaces the routine wrap, which shares its key and subject).
import { NEWS_PRIORITY as P, STOCK_MARKET } from '../config/balance';
import { MARKET_INDEX_NAME, SECTORS, type SectorId } from '../data/stocks';
import { grouped, newsAbsPct, newsMoney } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent, GameState } from './state';

const business = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'business' });
const markets = (s: Omit<Story, 'tab'>): Story => ({ ...s, tab: 'markets' });

/** A share price for copy: "$12.34". */
const sharePrice = (x: number, sym: string) => `${sym}${x.toFixed(2)}`;

/** How the wrap names a sector. */
const SECTOR_WORD: Record<SectorId, string> = {
  banking: 'bank',
  technology: 'technology',
  energy: 'energy',
  auto: 'auto',
  retail: 'retail',
  realEstate: 'property',
};

/** The sector that moved most this week in the index's direction. */
function leadingSector(state: GameState, up: boolean): string {
  let best: SectorId = 'technology';
  let bestMove = -Infinity;
  for (const { id } of SECTORS) {
    let was = 0;
    let now = 0;
    for (const c of Object.values(state.market.companies)) {
      if (c.sector !== id || c.history.length < 2) continue;
      was += c.history[c.history.length - 2]! * c.shares;
      now += c.history[c.history.length - 1]! * c.shares;
    }
    if (was <= 0) continue;
    const move = (now / was - 1) * (up ? 1 : -1);
    if (move > bestMove) {
      bestMove = move;
      best = id;
    }
  }
  return SECTOR_WORD[best];
}

export function marketsStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  const px = (x: unknown) => sharePrice(num(x), ctx.sym);
  const bank = str(p.bank, ctx.bank);
  switch (e.type) {
    case 'PLACEMENT':
      return business({
        key: 'PLACEMENT',
        subject: `${bank}:${e.week}`,
        icon: 'handshake',
        priority: P.company,
        tokens: {
          bank,
          investor: str(p.investor, 'A fund'),
          shares: grouped(num(p.shares)),
          price: px(p.price),
          raised: m(p.raised),
        },
      });
    case 'IPO_LAUNCHED':
      return business({
        key: 'IPO_LAUNCHED',
        subject: bank,
        icon: 'chart',
        priority: P.company,
        tokens: {
          bank,
          adviser: str(p.adviser, 'Its adviser'),
          shares: grouped(num(p.shares)),
          price: px(p.price),
          float: newsAbsPct(num(p.floatPct), 0),
        },
      });
    case 'IPO_LISTED': {
      const pop = num(p.popPct);
      return business({
        key: 'IPO_LISTED',
        subject: bank,
        icon: 'chart',
        priority: P.companyAlarm,
        tokens: {
          bank,
          ticker: str(p.ticker),
          exchange: str(p.exchange, 'exchange'),
          price: px(p.price),
          open: px(p.open),
          pop: pop >= 0.05 ? `rose ${newsAbsPct(pop)}` : 'held steady',
          raised: m(p.raised),
        },
      });
    }
    case 'IPO_WITHDRAWN':
      return business({
        key: 'IPO_WITHDRAWN',
        subject: bank,
        icon: 'alert',
        priority: P.company,
        tokens: { bank, reason: str(p.reason, 'the rules were no longer met.') },
      });
    case 'SECONDARY_OFFERING':
      return business({
        key: 'SECONDARY_OFFERING',
        subject: `${bank}:${e.week}`,
        icon: 'coin',
        priority: P.company,
        tokens: {
          bank,
          shares: grouped(num(p.shares)),
          price: px(p.price),
          raised: m(p.raised),
        },
      });
    case 'FX_MOVE': {
      const pct = num(p.pct);
      return markets({
        key: pct >= 0 ? 'FX_UP' : 'FX_DOWN',
        subject: `fx:${str(p.country)}`,
        icon: 'coin',
        priority: P.market,
        tokens: { currency: str(p.currency), home: str(p.home), pct: newsAbsPct(pct) },
      });
    }
    case 'SHARE_PRICE_MOVE': {
      const pct = num(p.pct);
      return markets({
        key: pct >= 0 ? 'SHARE_PRICE_UP' : 'SHARE_PRICE_DOWN',
        subject: bank,
        icon: 'chart',
        priority: P.companyRoutine,
        tokens: { bank, ticker: str(p.ticker, bank), price: px(p.price), pct: newsAbsPct(pct) },
      });
    }
    case 'COMPANY_EARNINGS': {
      const pct = num(p.surprisePct);
      if (Math.abs(pct) < STOCK_MARKET.notableSurprise * 100) return undefined;
      return markets({
        key: pct >= 0 ? 'COMPANY_EARNINGS_BEAT' : 'COMPANY_EARNINGS_MISS',
        subject: str(p.companyId),
        icon: 'chart',
        priority: P.earnings + Math.min(6, Math.abs(pct) / 2),
        group: 'earnings',
        tokens: {
          company: str(p.company),
          ticker: str(p.ticker),
          eps: px(p.eps),
          pct: newsAbsPct(pct),
          quarter: str(p.quarter),
        },
      });
    }
    case 'MARKET_MOVE': {
      const pct = num(p.pct);
      return markets({
        key: pct >= 0 ? 'MARKET_UP' : 'MARKET_DOWN',
        subject: ctx.home,
        icon: 'chart',
        priority: P.earnings + Math.min(10, Math.abs(pct)),
        tokens: {
          index: MARKET_INDEX_NAME,
          pct: newsAbsPct(pct),
          sector: leadingSector(ctx.state, pct >= 0),
        },
      });
    }
    default:
      return undefined;
  }
}
