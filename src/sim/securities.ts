// Prices and holdings values for anything you can own shares in (SIMULATION
// §19.7): non-bank listed companies, rival banks (listed at market, private at
// book) and your own bank ('self', personal account only).
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
