// Top shareholders (SIMULATION §19.1, SCREENS §12): a few funds from the name
// pool hold every listed company and rival, fixed from a hash of the id (no
// RNG stream, so it is stable across saves); your company and you join the
// list when you hold shares. Your own bank's list comes from the cap table.
import { STOCK_MARKET } from '../config/balance';
import { FUND_NAMES } from '../data/names';
import { hashSeed } from './rng';
import { SELF_ID, securityShares } from './securities';
import type { GameState } from './state';

export interface HolderRow {
  name: string;
  pct: number;
  /** 'company' or 'personal' when the row is you. */
  you?: 'company' | 'personal';
}

/** Generated fund stakes for a security, largest first. */
export function fundHolders(id: string): { name: string; pct: number }[] {
  const words = hashSeed(0, `holders:${id}`);
  const pool = [...FUND_NAMES];
  const [lo, hi] = STOCK_MARKET.fundStake;
  const out: { name: string; pct: number }[] = [];
  for (let i = 0; i < STOCK_MARKET.fundHolders && pool.length > 0; i++) {
    const w = words[i % words.length]!;
    const name = pool.splice(w % pool.length, 1)[0]!;
    out.push({ name, pct: lo + ((hi - lo) * ((w >>> 8) % 1000)) / 1000 });
  }
  return out.sort((a, b) => b.pct - a.pct);
}

/** The top `n` holders of a security, including your company and you. */
export function topHolders(state: GameState, id: string, n = 3): HolderRow[] {
  const total = Math.max(1, securityShares(state, id));
  if (id === SELF_ID) {
    return [...state.stock.holders]
      .sort((a, b) => b.shares - a.shares)
      .slice(0, n)
      .map((h) => ({
        name: h.name,
        pct: h.shares / total,
        ...(h.kind === 'founder' ? { you: 'personal' as const } : {}),
      }));
  }
  const rows: HolderRow[] =
    state.market.companies[id]?.topHolders.map((h) => ({ ...h })) ?? fundHolders(id);
  const co = state.market.holdings.company[id]?.shares ?? 0;
  const me = state.market.holdings.personal[id]?.shares ?? 0;
  if (co > 0) rows.push({ name: state.meta.bankName, pct: co / total, you: 'company' });
  if (me > 0) rows.push({ name: state.meta.founderName, pct: me / total, you: 'personal' });
  return rows.sort((a, b) => b.pct - a.pct).slice(0, n);
}
