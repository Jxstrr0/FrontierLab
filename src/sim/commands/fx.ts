// Currency trades (SIMULATION §19.10): buy or sell an amount of a foreign
// currency from the company or your personal account, paying FX.spread. Company
// trades are investing cash flows and the spread an expense (`commissions`);
// personal trades move personal cash.
import { FX } from '../../config/balance';
import { CURRENCIES } from '../../data/currencies';
import type { CountryId } from '../../data/types';
import { fxRate, homeCurrency } from '../fx';
import { postCash, spend } from '../ledger';
import type { GameState } from '../state';
import { accountCash, type TradeAccount } from './markets';
import { fail, money, ok, type CommandResult } from './result';

/** Home-money value of an account's position in a currency. */
export function fxPositionValue(state: GameState, account: TradeAccount, c: CountryId): number {
  return (state.fx.positions[account][c]?.units ?? 0) * fxRate(state, c);
}

/**
 * Buys (amount > 0) or sells (amount < 0) `|amount|` of home money's worth of a
 * currency. Selling more than the position is held closes it.
 */
export function tradeFx(
  state: GameState,
  account: TradeAccount,
  country: CountryId,
  amount: number,
): CommandResult {
  if (account !== 'company' && account !== 'personal') return fail('Choose an account.');
  if (!CURRENCIES[country]) return fail('Unknown currency.');
  if (country === homeCurrency(state)) return fail('That is your home currency.');
  if (!Number.isFinite(amount) || amount === 0) return fail('Choose an amount.');
  const rate = fxRate(state, country);
  const book = state.fx.positions[account];
  const pos = book[country] ?? { units: 0, cost: 0 };
  if (amount > 0) {
    const spread = amount * FX.spread;
    if (amount + spread > accountCash(state, account))
      return fail(`You need ${money(state, amount + spread)} for this trade.`);
    pos.units += amount / rate;
    pos.cost += amount;
    book[country] = pos;
    settle(state, account, -amount, spread);
    return ok();
  }
  const held = pos.units * rate;
  if (held <= 0) return fail(`You hold no ${CURRENCIES[country].name}.`);
  const value = Math.min(-amount, held);
  const spread = value * FX.spread;
  const share = value / held;
  pos.units -= pos.units * share;
  pos.cost -= pos.cost * share;
  if (pos.units * rate < 1) delete book[country];
  settle(state, account, value, spread);
  return ok();
}

function settle(state: GameState, account: TradeAccount, value: number, spread: number): void {
  if (account === 'company') {
    postCash(state, value, 'investing');
    spend(state, 'commissions', spread);
  } else {
    state.personal.cash += value - spread;
  }
}
