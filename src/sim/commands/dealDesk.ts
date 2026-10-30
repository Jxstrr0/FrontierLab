// Deal Desk commands (SIMULATION §11, stage C5b): bid on a new RFP, decline it,
// set or withdraw a renewal offer, set an office's discount limit, and seal or
// withdraw a bid on a public tender (§11.7).
import { DEAL } from '../../config/balance';
import { pauseBlock } from '../safety';
import { bidRfp, cleanDiscount, declineRfp, isOwnRenewal } from '../branch/dealDesk';
import type { GameState } from '../state';
import { tenderEligible } from '../tenders';
import { fail, ok, type CommandResult } from './result';

/** Bids on a new RFP at `discount` off the business's budget; won or lost at once. */
export function bidOnRfp(
  state: GameState,
  rfpId: string,
  discount: number,
): CommandResult<{ won: boolean }> {
  const rfp = state.dealDesk.rfps[rfpId];
  if (!rfp) return fail('That request has expired.');
  if (rfp.kind !== 'new') return fail('Renewals are settled at the quarter start: set an offer.');
  if (!Number.isFinite(discount)) return fail('Enter a discount.');
  const paused = pauseBlock(state);
  if (paused) return fail(paused);
  return ok({ won: bidRfp(state, rfp, cleanDiscount(discount)) });
}

/** Declines a new RFP. */
export function declineApplication(state: GameState, rfpId: string): CommandResult {
  const rfp = state.dealDesk.rfps[rfpId];
  if (!rfp) return fail('That request has expired.');
  if (rfp.kind !== 'new') return fail('A renewal cannot be declined; withdraw the offer instead.');
  declineRfp(state, rfp);
  return ok();
}

/**
 * Sets the offer on a renewal (settled at the quarter start). `undefined`
 * withdraws a bid for a rival's contract; your own renewals always carry one.
 */
export function setRenewalOffer(
  state: GameState,
  rfpId: string,
  discount: number | undefined,
): CommandResult {
  const rfp = state.dealDesk.rfps[rfpId];
  const b = rfp && state.businesses[rfp.businessId];
  if (!rfp || !b || rfp.kind !== 'renewal') return fail('That renewal is no longer open.');
  if (discount === undefined) {
    if (isOwnRenewal(rfp, b)) return fail('Your own renewal needs an offer.');
    delete rfp.offer;
  } else if (!Number.isFinite(discount)) {
    return fail('Enter a discount.');
  } else rfp.offer = cleanDiscount(discount);
  return ok();
}

/** The most an office's manager may discount a bid (0 to DEAL.discountMax). */
export function setDiscountLimit(state: GameState, branchId: string, limit: number): CommandResult {
  const branch = state.branches[branchId];
  if (!branch || branch.status === 'closed') return fail('That sales office is not open.');
  if (!(limit >= 0 && limit <= DEAL.discountMax)) return fail('That discount is out of range.');
  branch.discountLimit = cleanDiscount(limit);
  return ok();
}

/**
 * Seals a bid on an open public tender at `discount` off its budget (§11.7);
 * the award is made when bids close. Bidding again replaces the bid.
 */
export function bidOnTender(state: GameState, tenderId: string, discount: number): CommandResult {
  const t = state.dealDesk.tenders[tenderId];
  if (!t || t.status !== 'open') return fail('That tender has closed.');
  if (!tenderEligible(state))
    return fail('Public bodies only take bids from labs the regulator rates Adequate or better.');
  if (!Number.isFinite(discount)) return fail('Enter a discount.');
  const paused = pauseBlock(state);
  if (paused) return fail(paused);
  t.bid = cleanDiscount(discount);
  return ok();
}

/** Withdraws your sealed bid on an open tender. */
export function withdrawTenderBid(state: GameState, tenderId: string): CommandResult {
  const t = state.dealDesk.tenders[tenderId];
  if (!t || t.status !== 'open') return fail('That tender has closed.');
  if (t.bid === undefined) return fail('You have no bid on that tender.');
  delete t.bid;
  return ok();
}
