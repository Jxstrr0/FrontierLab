// Raising equity through an investment bank (SIMULATION §19.3, §19.4, §19.6):
// private placements to a fund while private, launching the IPO (it lists at
// the next quarter-end tick), and secondary offerings once listed. Each raise
// brings cash in as financing and adds the net to paid-in capital. A listed
// bank can also buy shares back (§19.6a, buybacks.ts).
import { IPO, PLACEMENT, SECONDARY } from '../../config/balance';
import { INVESTMENT_BANKS } from '../../data/investmentBanks';
import { bookBuyback, buybackBlocker, buybackQuote } from '../buybacks';
import { bookRaise, PUBLIC_HOLDER } from '../equityIpo';
import {
  ipoChecklist,
  investorPool,
  ipoQuote,
  placementQuote,
  placementStatus,
  secondaryImpact,
  secondaryQuote,
} from '../equityOffers';
import { pushEvent } from '../events';
import { stream } from '../rng';
import type { GameState } from '../state';
import { privateValuation } from '../valuation';
import { fail, ok, type CommandResult } from './result';

const validPct = (x: number) => Number.isFinite(x) && x > 0;

const fundId = (name: string) => `fund:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

/** §19.3: sells new shares (pct of outstanding, up to 25%) to a fund at the private valuation × 0.9. */
export function privatePlacement(
  state: GameState,
  bankId: string,
  pct: number,
): CommandResult<{ investor: string; raised: number }> {
  if (!INVESTMENT_BANKS[bankId]) return fail('Choose an investment bank.');
  if (state.stock.status !== 'private')
    return fail('Listed labs raise money with a secondary offering.');
  if (state.stock.ipo) return fail('Your IPO is under way.');
  if (!validPct(pct) || pct > PLACEMENT.maxPct + 1e-9)
    return fail(`A round can sell up to ${PLACEMENT.maxPct * 100}% of the lab.`);
  const status = placementStatus(state);
  if (status.left <= 0) return fail(`You have used all ${PLACEMENT.maxRounds} private rounds.`);
  if (state.clock.week < status.nextWeek)
    return fail(`Investors want ${PLACEMENT.gapWeeks} weeks between rounds.`);
  const q = placementQuote(state, bankId, pct);
  if (q.shares <= 0 || q.price <= 0) return fail('Investors cannot value the lab yet.');

  // Same pick as the preview (nextInvestor), now consuming the draw.
  const investor = stream(state, 'equity').pick(investorPool(state));
  bookRaise(state, { id: fundId(investor), name: investor, kind: 'fund' }, q);
  state.stock.placements.push({
    week: state.clock.week,
    shares: q.shares,
    price: q.price,
    investor,
    raised: q.net,
  });
  state.stock.price = privateValuation(state);
  pushEvent(
    state,
    'PLACEMENT',
    { bank: state.meta.bankName, investor, shares: q.shares, price: q.price, raised: q.net },
    4,
  );
  return ok({ investor, raised: q.net });
}

/** §19.4: launches the IPO with a float of 10–40%; it lists at the next quarter-end. */
export function launchIpo(state: GameState, bankId: string, floatPct: number): CommandResult {
  const bank = INVESTMENT_BANKS[bankId];
  if (!bank) return fail('Choose an investment bank.');
  if (state.stock.status !== 'private') return fail('Your lab is already listed.');
  if (state.stock.ipo) return fail('Your IPO is already under way.');
  const [lo, hi] = IPO.floatPct;
  if (!Number.isFinite(floatPct) || floatPct < lo - 1e-9 || floatPct > hi + 1e-9)
    return fail(`Float between ${lo * 100}% and ${hi * 100}% of the lab.`);
  const failed = ipoChecklist(state).find((r) => !r.ok);
  if (failed) return fail(`Not eligible yet: ${failed.label.toLowerCase()}.`);
  const q = ipoQuote(state, bankId, floatPct);
  if (q.price <= 0 || q.shares <= 0) return fail('Investors cannot value the lab yet.');
  state.stock.ipo = {
    bankId,
    floatPct,
    shares: q.shares,
    price: q.price,
    fee: q.feeRate,
    launchedWeek: state.clock.week,
  };
  delete state.stock.ipoWithdrawn;
  pushEvent(
    state,
    'IPO_LAUNCHED',
    {
      bank: state.meta.bankName,
      adviser: bank.name,
      price: q.price,
      shares: q.shares,
      floatPct: floatPct * 100,
    },
    4,
  );
  return ok();
}

/** §19.6: issues new shares (pct of outstanding) to the market at the price less 3%. */
export function secondaryOffering(
  state: GameState,
  bankId: string,
  pct: number,
): CommandResult<{ raised: number }> {
  if (!INVESTMENT_BANKS[bankId]) return fail('Choose an investment bank.');
  if (state.stock.status !== 'public') return fail('A secondary offering needs a listed lab.');
  if (!validPct(pct) || pct > SECONDARY.maxPct + 1e-9)
    return fail(`One offering can add up to ${SECONDARY.maxPct * 100}% new shares.`);
  const q = secondaryQuote(state, bankId, pct);
  if (q.shares <= 0 || q.price <= 0) return fail('Your shares are not trading.');
  bookRaise(state, PUBLIC_HOLDER, q);
  state.stock.price *= 1 - secondaryImpact(pct);
  const h = state.stock.history;
  if (h.length > 0) h[h.length - 1] = state.stock.price;
  state.stock.low52 = Math.min(state.stock.low52, state.stock.price);
  pushEvent(
    state,
    'SECONDARY_OFFERING',
    { bank: state.meta.bankName, shares: q.shares, price: q.price, raised: q.net },
    4,
  );
  return ok({ raised: q.net });
}

/** §19.6a: buys back pct of outstanding from the public at market plus a premium, and retires it. */
export function buyBackShares(
  state: GameState,
  pct: number,
): CommandResult<{ shares: number; cost: number }> {
  if (!validPct(pct)) return fail('Choose how much of the lab to buy back.');
  const q = buybackQuote(state, pct);
  const blocker = buybackBlocker(state, q);
  if (blocker) return fail(blocker);
  bookBuyback(state, q);
  return ok({ shares: q.shares, cost: q.cost });
}
