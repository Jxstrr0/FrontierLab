// Share buybacks (SIMULATION §19.6a): a listed bank buys shares back from the
// public at the market price plus BUYBACK.premium, pays a broker's fee and
// retires them. The cost leaves cash (financing) and retained earnings, like a
// dividend, so earnings, book value and votes are spread over fewer shares.
// One programme a quarter; the public keeps BUYBACK.minFloat of the bank and
// capital must stay Adequate or better afterwards.
import { BUYBACK } from '../config/balance';
import { capitalBufferPp, capitalSnapshot, tierFor } from './capital';
import { PUBLIC_HOLDER } from './equityIpo';
import { pushEvent } from './events';
import { postCash } from './ledger';
import { clamp } from './math';
import { retireShares, sharesHeld } from './shares';
import type { GameState } from './state';

export interface BuybackQuote {
  shares: number;
  /** Price per share, premium included. */
  price: number;
  gross: number;
  fee: number;
  /** Cash spent, fee included. */
  cost: number;
  /** Capital ratio once the cost has left equity. */
  crAfter: number;
}

/** The most shares one programme may buy: maxPct of the bank, keeping the public's minFloat. */
export function maxBuybackShares(state: GameState): number {
  const out = state.company.sharesOutstanding;
  const pub = sharesHeld(state, PUBLIC_HOLDER.id);
  const f = BUYBACK.minFloat;
  // (public − n) / (outstanding − n) ≥ f  ⇒  n ≤ (public − f × outstanding) / (1 − f)
  const byFloat = Math.floor((pub - f * out) / (1 - f));
  return Math.max(0, Math.min(Math.floor(out * BUYBACK.maxPct), byFloat));
}

/** §19.6a: pct of outstanding bought at price × (1 + premium), plus the fee. */
export function buybackQuote(state: GameState, pct: number): BuybackQuote {
  const want = Math.round(state.company.sharesOutstanding * clamp(pct, 0, BUYBACK.maxPct));
  const shares = Math.min(want, maxBuybackShares(state));
  const price = state.stock.price * (1 + BUYBACK.premium);
  const gross = shares * price;
  const fee = gross * BUYBACK.fee;
  const cost = gross + fee;
  const snap = capitalSnapshot(state);
  const crAfter = (snap.cet1 - cost) / Math.max(1, snap.rwa);
  return { shares, price, gross, fee, cost, crAfter };
}

/** §19.6a: price lift +1% to +4%, scaled by size up to the largest programme. */
export function buybackImpact(state: GameState, shares: number): number {
  const [lo, hi] = BUYBACK.impact;
  const pct = shares / Math.max(1, state.company.sharesOutstanding);
  return lo + (hi - lo) * clamp(pct / BUYBACK.maxPct, 0, 1);
}

/** The week the next programme may start (one a quarter). */
export function nextBuybackWeek(state: GameState): number {
  const last = state.stock.buybacks?.at(-1);
  return last ? last.week + BUYBACK.gapWeeks : 0;
}

/** Why a buyback of this quote can't run now, or undefined when it can. */
export function buybackBlocker(state: GameState, q: BuybackQuote): string | undefined {
  if (state.stock.status !== 'public') return 'Only a listed lab can buy back its shares.';
  if (state.clock.week < nextBuybackWeek(state)) return 'One buyback a quarter.';
  if (q.shares <= 0) return `The public must keep at least ${BUYBACK.minFloat * 100}% of the lab.`;
  if (q.price <= 0) return 'Your shares are not trading.';
  if (state.company.cash < q.cost) return 'Not enough cash.';
  const tier = tierFor(q.crAfter, capitalBufferPp(state));
  if (tier !== 'strong' && tier !== 'adequate')
    return 'Credit ratio would fall below the Adequate tier.';
  return undefined;
}

/** Books a buyback: cash and retained earnings down, shares retired, the price lifted. */
export function bookBuyback(state: GameState, q: BuybackQuote): void {
  const lift = buybackImpact(state, q.shares);
  postCash(state, -q.cost, 'financing');
  state.company.retainedEarnings -= q.cost;
  retireShares(state, PUBLIC_HOLDER.id, q.shares);
  const stock = state.stock;
  stock.price *= 1 + lift;
  const h = stock.history;
  if (h.length > 0) h[h.length - 1] = stock.price;
  stock.high52 = Math.max(stock.high52, stock.price);
  const list = (stock.buybacks ??= []);
  list.push({ week: state.clock.week, shares: q.shares, price: q.price, cost: q.cost });
  if (list.length > BUYBACK.kept) list.splice(0, list.length - BUYBACK.kept);
  pushEvent(
    state,
    'SHARE_BUYBACK',
    { bank: state.meta.bankName, shares: q.shares, price: q.price, cost: q.cost },
    4,
  );
}
