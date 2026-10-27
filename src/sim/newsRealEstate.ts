// Real estate stories in The Weekly Ledger (Stage 7, SIMULATION §24): big
// building purchases and sales (REAL_ESTATE.newsMin and up), by the bank or by
// its founder privately, and a city's foreclosed homes sold off in one lot.
import { NEWS_PRIORITY as P, REAL_ESTATE } from '../config/balance';
import { newsMoney } from './newsFormat';
import { cityName, num, str, type NewsContext, type Story } from './newsStory';
import type { GameEvent } from './state';

export function realEstateStories(ctx: NewsContext): Story[] {
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
  switch (e.type) {
    case 'PROPERTY_BOUGHT':
    case 'PROPERTY_SOLD': {
      if (num(p.price) < REAL_ESTATE.newsMin) return undefined;
      const personal = p.account === 'personal';
      const bought = e.type === 'PROPERTY_BOUGHT';
      return {
        key: bought
          ? personal
            ? 'PROPERTY_BOUGHT_PERSONAL'
            : 'PROPERTY_BOUGHT'
          : personal
            ? 'PROPERTY_SOLD_PERSONAL'
            : 'PROPERTY_SOLD',
        subject: str(p.siteId),
        tab: 'business',
        icon: 'facade',
        priority: personal ? P.companyWeek : P.companyRoutine,
        tokens: {
          bank: ctx.bank,
          founder: ctx.state.meta.founderName,
          address: str(p.address, 'a downtown tower'),
          city: cityName(str(p.cityId)),
          price: m(p.price),
        },
      };
    }
    default:
      return undefined;
  }
}
