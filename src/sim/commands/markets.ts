// Trading shares (SIMULATION §19.7): buy or sell listed companies and listed
// rival banks from the company or your personal account, with a 0.1%
// commission. Company trades are investing cash flows and the commission an
// expense; personal trades move personal cash. Once your bank is listed you
// can trade its shares personally: they move between you and the public
// float on the cap table. Equity raises live in marketsEquity.ts.
import { COMMISSION, TRADING } from '../../config/balance';
import { PUBLIC_HOLDER } from '../equityIpo';
import { postCash, spend } from '../ledger';
import { isListedSecurity, SELF_ID, securityPrice, securityShares } from '../securities';
import { FOUNDER_ID, sharesHeld, transferShares } from '../shares';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

export * from './marketsEquity';

export type TradeAccount = 'company' | 'personal';

/** Cash the account can spend: corporate cash or personal cash. */
export function accountCash(state: GameState, account: TradeAccount): number {
  return account === 'company' ? state.company.cash : state.personal.cash;
}

/** Shares an account holds of a security ('self' reads your founder stake). */
export function positionOf(state: GameState, account: TradeAccount, id: string): number {
  if (id === SELF_ID) return account === 'personal' ? sharesHeld(state, FOUNDER_ID) : 0;
  return state.market.holdings[account][id]?.shares ?? 0;
}

/** Most shares an account may buy now: the stake cap, the float (for 'self') and cash. */
export function maxBuy(state: GameState, account: TradeAccount, id: string): number {
  const price = securityPrice(state, id);
  if (price <= 0) return 0;
  const byCash = Math.floor(accountCash(state, account) / (price * (1 + COMMISSION)));
  if (id === SELF_ID) return Math.max(0, Math.min(byCash, sharesHeld(state, PUBLIC_HOLDER.id)));
  const held = positionOf(state, 'company', id) + positionOf(state, 'personal', id);
  const room = Math.floor(securityShares(state, id) * TRADING.maxStake) - held;
  return Math.max(0, Math.min(byCash, room));
}

/** Cost of a trade before it happens: value, commission and the cash change. */
export function tradeQuote(
  state: GameState,
  id: string,
  shares: number,
): { value: number; commission: number; cashChange: number } {
  const value = Math.abs(shares) * securityPrice(state, id);
  const commission = value * COMMISSION;
  return { value, commission, cashChange: shares > 0 ? -(value + commission) : value - commission };
}

/** Moves cash for a trade: company in investing (commission as an expense), personal directly. */
function settle(state: GameState, account: TradeAccount, value: number, commission: number): void {
  if (account === 'company') {
    postCash(state, value, 'investing');
    spend(state, 'commissions', commission);
  } else {
    state.personal.cash += value - commission;
  }
}

/** Buys (shares > 0) or sells (shares < 0) a security from the company or personal account. */
export function trade(
  state: GameState,
  account: TradeAccount,
  securityId: string,
  shares: number,
): CommandResult {
  if (!Number.isInteger(shares) || shares === 0) return fail('Choose a whole number of shares.');
  if (account !== 'company' && account !== 'personal') return fail('Choose an account.');
  if (securityId === SELF_ID && account === 'company')
    return fail('The company cannot trade its own shares.');
  if (!isListedSecurity(state, securityId))
    return fail(
      securityId === SELF_ID ? 'Your bank is not listed yet.' : 'That company is not listed.',
    );
  const price = securityPrice(state, securityId);
  if (price <= 0) return fail('That stock is not trading.');
  const { value, commission } = tradeQuote(state, securityId, shares);

  if (shares > 0) {
    if (value + commission > accountCash(state, account))
      return fail(`You need ${money(value + commission)} to buy these shares.`);
    if (shares > maxBuy(state, account, securityId))
      return fail(
        securityId === SELF_ID
          ? 'Not that many shares are on the market.'
          : `You and your company can own at most ${TRADING.maxStake * 100}% of a company.`,
      );
  } else if (-shares > positionOf(state, account, securityId)) {
    return fail('You do not hold that many shares.');
  }

  if (securityId === SELF_ID) {
    const moved =
      shares > 0
        ? transferShares(
            state,
            PUBLIC_HOLDER.id,
            { id: FOUNDER_ID, name: state.meta.founderName, kind: 'founder' },
            shares,
          )
        : transferShares(state, FOUNDER_ID, PUBLIC_HOLDER, -shares);
    if (!moved) return fail('Those shares are not available.');
  } else {
    const book = state.market.holdings[account];
    const h = book[securityId] ?? { shares: 0, avgCost: 0 };
    if (shares > 0) {
      h.avgCost = (h.shares * h.avgCost + shares * price) / (h.shares + shares);
      h.shares += shares;
      book[securityId] = h;
    } else {
      h.shares += shares;
      if (h.shares <= 0) delete book[securityId];
    }
  }
  settle(state, account, shares > 0 ? -value : value, commission);
  return ok();
}
