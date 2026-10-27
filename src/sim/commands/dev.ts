// Developer tools (SCREENS §26): testing shortcuts behind the Settings switch.
// Not part of normal play.
import { DEV_PAYMENT } from '../../config/balance';
import { holdAllTopStaff } from '../devStaff';
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

/**
 * Switches the "Top staff" tool on or off. On, every team's skill and morale
 * jump to DEV_STAFF now and are held there each week; off, they drift back to
 * where pay and management put them.
 */
export function setDevStaff(state: GameState, on: boolean) {
  if (on) state.flags.devStaff = true;
  else delete state.flags.devStaff;
  holdAllTopStaff(state);
  return ok();
}

/**
 * Switches the "No bankruptcy" tool on or off. On, weeks in the red never end
 * the game (cash still goes negative and the warnings still show); a game
 * already over for insolvency is not revived.
 */
export function setDevNoBankruptcy(state: GameState, on: boolean) {
  if (on) state.flags.devNoBankruptcy = true;
  else delete state.flags.devNoBankruptcy;
  return ok();
}
