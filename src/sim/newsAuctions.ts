// Auction stories in The Weekly Ledger (Stage 9, SIMULATION §24 "conventions and
// auctions"): a preview when a house lists its next sale, record prices, the
// founder's wins and consignment sales, and a gentle story when an appraisal
// unmasks a fake.
import { DAYS_PER_WEEK, NEWS_PRIORITY as P } from '../config/balance';
import { dateOf } from './calendar';
import { newsMoney } from './newsFormat';
import { num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "18 March" for the day a sale week starts. */
function saleDate(ctx: NewsContext, week: number): string {
  const d = dateOf(ctx.state.meta.startDate, week * DAYS_PER_WEEK);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function auctionStories(ctx: NewsContext): Story[] {
  const out: Story[] = [];
  for (const e of ctx.events) {
    const s = fromEvent(ctx, e);
    if (s) out.push(s);
  }
  return out;
}

const recordWin = (ctx: NewsContext, itemId: string) =>
  ctx.events.some(
    (e) => e.type === 'AUCTION_RECORD' && e.payload.yours === true && e.payload.itemId === itemId,
  );

function fromEvent(ctx: NewsContext, e: GameEvent): Story | undefined {
  const p = e.payload;
  const m = (x: unknown) => newsMoney(num(x), ctx.sym);
  const tokens = {
    house: str(p.house, 'the auction house'),
    item: str(p.item, 'a rare piece'),
    bank: ctx.bank,
    founder: ctx.state.meta.founderName,
  };
  const base = { tab: 'business' as const, icon: 'gavel' as const };
  const yours = { ...base, priority: P.companyWeek };
  switch (e.type) {
    case 'AUCTION_PREVIEW':
      return {
        ...base,
        key: 'AUCTION_PREVIEW',
        subject: `${str(p.houseId)}:${num(p.week)}`,
        priority: P.housing,
        group: 'auctions',
        tokens: {
          ...tokens,
          estimate: m(p.estimate),
          date: saleDate(ctx, num(p.week)),
          lots: String(num(p.lots)),
        },
      };
    case 'AUCTION_RECORD':
      return {
        ...(p.yours === true ? yours : { ...base, priority: P.politicsLocal, group: 'auctions' }),
        key: p.yours === true ? 'AUCTION_RECORD_YOURS' : 'AUCTION_RECORD',
        subject: str(p.itemId),
        tokens: { ...tokens, price: m(p.price), estimate: m(p.estimate) },
      };
    case 'AUCTION_WON':
    case 'AUCTION_SOLD':
      // A record-price win already makes its own story.
      if (e.type === 'AUCTION_WON' && recordWin(ctx, str(p.itemId))) return undefined;
      return {
        ...yours,
        key: e.type,
        subject: str(p.itemId),
        tokens: { ...tokens, price: m(p.price) },
      };
    case 'APPRAISAL_DONE':
      if (p.genuine !== false) return undefined;
      return {
        ...yours,
        icon: 'alert',
        key: 'AUCTION_FAKE',
        subject: str(p.collectibleId),
        tokens,
      };
    default:
      return undefined;
  }
}
