// Save migration 18 → 19 (stage C8f): the bank's locked charter capital is
// folded into spendable seed money. A save with no bank-era funding left
// (no wholesale lots or central bank borrowing; deposits went in 5 → 6) moves
// its treasury reserves into corporate cash. Both are assets, so equity is
// unchanged.
import type { GameState } from '../state';
import { legacyTreasury } from './legacyTreasury';

export function migrateSeedMoney(state: GameState): void {
  const t = legacyTreasury(state);
  const funded = t.lots.length > 0 || t.overnight > 0 || t.window > 0;
  if (funded || t.reserves <= 0) return;
  state.company.cash += t.reserves;
  t.reserves = 0;
}
