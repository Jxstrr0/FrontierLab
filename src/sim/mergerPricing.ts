// Rival M&A prices (SIMULATION §19.8, §18.5): the reference price an offer's
// premium is measured against, a distressed network's asking price, the shares
// an offer has to buy, and the target's acceptance curve.
import { MERGERS, SHARE_DEALS } from '../config/balance';
import { dexp } from './detmath';
import type { Rng } from './rng';
import type { GameState, RivalBank } from './state';

/** Book value per share of a rival (equity ÷ shares outstanding). */
export function rivalBvps(bank: RivalBank): number {
  return bank.equity / Math.max(1, bank.shares);
}

/**
 * A distressed network's asking price per share: BVPS × P/B, floored at
 * MERGERS.distressedMinAsk because a failed bank's equity can be thin or
 * negative (SIMULATION §18.5).
 */
export function askFromPb(bank: RivalBank, pb: number): number {
  return Math.max(MERGERS.distressedMinAsk, rivalBvps(bank) * pb);
}

/** Rolls the P/B for a distressed sale (§18.5: 0.4–0.7). */
export function rollDistressedAsk(bank: RivalBank, rng: Rng): number {
  return askFromPb(bank, rng.range(...MERGERS.distressedPb));
}

/** The asking price per share while distressed (mid P/B for saves made before asks existed). */
export function distressedAsk(bank: RivalBank): number {
  const [lo, hi] = MERGERS.distressedPb;
  return bank.distressedAsk ?? askFromPb(bank, (lo + hi) / 2);
}

/**
 * The price an offer's premium is measured against (§19.8): a listed active
 * rival's market price, a private one's book value per share, a distressed
 * network's asking price.
 */
export function referencePrice(bank: RivalBank): number {
  if (bank.status === 'distressed') return distressedAsk(bank);
  if (bank.listed) return bank.price;
  return rivalBvps(bank);
}

/** premium = offer / reference − 1 (§19.8). */
export function offerPremium(bank: RivalBank, pricePerShare: number): number {
  const ref = referencePrice(bank);
  return ref > 0 ? pricePerShare / ref - 1 : 0;
}

/**
 * The price per share the target's board weighs (§19.8): the share-paid part
 * counts at (1 − SHARE_DEALS.boardDiscount), since holders would rather have cash.
 */
export function boardPrice(pricePerShare: number, stockPct = 0): number {
  return pricePerShare * (1 - stockPct * SHARE_DEALS.boardDiscount);
}

/** Target shares your company already holds (from the Market tab). */
export function companySharesOf(state: GameState, rivalId: string): number {
  const held = state.market.holdings.company[rivalId]?.shares ?? 0;
  const bank = state.rivals[rivalId];
  return bank ? Math.min(held, bank.shares) : 0;
}

/** Shares the offer pays for: all outstanding shares less the ones your company holds. */
export function sharesToBuy(state: GameState, rivalId: string): number {
  const bank = state.rivals[rivalId];
  if (!bank) return 0;
  return Math.max(0, bank.shares - companySharesOf(state, rivalId));
}

/** The premium a target needs: healthy, Watch tier (CR < MERGERS.watchCr) or distressed (§19.8). */
export function requiredPremium(bank: RivalBank): number {
  if (bank.status === 'distressed') return MERGERS.reqDistressed;
  if (bank.capitalRatio < MERGERS.watchCr) return MERGERS.reqWatch;
  return MERGERS.reqHealthy;
}

/** accept = sigmoid((premium − req) / 0.06) (§19.8). */
export function acceptChance(premium: number, req: number): number {
  return 1 / (1 + dexp(-(premium - req) / MERGERS.sigmoidScale));
}
