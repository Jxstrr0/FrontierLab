// Loan Desk commands: approve an application at a rate, or decline it (SIMULATION §11).
import { PRODUCTS } from '../../data/products';
import { lendingBlocked, offerLoan, recordDesk } from '../branch/loanDesk';
import { clamp, roundToStep } from '../math';
import type { GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

export function decideApplication(
  state: GameState,
  appId: string,
  rate: number,
): CommandResult<{ accepted: boolean }> {
  const app = state.loanDesk.applications[appId];
  if (!app) return fail('That application has expired.');
  const blocked = lendingBlocked(state, app.amount);
  if (blocked) return fail(blocked);
  const spec = PRODUCTS.sbl!;
  const r = clamp(roundToStep(rate, spec.step), spec.min, spec.max);
  return ok({ accepted: offerLoan(state, app, r) });
}

export function declineApplication(state: GameState, appId: string): CommandResult {
  const app = state.loanDesk.applications[appId];
  if (!app) return fail('That application has expired.');
  delete state.loanDesk.applications[appId];
  recordDesk(state, app.branchId, 'declined');
  return ok();
}
