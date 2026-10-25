// Market tab view model (SCREENS §12): one card's worth of facts for every
// security in a sector, read from the simulation. Banking lists the listed
// rival banks and, once you are public, your own bank (tradable personally).
import { QUARTERS_PER_YEAR, STOCK_MARKET } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EXCHANGES, type SectorId } from '../../data/stocks';
import { topHolders, type HolderRow } from '../../sim/marketHolders';
import { priceEarnings } from '../../sim/marketStocks';
import { rivalNetIncomeTtm } from '../../sim/marketRivals';
import { SELF_ID } from '../../sim/securities';
import type { GameState, RivalBank } from '../../sim/state';
import { netIncomeTtm } from '../../sim/valuation';

export interface SecurityView {
  id: string;
  name: string;
  ticker: string;
  exchange: string;
  monogram: string;
  ink: string;
  price: number;
  history: number[];
  marketCap: number;
  /** Annual dividend per share and yield on the current price. */
  dividend: number;
  yield: number;
  high52: number;
  low52: number;
  pe?: number;
  holders: HolderRow[];
  /** Your own bank: personal trades only. */
  self: boolean;
}

/** Sector ink for monograms (tokens are CSS-only, so these are SVG-safe hexes). */
const SECTOR_INK: Record<Exclude<SectorId, 'banking'>, string> = {
  technology: '#3b5f8a',
  energy: '#8a5a2b',
  auto: '#5b4f7a',
  retail: '#3e8a73',
  realEstate: '#7a3e4f',
};

const monogramOf = (ticker: string) => ticker.slice(0, 2);

/** Every security on the market in a sector, largest first. */
export function sectorSecurities(state: GameState, sector: SectorId): SecurityView[] {
  if (sector === 'banking') return bankingSecurities(state);
  return Object.values(state.market.companies)
    .filter((c) => c.sector === sector)
    .map((c) => {
      const dividend = c.price * c.divYield;
      return {
        id: c.id,
        name: c.name,
        ticker: c.ticker,
        exchange: c.exchange,
        monogram: monogramOf(c.ticker),
        ink: SECTOR_INK[c.sector as Exclude<SectorId, 'banking'>],
        price: c.price,
        history: c.history,
        marketCap: c.price * c.shares,
        dividend,
        yield: c.divYield,
        high52: c.high52,
        low52: c.low52,
        pe: priceEarnings(c.price, c.eps),
        holders: topHolders(state, c.id),
        self: false,
      };
    })
    .sort((a, b) => b.marketCap - a.marketCap);
}

/** Listed rivals that still trade, plus your bank once listed. */
function bankingSecurities(state: GameState): SecurityView[] {
  const out: SecurityView[] = [];
  for (const r of Object.values(state.rivals)) {
    if (!r.listed || (r.status !== 'active' && r.status !== 'distressed')) continue;
    out.push(rivalSecurity(state, r));
  }
  const st = state.stock;
  if (st.status === 'public') {
    const eps = netIncomeTtm(state) / Math.max(1, state.company.sharesOutstanding);
    const dividend = state.governance.dividendPerShare * QUARTERS_PER_YEAR;
    out.push({
      id: SELF_ID,
      name: state.meta.bankName,
      ticker: st.ticker ?? '',
      exchange: st.exchange ?? '',
      monogram: state.meta.monogram,
      ink: state.meta.brandInk,
      price: st.price,
      history: st.history,
      marketCap: st.price * state.company.sharesOutstanding,
      dividend,
      yield: st.price > 0 ? dividend / st.price : 0,
      high52: st.high52,
      low52: st.low52,
      pe: priceEarnings(st.price, eps),
      holders: topHolders(state, SELF_ID),
      self: true,
    });
  }
  return out.sort((a, b) => b.marketCap - a.marketCap);
}

/**
 * One rival bank's market facts (Market and M&A cards). Only meaningful for a
 * listed rival; a private one has no share price or history.
 */
export function rivalSecurity(state: GameState, r: RivalBank): SecurityView {
  const dividend = (r.dps ?? 0) * QUARTERS_PER_YEAR;
  const eps = rivalNetIncomeTtm(r) / Math.max(1, r.shares);
  return {
    id: r.id,
    name: r.name,
    ticker: r.ticker ?? monogramOf(r.name.toUpperCase()),
    exchange: EXCHANGES[CITIES[r.cities[0] ?? '']?.country ?? 'CA'],
    monogram: r.monogram,
    ink: r.ink,
    price: r.price,
    history: r.history,
    marketCap: r.price * r.shares,
    dividend,
    yield: r.price > 0 ? dividend / r.price : 0,
    high52: r.high52,
    low52: r.low52,
    pe: priceEarnings(r.price, eps),
    holders: topHolders(state, r.id),
    self: false,
  };
}

/**
 * The price move a card shows: over the last year of weekly closes, or over
 * as many weeks as there are ("in 12 wk"), with the wording for it.
 */
export function priceChange(
  history: readonly number[],
  price: number,
): { change: number; since: string } {
  const recent = history.slice(-(STOCK_MARKET.rangeWeeks + 1));
  const first = recent[0] ?? price;
  const span = recent.length - 1;
  const since =
    span >= STOCK_MARKET.rangeWeeks ? 'in a year' : span > 0 ? `in ${span} wk` : 'this week';
  return { change: first > 0 ? price / first - 1 : 0, since };
}

/** A share price for cards: "$12.34" (prices stay exact to the cent). */
export function sharePrice(x: number, sym: string): string {
  return `${sym}${x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
