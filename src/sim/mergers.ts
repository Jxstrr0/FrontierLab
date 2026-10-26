// Rival bank M&A (SIMULATION §19.8), tick step 8: integrations count down
// (rebranding costs spread over the conversion), then pending offers get their
// answer — the regulator first (pro-forma capital and city deposit share), then
// the target's board on the acceptance curve, rolled on the `mergers` stream.
// An accepted offer closes at once if your cash and capital tier still allow it.
import { MERGERS, REBRAND_COST } from '../config/balance';
import { closeAcquisition } from './acquisition';
import { planDeal, regulatorBlock } from './acquisitionPlan';
import { cityLabel } from './mergerRules';
import { pushEvent } from './events';
import { spend } from './ledger';
import { listPrice } from './nominal';
import { acceptChance, boardPrice, offerPremium, requiredPremium } from './mergerPricing';
import { stream } from './rng';
import { shareDealBlocker } from './shareDeals';
import type { GameState, Integration, MergerOffer } from './state';

/** Tick step 8 (corporate items): integrations, then M&A answers. */
export function runMergers(state: GameState): void {
  runIntegrations(state);
  for (const offer of state.mergers.offers) {
    if (offer.status === 'pending' && offer.respondWeek <= state.clock.week) answer(state, offer);
  }
}

/** One week of each conversion: the rebrand bill, the countdown, and the reveal at zero. */
function runIntegrations(state: GameState): void {
  const weekly = listPrice(state, REBRAND_COST) / MERGERS.conversionWeeks;
  const done: Integration[] = [];
  for (const integ of state.mergers.integrations) {
    integ.weeksLeft = Math.max(0, integ.weeksLeft - 1);
    let n = 0;
    for (const id of integ.branchIds) {
      const branch = state.branches[id];
      if (!branch?.converting) continue;
      spend(state, 'integration', weekly);
      branch.converting.weeksLeft = integ.weeksLeft;
      if (integ.weeksLeft === 0) delete branch.converting;
      n += 1;
    }
    if (integ.weeksLeft > 0) continue;
    done.push(integ);
    pushEvent(
      state,
      'CONVERSION_DONE',
      { rivalId: integ.rivalId, bank: integ.name, buyer: state.meta.bankName, branches: n },
      5,
    );
  }
  if (done.length > 0)
    state.mergers.integrations = state.mergers.integrations.filter((i) => !done.includes(i));
}

function settle(offer: MergerOffer, status: MergerOffer['status'], reason?: string): void {
  offer.status = status;
  if (reason) offer.reason = reason;
}

/** The answer to one pending offer. */
function answer(state: GameState, offer: MergerOffer): void {
  const bank = state.rivals[offer.rivalId];
  if (!bank || (bank.status !== 'active' && bank.status !== 'distressed')) {
    settle(offer, 'lapsed', `${bank?.name ?? 'The lab'} is no longer for sale.`);
    pushLapsed(state, offer, bank?.name ?? 'The lab', offer.reason!);
    return;
  }
  const plan = planDeal(state, bank, offer.pricePerShare, offer.stockPct);
  const blocked = regulatorBlock(plan, cityLabel);
  if (blocked) {
    settle(offer, 'blocked', blocked);
    pushEvent(state, 'MERGER_BLOCKED', { rivalId: bank.id, bank: bank.name, reason: blocked }, 6);
    return;
  }
  // The premium is measured against today's reference price (the market may have moved);
  // a share-paid part counts at a discount (§19.8).
  offer.premium = offerPremium(bank, boardPrice(offer.pricePerShare, plan.split.stockPct));
  const p = acceptChance(offer.premium, requiredPremium(bank));
  if (!stream(state, 'mergers').chance(p)) {
    const reason = `${bank.name}'s board turned down ${Math.round(offer.premium * 100)}% over the reference price.`;
    settle(offer, 'rejected', reason);
    pushEvent(state, 'MERGER_REJECTED', { rivalId: bank.id, bank: bank.name, reason }, 5);
    return;
  }
  // Closing re-checks what the offer needed: cash, an allowed capital tier and the share cap.
  const tier = state.company.tier;
  const lapse =
    tier === 'restricted' || tier === 'critical'
      ? `The regulator stopped the closing at the ${tier} capital tier.`
      : state.company.cash < plan.cash
        ? 'You no longer had the cash to close.'
        : shareDealBlocker(state, plan.split, offer.stockPct ?? 0);
  if (lapse) {
    settle(offer, 'lapsed', lapse);
    pushLapsed(state, offer, bank.name, lapse);
    return;
  }
  offer.total = plan.cash + plan.split.stockValue;
  settle(offer, 'accepted');
  closeAcquisition(state, bank, plan, stream(state, 'mergers'));
}

function pushLapsed(state: GameState, offer: MergerOffer, name: string, reason: string): void {
  pushEvent(state, 'MERGER_LAPSED', { rivalId: offer.rivalId, bank: name, reason }, 4);
}
