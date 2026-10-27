// Whether a save still carries bank-era funding (deposits, wholesale lots or
// central bank borrowing). The liquidity, funding-market and standing-facility
// cards show only then (SCREENS §8, §10).
import { totalDeposits } from '../../../sim/balanceSheet';
import type { GameState } from '../../../sim/state';

/** A save from the bank era that still has deposits or wholesale funding to manage. */
export function hasLegacyFunding(s: GameState): boolean {
  const t = s.treasury;
  return totalDeposits(s) > 0 || t.lots.length > 0 || t.overnight > 0 || t.window > 0;
}
