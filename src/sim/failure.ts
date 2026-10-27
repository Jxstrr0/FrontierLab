// Game-over and regulator checks (DESIGN §5.18), run after the weekly safety
// evaluation: insolvency after weeks of negative cash with no credit left that
// could cover the hole (game over), and the AI regulator's path (§15, C7a):
// after MANDATED_PAUSE.offerWeeks under the revoke line a mandated pause is
// offered (an incident); declining it, or still sitting under the line when
// the pause ends, revokes the licence. A revoked licence is never game over.
import { FAILURE, MANDATED_PAUSE } from '../config/balance';
import { creditAvailable } from './corporateDebt';
import { pushEvent } from './events';
import { raiseIncident } from './incidents';
import { checkPause } from './mandatedPause';
import type { GameState } from './state';

export function checkFailure(state: GameState): void {
  const c = state.company;
  c.negativeCashWeeks = c.cash < 0 ? c.negativeCashWeeks + 1 : 0;
  // Weeks under the line only count while the lab is free to act on them.
  const counting = !c.pause && c.safetyRatio < MANDATED_PAUSE.revokeLine;
  c.lowCapitalWeeks = counting ? c.lowCapitalWeeks + 1 : 0;

  checkPause(state);
  if (c.lowCapitalWeeks >= MANDATED_PAUSE.offerWeeks && !state.incidents.recap) {
    if (raiseIncident(state, 'RECAP_OFFER', 'company', 'company'))
      state.incidents.recap = { offeredWeek: state.clock.week };
  }

  if (c.negativeCashWeeks < FAILURE.insolvencyWeeks) return;
  // An undrawn line that could bring cash back above zero keeps the lab alive.
  if (creditAvailable(state) >= -c.cash) return;
  state.flags.gameOver = 'insolvency';
  pushEvent(state, 'GAME_OVER', { reason: 'insolvency' }, 3);
}
