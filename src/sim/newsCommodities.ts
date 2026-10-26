// Commodities in The Weekly Ledger (SIMULATION §24.4): oil, gold, wheat,
// coffee and copper prices that drift with the world economy (gold leans the
// other way), pulled back toward their base price grown with the average
// nominal index. A sharp week or a one-year high or low makes a Markets story;
// the first issue of each month carries a wrap of all five. Prices draw from
// their own `commodities` stream and nothing else in the simulation reads them.
import { NEWS_COMMODITIES as C, NEWS_PRIORITY as P } from '../config/balance';
import { COMMODITIES, type CommoditySpec } from '../data/commodities';
import { isMonthStart } from './calendar';
import { dexp, dlog } from './detmath';
import { newsAbsPct, newsPrice } from './newsFormat';
import type { NewsContext, Story } from './newsStory';
import type { Rng } from './rng';
import type { GameState, NewsDesk } from './state';

/** The world's mood (§24.4): the average phase score over every country. */
function worldMood(state: GameState): { mood: number; nominal: number } {
  const all = Object.values(state.world.countries).filter((c) => !!c);
  if (all.length === 0) return { mood: 0, nominal: 1 };
  const mood = all.reduce((sum, c) => sum + C.mood[c!.phase], 0) / all.length;
  const nominal = all.reduce((sum, c) => sum + c!.nominal, 0) / all.length;
  return { mood, nominal };
}

/** Moves every price one week (call once per issue, before the stories). */
export function moveCommodities(state: GameState, desk: NewsDesk, rng: Rng): void {
  const { mood, nominal } = worldMood(state);
  for (const spec of COMMODITIES) {
    const h = (desk.commodities[spec.id] ??= [spec.base]);
    const p = h[h.length - 1]!;
    const anchor = dlog(spec.base * nominal);
    const step =
      spec.cycle * mood * C.driftPerWeek + C.revert * (anchor - dlog(p)) + rng.normal(0, spec.vol);
    h.push(p * dexp(step));
    if (h.length > C.historyWeeks) h.splice(0, h.length - C.historyWeeks);
  }
}

const pct = (h: number[], back: number) =>
  h.length > back ? (h[h.length - 1]! / h[h.length - 1 - back]! - 1) * 100 : 0;

function priceText(ctx: NewsContext, spec: CommoditySpec, price: number): string {
  return `${newsPrice(price, ctx.sym)} ${spec.unit}`;
}

/** This week's commodity stories: sharp moves, one-year highs and lows, and the monthly wrap. */
export function commodityStories(ctx: NewsContext, desk: NewsDesk, rng: Rng): Story[] {
  const out: Story[] = [];
  const base = { tab: 'markets' as const, icon: 'coin' as const, group: 'commodities' };
  for (const spec of COMMODITIES) {
    const h = desk.commodities[spec.id];
    if (!h || h.length < 2) continue;
    const price = h[h.length - 1]!;
    const move = pct(h, 1);
    const tokens = {
      name: spec.name,
      lower: spec.name.toLowerCase(),
      price: priceText(ctx, spec, price),
      pct: newsAbsPct(move),
    };
    if (Math.abs(move) >= C.newsMove) {
      out.push({
        ...base,
        key: move > 0 ? 'COMMODITY_SPIKE' : 'COMMODITY_SLUMP',
        subject: spec.id,
        priority: P.commodityMove + Math.min(6, Math.abs(move) / 2),
        tokens: { ...tokens, reason: rng.pick(spec.reasons[move > 0 ? 'up' : 'down']) },
      });
      continue;
    }
    if (h.length < C.historyWeeks) continue;
    // A one-year high or low is news once: not again until `recordGapWeeks` pass without one.
    const before = h.slice(0, -1);
    const older = h.slice(0, -1 - C.recordGapWeeks);
    const recent = h.slice(-1 - C.recordGapWeeks, -1);
    const high = price > Math.max(...before) && Math.max(...recent) <= Math.max(...older);
    const low = price < Math.min(...before) && Math.min(...recent) >= Math.min(...older);
    if (high || low)
      out.push({
        ...base,
        key: high ? 'COMMODITY_HIGH' : 'COMMODITY_LOW',
        subject: spec.id,
        priority: P.commodityRecord,
        tokens: {
          ...tokens,
          year: `${pct(h, h.length - 1) >= 0 ? 'up' : 'down'} ${newsAbsPct(pct(h, h.length - 1))}`,
        },
      });
  }
  if (isMonthStart(ctx.state.meta.startDate, ctx.state.clock.day)) {
    const parts = COMMODITIES.flatMap((spec) => {
      const h = desk.commodities[spec.id];
      if (!h || h.length < 2) return [];
      const m = pct(h, Math.min(C.wrapWeeks, h.length - 1));
      const dir = m >= 0 ? 'up' : 'down';
      return [
        `${spec.name.toLowerCase()} ${priceText(ctx, spec, h.at(-1)!)} (${dir} ${newsAbsPct(m)})`,
      ];
    });
    if (parts.length > 0)
      out.push({
        ...base,
        key: 'COMMODITY_WRAP',
        subject: 'wrap',
        priority: P.commodityWrap,
        tokens: { list: `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` },
      });
  }
  return out;
}
