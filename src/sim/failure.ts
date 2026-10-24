// Game-over checks (DESIGN §5.18), run after the weekly capital evaluation:
// insolvency after weeks of negative cash, and the regulator path for capital
// (§15): after RECAP.offerWeeks below the takeover line an emergency
// recapitalisation is offered (an incident); declining it, or still sitting
// below the line RECAP.graceWeeks after accepting, means a takeover.
import { FAILURE, RECAP } from '../config/balance';
import { pushEvent } from './events';
import { checkRecapGrace } from './incident/capitalEvents';
import { raiseIncident } from './incidents';
import type { GameState } from './state';

export function checkFailure(state: GameState): void {
  const c = state.company;
  c.negativeCashWeeks = c.cash < 0 ? c.negativeCashWeeks + 1 : 0;
  c.lowCapitalWeeks = c.capitalRatio < FAILURE.takeoverCr ? c.lowCapitalWeeks + 1 : 0;

  checkRecapGrace(state);
  if (state.flags.gameOver) return;
  if (c.lowCapitalWeeks >= RECAP.offerWeeks && !state.incidents.recap) {
    if (raiseIncident(state, 'RECAP_OFFER', 'company', 'company'))
      state.incidents.recap = { offeredWeek: state.clock.week };
  }

  if (c.negativeCashWeeks < FAILURE.insolvencyWeeks) return;
  state.flags.gameOver = 'insolvency';
  pushEvent(state, 'GAME_OVER', { reason: 'insolvency' }, 3);
}
