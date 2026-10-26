// M&A commands (SIMULATION §19.8, SCREENS §12): offer to buy a rival bank.
// The offer is validated now and answered at the next weekly tick
// (mergers.ts): first the regulator, then the target's board.
import { MERGERS } from '../../config/balance';
import { planDeal, regulatorChecks, type DealPlan, type RegulatorCheck } from '../acquisitionPlan';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { boardPrice, offerPremium, referencePrice } from '../mergerPricing';
import { shareDealBlocker } from '../shareDeals';
import { cityLabel, targetBlocker } from '../mergerRules';
import type { GameState, MergerOffer } from '../state';
import { fail, money, ok, type CommandResult } from './result';

export { pendingOffer, retryWeek } from '../mergerRules';

export interface MergerQuote {
  reference: number;
  premium: number;
  plan: DealPlan;
  /** The regulator's pre-check: the same tests as the answer, without the roll. */
  checks: RegulatorCheck[];
  /** Why the offer can't be made now (shown on the disabled button). */
  blocker?: string;
}

/** Everything the offer sheet shows for a price per share. */
export function mergerQuote(
  state: GameState,
  rivalId: string,
  pricePerShare: number,
  stockPct = 0,
): MergerQuote | undefined {
  const bank = state.rivals[rivalId];
  if (!bank) return undefined;
  const plan = planDeal(state, bank, pricePerShare, stockPct);
  const quote: MergerQuote = {
    reference: referencePrice(bank),
    premium: offerPremium(bank, boardPrice(pricePerShare, plan.split.stockPct)),
    plan,
    checks: regulatorChecks(plan, cityLabel),
  };
  const blocker =
    targetBlocker(state, rivalId) ??
    (!(pricePerShare > 0) || !Number.isFinite(pricePerShare)
      ? 'Enter a price per share.'
      : !(stockPct >= 0 && stockPct <= 1)
        ? 'Choose how much to pay in shares.'
        : shareDealBlocker(state, plan.split, stockPct)) ??
    (state.company.cash < plan.cash ? `Not enough cash: you need ${money(plan.cash)}.` : undefined);
  if (blocker) quote.blocker = blocker;
  return quote;
}

/**
 * Offers to buy every outstanding share of a rival at a price per share (§19.8),
 * stockPct of it paid in your new shares when you are listed.
 */
export function offerMerger(
  state: GameState,
  rivalId: string,
  pricePerShare: number,
  stockPct = 0,
): CommandResult<{ offerId: string }> {
  const quote = mergerQuote(state, rivalId, pricePerShare, stockPct);
  if (!quote) return fail('That bank no longer exists.');
  if (quote.blocker) return fail(quote.blocker);
  const bank = state.rivals[rivalId]!;
  const offer: MergerOffer = {
    id: newId(state, 'ma'),
    rivalId,
    pricePerShare,
    total: quote.plan.cash + quote.plan.split.stockValue,
    premium: quote.premium,
    madeWeek: state.clock.week,
    respondWeek: state.clock.week + 1,
    status: 'pending',
    distressed: bank.status === 'distressed',
  };
  if (quote.plan.split.stockPct > 0) offer.stockPct = quote.plan.split.stockPct;
  state.mergers.offers.push(offer);
  const kept = MERGERS.offersKept;
  if (state.mergers.offers.length > kept) {
    // Drop the oldest answered offers first; pending ones always stay.
    const answered = state.mergers.offers.filter((o) => o.status !== 'pending');
    const drop = new Set(answered.slice(0, state.mergers.offers.length - kept));
    state.mergers.offers = state.mergers.offers.filter((o) => !drop.has(o));
  }
  pushEvent(
    state,
    'MERGER_OFFER',
    { rivalId, bank: bank.name, total: offer.total, premiumPct: offer.premium * 100 },
    3,
  );
  return ok({ offerId: offer.id });
}
