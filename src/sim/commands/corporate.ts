// Corporate borrowing from investment banks (SIMULATION §19.9, SCREENS §12 Debt
// tab): accept a venture debt offer, repay a loan early, and draw on or repay a
// revolving credit line. Lenders are investment bank site ids; loans and lines
// from rival labs in older saves can still be repaid. Borrowed money arrives in
// corporate cash (financing), never deposits.
import { CORPORATE_LENDING } from '../../config/balance';
import { creditRoom, isLenderNearYou, lenderName, lineRate, loanRoom } from '../corporateDebt';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash } from '../ledger';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const validAmount = (x: number) => Number.isFinite(x) && x > 0;

/** Takes a venture debt offer: cash now, weekly amortized payments after. */
export function acceptCorporateLoan(
  state: GameState,
  offerId: string,
): CommandResult<{ loanId: string }> {
  const d = state.corporateDebt;
  const offer = d.offers.find((o) => o.id === offerId);
  if (!offer || offer.expiresWeek < state.clock.week) return fail('That offer has expired.');
  if (state.world.sites[offer.lenderId]?.kind !== 'investmentBank')
    return fail('That offer has expired.');
  if (!isLenderNearYou(state, offer.lenderId))
    return fail('That investment bank lends to labs with a sales office in its city.');
  if (offer.amount > loanRoom(state) + CORPORATE_LENDING.dust) {
    return fail(
      `Corporate debt is capped at ${CORPORATE_LENDING.maxEquityShare * 100}% of equity. You can borrow up to ${money(state, loanRoom(state))} more.`,
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
    {
      lenderId: offer.lenderId,
      lender: lenderName(state, offer.lenderId),
      amount: offer.amount,
      rate: offer.rate,
    },
    2,
  );
  return ok({ loanId });
}

/** Repays a loan in full, early (any lender, old rival loans included). */
export function repayCorporateLoan(state: GameState, loanId: string): CommandResult {
  const loan = state.corporateDebt.loans[loanId];
  if (!loan) return fail('That loan is already repaid.');
  if (loan.balance > state.company.cash)
    return fail(`You need ${money(state, loan.balance)} in corporate cash to repay this loan.`);
  postCash(state, -loan.balance, 'financing');
  delete state.corporateDebt.loans[loanId];
  return ok();
}

/** Draws on an investment bank's credit line, up to the live limit (a share of equity, §19.9). */
export function drawCredit(state: GameState, lenderId: string, amount: number): CommandResult {
  if (!validAmount(amount)) return fail('Enter an amount above zero.');
  if (state.world.sites[lenderId]?.kind !== 'investmentBank')
    return fail('Credit lines come from investment banks.');
  if (!isLenderNearYou(state, lenderId))
    return fail(`${lenderName(state, lenderId)} lends to labs with a sales office in its city.`);
  const line = state.corporateDebt.lines[lenderId];
  const available = creditRoom(state);
  if (amount > available + CORPORATE_LENDING.dust)
    return fail(`You can draw up to ${money(state, available)} on this line.`);
  if (line) line.drawn += amount;
  else state.corporateDebt.lines[lenderId] = { lenderId, drawn: amount, rate: lineRate(state) };
  postCash(state, amount, 'financing');
  return ok();
}

/** Pays down a credit line from corporate cash (any lender, old rival lines included). */
export function repayCredit(state: GameState, lenderId: string, amount: number): CommandResult {
  if (!validAmount(amount)) return fail('Enter an amount above zero.');
  const line = state.corporateDebt.lines[lenderId];
  if (!line || line.drawn <= 0) return fail('Nothing is drawn on that line.');
  const pay = Math.min(amount, line.drawn);
  if (pay > state.company.cash)
    return fail(`You only have ${money(state, state.company.cash)} in corporate cash.`);
  line.drawn -= pay;
  postCash(state, -pay, 'financing');
  if (line.drawn <= CORPORATE_LENDING.dust) {
    if (line.drawn > 0) postCash(state, -line.drawn, 'financing');
    delete state.corporateDebt.lines[lenderId];
  }
  return ok();
}
