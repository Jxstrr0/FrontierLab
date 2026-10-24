// Loan Desk commands: approve an application at a rate, or decline it (SIMULATION §11).
import { PRODUCTS } from '../../data/products';
import { offerLoan } from '../branch/loanDesk';
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
  if (state.treasury.freeze) return fail('Lending is frozen until liquidity recovers.');
  if (state.company.tier === 'critical')
    return fail('No new lending at the Critical capital tier.');
  const spec = PRODUCTS.sbl!;
  const r = clamp(roundToStep(rate, spec.step), spec.min, spec.max);
  return ok({ accepted: offerLoan(state, app, r) });
}

export function declineApplication(state: GameState, appId: string): CommandResult {
  if (!state.loanDesk.applications[appId]) return fail('That application has expired.');
  delete state.loanDesk.applications[appId];
  return ok();
}
