// Game-over checks (DESIGN §5.18), run after the weekly capital evaluation.
import { FAILURE } from '../config/balance';
import { pushEvent } from './events';
import type { GameState } from './state';

export function checkFailure(state: GameState): void {
  const c = state.company;
  c.negativeCashWeeks = c.cash < 0 ? c.negativeCashWeeks + 1 : 0;
  c.lowCapitalWeeks = c.capitalRatio < FAILURE.takeoverCr ? c.lowCapitalWeeks + 1 : 0;

  let reason: 'insolvency' | 'takeover' | undefined;
  if (c.lowCapitalWeeks >= FAILURE.takeoverWeeks) reason = 'takeover';
  else if (c.negativeCashWeeks >= FAILURE.insolvencyWeeks) reason = 'insolvency';
  if (!reason) return;
  state.flags.gameOver = reason;
  pushEvent(state, 'GAME_OVER', { reason }, 3);
}
