// Treasury commands (Stage 1: transfers of corporate cash into liquid assets).
import { postCash } from '../ledger';
import type { GameState } from '../state';
import { transferIn } from '../treasury';
import { fail, money, ok, type CommandResult } from './result';

/** Moves corporate cash into treasury reserves. There is no way back (SIMULATION §13.2). */
export function transferToTreasury(state: GameState, amount: number): CommandResult {
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  if (amount > state.company.cash)
    return fail(`You only have ${money(state.company.cash)} in corporate cash.`);
  postCash(state, -amount, 'investing');
  transferIn(state, amount);
  return ok();
}
