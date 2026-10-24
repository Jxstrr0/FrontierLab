// Your bank's cap table (SIMULATION §19): who holds the shares. Every new
// share goes through `issueShares`, so the holders always sum to
// company.sharesOutstanding. The founder's stake is the holder with id 'founder'.
import type { GameState, Shareholder } from './state';

export const FOUNDER_ID = 'founder';

/** Issues new shares to a holder (adding the holder if new). */
export function issueShares(
  state: GameState,
  holder: Omit<Shareholder, 'shares'>,
  shares: number,
): void {
  if (shares <= 0) return;
  const existing = state.stock.holders.find((h) => h.id === holder.id);
  if (existing) existing.shares += shares;
  else state.stock.holders.push({ ...holder, shares });
  state.company.sharesOutstanding += shares;
}

/** Moves existing shares between holders (trades in your listed stock). */
export function transferShares(
  state: GameState,
  fromId: string,
  to: Omit<Shareholder, 'shares'>,
  shares: number,
): boolean {
  const from = state.stock.holders.find((h) => h.id === fromId);
  if (!from || from.shares < shares || shares <= 0) return false;
  from.shares -= shares;
  const dest = state.stock.holders.find((h) => h.id === to.id);
  if (dest) dest.shares += shares;
  else state.stock.holders.push({ ...to, shares });
  state.stock.holders = state.stock.holders.filter((h) => h.shares > 0 || h.id === FOUNDER_ID);
  return true;
}

/** Shares a holder owns (0 if none). */
export function sharesHeld(state: GameState, holderId: string): number {
  return state.stock.holders.find((h) => h.id === holderId)?.shares ?? 0;
}

/** The founder's share of the bank, 0–1. */
export function founderStake(state: GameState): number {
  return sharesHeld(state, FOUNDER_ID) / Math.max(1, state.company.sharesOutstanding);
}

/** Book value per share. */
export function bookValuePerShare(state: GameState, equity: number): number {
  return equity / Math.max(1, state.company.sharesOutstanding);
}
