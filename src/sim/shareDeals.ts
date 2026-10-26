// Share-for-share deals (SIMULATION §19.8): a listed bank may pay part of a
// takeover in new shares valued at its market price. The split sets how many
// shares are issued and to whom: your own holding of the target is paid in the
// same mix, so its share part becomes founder shares. Closing issues them,
// adds their value to paid-in capital and moves your price like a secondary.
import { SHARE_DEALS } from '../config/balance';
import { PUBLIC_HOLDER } from './equityIpo';
import { clamp } from './math';
import { FOUNDER_ID, issueShares } from './shares';
import type { GameState } from './state';

export interface StockSplit {
  /** Share of the price paid in new shares, 0–1 (0 while private). */
  stockPct: number;
  /** Price paid in new shares. */
  stockValue: number;
  newShares: number;
  /** New shares for your own holding of the target. */
  founderNewShares: number;
}

/** Splits a price into cash and new shares; `personalValue` is your own holding's part of it. */
export function stockSplit(
  state: GameState,
  total: number,
  personalValue: number,
  stockPct: number,
): StockSplit {
  const price = state.stock.price;
  const pct = state.stock.status === 'public' && price > 0 ? clamp(stockPct, 0, 1) : 0;
  const stockValue = total * pct;
  return {
    stockPct: pct,
    stockValue,
    newShares: pct > 0 ? Math.round(stockValue / price) : 0,
    founderNewShares: pct > 0 ? Math.round((personalValue * pct) / price) : 0,
  };
}

/** Why the share part can't be offered, or undefined. */
export function shareDealBlocker(
  state: GameState,
  split: StockSplit,
  asked: number,
): string | undefined {
  if (!(asked > 0)) return undefined;
  if (state.stock.status !== 'public') return 'Paying in shares needs a listed bank.';
  const cap = SHARE_DEALS.maxNewSharePct;
  if (split.newShares > state.company.sharesOutstanding * cap)
    return `One deal can add at most ${cap * 100}% new shares.`;
  return undefined;
}

/** §19.8: the price fall from issuing deal shares, scaled by size up to the cap. */
export function shareDealImpact(state: GameState, newShares: number): number {
  const [lo, hi] = SHARE_DEALS.impact;
  const pct = newShares / Math.max(1, state.company.sharesOutstanding);
  return lo + (hi - lo) * clamp(pct / SHARE_DEALS.maxNewSharePct, 0, 1);
}

/** Closing: issues the deal shares, adds their value to paid-in capital, moves the price. */
export function issueDealShares(state: GameState, split: StockSplit): void {
  if (split.newShares <= 0) return;
  const fall = shareDealImpact(state, split.newShares);
  state.company.paidInCapital += split.stockValue;
  const founder = Math.min(split.founderNewShares, split.newShares);
  issueShares(state, { id: FOUNDER_ID, name: state.meta.founderName, kind: 'founder' }, founder);
  issueShares(state, PUBLIC_HOLDER, split.newShares - founder);
  const stock = state.stock;
  stock.price *= 1 - fall;
  const h = stock.history;
  if (h.length > 0) h[h.length - 1] = stock.price;
  stock.low52 = Math.min(stock.low52, stock.price);
}
