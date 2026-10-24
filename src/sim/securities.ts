// Prices and holdings values for anything you can own shares in (SIMULATION
// §19.7): non-bank listed companies, rival banks (listed at market, private at
// book) and your own bank ('self', personal account only). Also the
// mark-to-market rule: the balance sheet carries company holdings at live
// prices, so every price change is posted to P&L `investmentGains` (non-cash)
// in the same step (§14.4), keeping the balance identity.
import { postPnl } from './ledger';
import type { GameState } from './state';

export const SELF_ID = 'self';

/** Current price per share of a security, or 0 if unknown. */
export function securityPrice(state: GameState, id: string): number {
  if (id === SELF_ID) return state.stock.price;
  const company = state.market.companies[id];
  if (company) return company.price;
  return state.rivals[id]?.price ?? 0;
}

/** Market value of the company's or the founder's holdings. */
export function holdingsValue(state: GameState, account: 'company' | 'personal'): number {
  let total = 0;
  for (const [id, h] of Object.entries(state.market.holdings[account])) {
    total += h.shares * securityPrice(state, id);
  }
  return total;
}

/** Shares outstanding of a security (your own bank, a listed company or a rival). */
export function securityShares(state: GameState, id: string): number {
  if (id === SELF_ID) return state.company.sharesOutstanding;
  return state.market.companies[id]?.shares ?? state.rivals[id]?.shares ?? 0;
}

/** True for securities on the market: non-bank listed companies and listed, trading rivals. */
export function isListedSecurity(state: GameState, id: string): boolean {
  if (id === SELF_ID) return state.stock.status === 'public';
  if (state.market.companies[id]) return true;
  const r = state.rivals[id];
  return !!r && r.listed && (r.status === 'active' || r.status === 'distressed');
}

/**
 * Runs `change` (which moves security prices) and posts the change in the
 * company's holdings value to `investmentGains`, so live value never drifts
 * from what has been booked.
 */
export function withMarks(state: GameState, change: () => void): void {
  const before = holdingsValue(state, 'company');
  change();
  const delta = holdingsValue(state, 'company') - before;
  if (delta !== 0) postPnl(state, 'investmentGains', delta);
}
