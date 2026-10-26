// Corporate borrowing from rival banks (SIMULATION §19.9, SCREENS §7): accept a
// business loan offer, repay a loan early, and draw on or repay a line of
// credit. Borrowed money arrives in corporate cash (financing), never deposits.
import { CORPORATE_LENDING } from '../../config/balance';
import { creditLimit, lendersNearYou, lineRate, loanRoom } from '../corporateDebt';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash } from '../ledger';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const validAmount = (x: number) => Number.isFinite(x) && x > 0;

/** Takes a business loan offer: cash now, weekly amortized payments after. */
export function acceptCorporateLoan(
  state: GameState,
  offerId: string,
): CommandResult<{ loanId: string }> {
  const d = state.corporateDebt;
  const offer = d.offers.find((o) => o.id === offerId);
  if (!offer || offer.expiresWeek < state.clock.week) return fail('That offer has expired.');
  const lender = state.rivals[offer.lenderId];
  if (!lender || lender.status !== 'active') return fail('That lab is no longer lending.');
  if (offer.amount > loanRoom(state) + CORPORATE_LENDING.dust) {
    return fail(
      `Corporate debt is capped at ${CORPORATE_LENDING.maxEquityShare * 100}% of equity. You can borrow up to ${money(loanRoom(state))} more.`,
    );
  }
  const loanId = newId(state, 'cl');
  d.loans[loanId] = {
    id: loanId,
    lenderId: offer.lenderId,
    principal: offer.amount,
    balance: offer.amount,
    rate: offer.rate,
    termWeeks: offer.termWeeks,
    weeksLeft: offer.termWeeks,
    payment: offer.payment,
    startWeek: state.clock.week,
  };
  d.offers = d.offers.filter((o) => o.id !== offerId);
  postCash(state, offer.amount, 'financing');
  pushEvent(
    state,
    'CORPORATE_LOAN',
    { lenderId: lender.id, lender: lender.name, amount: offer.amount, rate: offer.rate },
    2,
  );
  return ok({ loanId });
}

/** Repays a business loan in full, early. */
export function repayCorporateLoan(state: GameState, loanId: string): CommandResult {
  const loan = state.corporateDebt.loans[loanId];
  if (!loan) return fail('That loan is already repaid.');
  if (loan.balance > state.company.cash)
    return fail(`You need ${money(loan.balance)} in corporate cash to repay this loan.`);
  postCash(state, -loan.balance, 'financing');
  delete state.corporateDebt.loans[loanId];
  return ok();
}

/** Draws on a rival's line of credit, up to the live limit (20% of equity). */
export function drawCredit(state: GameState, lenderId: string, amount: number): CommandResult {
  if (!validAmount(amount)) return fail('Enter an amount above zero.');
  const lender = state.rivals[lenderId];
  if (!lender || lender.status !== 'active') return fail('That lab is no longer lending.');
  if (!lendersNearYou(state).some((r) => r.id === lenderId))
    return fail(`${lender.name} lends to banks with a branch in one of its head office cities.`);
  const line = state.corporateDebt.lines[lenderId];
  const drawn = line?.drawn ?? 0;
  const available = Math.max(0, creditLimit(state) - drawn);
  if (amount > available + CORPORATE_LENDING.dust)
    return fail(`You can draw up to ${money(available)} on this line.`);
  if (line) line.drawn += amount;
  else state.corporateDebt.lines[lenderId] = { lenderId, drawn: amount, rate: lineRate(state) };
  postCash(state, amount, 'financing');
  return ok();
}

/** Pays down a line of credit from corporate cash. */
export function repayCredit(state: GameState, lenderId: string, amount: number): CommandResult {
  if (!validAmount(amount)) return fail('Enter an amount above zero.');
  const line = state.corporateDebt.lines[lenderId];
  if (!line || line.drawn <= 0) return fail('Nothing is drawn on that line.');
  const pay = Math.min(amount, line.drawn);
  if (pay > state.company.cash)
    return fail(`You only have ${money(state.company.cash)} in corporate cash.`);
  line.drawn -= pay;
  postCash(state, -pay, 'financing');
  if (line.drawn <= CORPORATE_LENDING.dust) {
    if (line.drawn > 0) postCash(state, -line.drawn, 'financing');
    delete state.corporateDebt.lines[lenderId];
  }
  return ok();
}
