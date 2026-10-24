// The insider-trading probe (SIMULATION §22, CONTENT §22 INSIDER_PROBE), raised
// at a quarter-end by insider.ts. Settling pays the fine from personal cash
// (never the bank's), knocks INSIDER.ratingHit off every branch's overall
// rating for INSIDER.ratingWeeks and makes the paper; fighting is even odds of
// being cleared or paying INSIDER.fightLoseMult × the fine with the same hit.
import { INSIDER } from '../../config/balance';
import { pushEvent } from '../events';
import type { GameState } from '../state';
import { num, ratingHit, type IncidentRule } from './helpers';
import { compactMoney } from './text';

function fined(state: GameState, fine: number, fought: boolean): void {
  state.personal.cash -= fine;
  ratingHit(state, 'company', 'overall', -INSIDER.ratingHit, INSIDER.ratingWeeks);
  pushEvent(
    state,
    'INSIDER_FINED',
    { founder: state.meta.founderName, bank: state.meta.bankName, fine, fought },
    2,
  );
}

export const INSIDER_PROBE: IncidentRule = {
  prepare(state, _scope, data) {
    if (typeof data.company !== 'string') data.company = state.meta.bankName;
    data.fine = Math.max(num(data, 'fine'), INSIDER.fineMin);
    data.doubled = num(data, 'fine') * INSIDER.fightLoseMult;
  },
  // Personal money: nothing comes out of corporate cash up front.
  costs: () => ({ settle: 0, fight: 0 }),
  apply(state, inc, optionId, rng) {
    const sym = state.settings.currency;
    if (optionId === 'fight') {
      if (rng.chance(INSIDER.fightWin)) return 'The regulator dropped the case. You are cleared.';
      const doubled = num(inc.data, 'doubled');
      fined(state, doubled, true);
      return `You lost. The penalty rose to ${compactMoney(doubled, sym)}, paid from personal cash.`;
    }
    const fine = num(inc.data, 'fine');
    fined(state, fine, false);
    return `Settled for ${compactMoney(fine, sym)} from your personal cash.`;
  },
};
