// Developer tools (SCREENS §26): testing shortcuts behind the Settings switch.
// Not part of normal play.
import { DEV_PAYMENT } from '../../config/balance';
import { postCash } from '../ledger';
import type { GameState } from '../state';
import { ok } from './result';

/**
 * Pays DEV_PAYMENT into corporate cash as new paid-in capital, so the balance
 * sheet still balances. No shares are issued: the founder's stake is unchanged.
 */
export function devPayment(state: GameState) {
  postCash(state, DEV_PAYMENT, 'financing');
  state.company.paidInCapital += DEV_PAYMENT;
  return ok();
}
