// The founder's personal account (SIMULATION §22), tick step 11: the company
// pays the CEO salary weekly (P&L execPay, cash) into personal cash, less
// PERSONAL_TAX (0). Dividends arrive from governance.ts; trades in and out of
// personal cash belong to the markets code.
import { PERSONAL_TAX, WEEKS_PER_YEAR } from '../config/balance';
import { spend } from './ledger';
import type { GameState } from './state';

/** This week's CEO pay: the annual salary the board approved ÷ 52. */
export function weeklyCeoPay(state: GameState): number {
  return Math.max(0, state.governance.ceoSalary) / WEEKS_PER_YEAR;
}

/** Tick step 11. */
export function runPersonal(state: GameState): void {
  if (state.flags.gameOver) return;
  const pay = weeklyCeoPay(state);
  if (pay <= 0) return;
  spend(state, 'execPay', pay);
  state.personal.cash += pay * (1 - PERSONAL_TAX);
}
