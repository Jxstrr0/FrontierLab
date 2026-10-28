// The board's capital review (post-C8, SIMULATION §19.6b, the CAPITAL_REVIEW
// case): at each year start, when the lab holds more cash than it needs, the
// board asks where part of the surplus goes: a frontier project, a buyback, a
// special dividend, or the bank. It always lands on your desk (never the COO's),
// and the deadline banks it. A listed lab's sentiment moves with the choice.
import { BOARD_CAPITAL, BUYBACK } from '../../config/balance';
import { companyArr } from '../arr';
import { bookBuyback, buybackBlocker, buybackQuote } from '../buybacks';
import { clampSentiment } from '../equityModel';
import { pushEvent } from '../events';
import { raiseIncident } from '../incidents';
import { postCash } from '../ledger';
import { listPrice } from '../nominal';
import { beginProject, nextStartableProject } from '../projects';
import { FOUNDER_ID, sharesHeld } from '../shares';
import type { GameState, Incident } from '../state';
import { num, type IncidentRule } from './helpers';

/** §19.6b: cash − reserveArrShare × ARR − the project's remaining cost − a declared dividend. */
export function capitalSurplus(state: GameState): number {
  const active = state.projects.active;
  const committed =
    (active ? Math.max(0, active.cost - active.spent) : 0) +
    (state.governance.pendingDividend?.total ?? 0);
  return state.company.cash - BOARD_CAPITAL.reserveArrShare * companyArr(state) - committed;
}

/** Year start (tick step 14): raises the review when the surplus clears minSurplus. */
export function boardCapitalReview(state: GameState): void {
  if (state.flags.gameOver) return;
  const surplus = capitalSurplus(state);
  if (surplus < listPrice(state, BOARD_CAPITAL.minSurplus)) return;
  raiseIncident(state, 'CAPITAL_REVIEW', 'company', 'company');
}

/** The buyback the review's amount pays for (capped like any programme). */
function reviewBuyback(state: GameState, inc: Incident) {
  const perShare = state.stock.price * (1 + BUYBACK.premium) * (1 + BUYBACK.fee);
  const out = Math.max(1, state.company.sharesOutstanding);
  return buybackQuote(state, perShare > 0 ? num(inc.data, 'amount') / perShare / out : 0);
}

/** A one-off dividend paid at once: cash and retained earnings fall; the founder's share goes home. */
function paySpecialDividend(state: GameState, total: number): number {
  postCash(state, -total, 'financing');
  state.company.retainedEarnings -= total;
  const out = Math.max(1, state.company.sharesOutstanding);
  const personal = (total * sharesHeld(state, FOUNDER_ID)) / out;
  state.personal.cash += personal;
  pushEvent(state, 'SPECIAL_DIVIDEND', { bank: state.meta.bankName, total, personal }, 2);
  return personal;
}

/** A listed lab's sentiment moves by the board's verdict on the choice. */
function moveSentiment(state: GameState, optionId: keyof typeof BOARD_CAPITAL.sentiment): void {
  if (state.stock.status !== 'public') return;
  state.stock.sentiment = clampSentiment(
    state.stock.sentiment * (1 + BOARD_CAPITAL.sentiment[optionId]),
  );
}

export const CAPITAL_REVIEW: IncidentRule = {
  prepare(state, _scope, data) {
    const surplus = Math.max(0, capitalSurplus(state));
    data.surplus = Math.round(surplus);
    data.amount = Math.round(surplus * BOARD_CAPITAL.deployShare);
    data.project = nextStartableProject(state)?.name ?? 'the next frontier project';
  },
  costs: () => ({ project: 0, buyback: 0, dividend: 0, bank: 0 }),
  blocked(state, inc, optionId) {
    if (optionId === 'project' && !nextStartableProject(state))
      return state.projects.active
        ? 'A project is already under way.'
        : 'No frontier project can start now.';
    if (optionId === 'buyback') return buybackBlocker(state, reviewBuyback(state, inc));
    if (optionId === 'dividend' && state.company.cash < num(inc.data, 'amount'))
      return 'Not enough cash.';
    return undefined;
  },
  apply(state, inc, optionId) {
    if (optionId === 'project') {
      const spec = nextStartableProject(state);
      if (!spec) return 'No project could start.';
      beginProject(state, spec);
      moveSentiment(state, 'project');
      return `${spec.name} is under way.`;
    }
    if (optionId === 'buyback') {
      const q = reviewBuyback(state, inc);
      if (buybackBlocker(state, q)) return 'The buyback could not go ahead.';
      bookBuyback(state, q);
      moveSentiment(state, 'buyback');
      return undefined;
    }
    if (optionId === 'dividend') {
      paySpecialDividend(state, Math.min(num(inc.data, 'amount'), Math.max(0, state.company.cash)));
      moveSentiment(state, 'dividend');
      return undefined;
    }
    moveSentiment(state, 'bank');
    return undefined;
  },
};
