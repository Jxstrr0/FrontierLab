// Venture commands (SIMULATION §20.4–20.5): buy one of a round's two offer
// lots as the company or personally, and offer a startup venture debt. Company
// money moves as investing cash and lands at its mark, so equity is unchanged.
// A startup is only open to you where you can see it: in the Investment floor
// pipeline, or at its convention while it is open and you are in that city.
import { VENTURE_DEBT } from '../../config/balance';
import { pushEvent } from '../events';
import { postCash } from '../ledger';
import type { Account } from '../portfolio';
import type { GameState, Startup } from '../state';
import { homeCountry } from '../homeCountry';
import { accessBlock } from '../ventureAccess';
import { lendVentureDebt } from '../ventureDebt';
import { isPrivate } from '../ventureGen';
import { debtAccepted, maxVentureDebt } from '../ventureModel';
import { takeLot } from '../ventureRounds';
import { accountCash } from './markets';
import { fail, money, ok, type CommandResult } from './result';

/** Why the company's safety tier forbids new investments, if it does. */
export function ventureTierBlock(state: GameState): string | undefined {
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical')
    return `The regulator won't allow new investments at the ${tier} safety tier.`;
  return undefined;
}

function checkAccount(state: GameState, account: Account, amount: number): string | undefined {
  if (account !== 'company' && account !== 'personal') return 'Choose an account.';
  if (account === 'company') {
    const block = ventureTierBlock(state);
    if (block) return block;
  }
  if (amount > accountCash(state, account))
    return `You need ${money(state, amount)} ${account === 'company' ? 'in corporate cash' : 'of your own'}.`;
  return undefined;
}

function startupFor(state: GameState, id: string): Startup | string {
  const s = state.ventures.startups[id];
  if (!s) return 'That startup is gone.';
  if (!isPrivate(s)) return `${s.name} is no longer private.`;
  return s;
}

/** §20.4: buys offer lot `lotIndex` (0 or 1) of the startup's open round. */
export function buyStartupLot(
  state: GameState,
  startupId: string,
  lotIndex: number,
  account: Account,
): CommandResult {
  const s = startupFor(state, startupId);
  if (typeof s === 'string') return fail(s);
  const blocked = accessBlock(state, s);
  if (blocked) return fail(blocked);
  const round = s.round;
  if (!round || state.clock.week >= round.closesWeek)
    return fail(`${s.name} isn't raising right now.`);
  const lot = round.lots[lotIndex];
  if (!lot) return fail('Choose an offer.');
  if (lot.taken) return fail('That offer has been taken.');
  const problem = checkAccount(state, account, lot.price);
  if (problem) return fail(problem);

  if (account === 'company') postCash(state, -lot.price, 'investing');
  else state.personal.cash -= lot.price;
  takeLot(state, s, lot, account);
  pushEvent(
    state,
    'VENTURE_INVESTED',
    { startupId: s.id, name: s.name, account, amount: lot.price, pct: lot.pct * 100 },
    2,
    s.id,
  );
  return ok();
}

/**
 * §20.5: offers a loan of `amount` at annual `rate`. The startup answers at
 * once: it accepts when the rate ≤ home policy rate + 8%. One loan per startup.
 */
export function offerVentureDebt(
  state: GameState,
  startupId: string,
  amount: number,
  rate: number,
  account: Account,
): CommandResult<{ accepted: boolean }> {
  const s = startupFor(state, startupId);
  if (typeof s === 'string') return fail(s);
  const blocked = accessBlock(state, s);
  if (blocked) return fail(blocked);
  if (s.ventureDebt) return fail(`${s.name} already has compute credits from you.`);
  if (!Number.isFinite(amount) || amount <= 0) return fail('Choose an amount.');
  if (amount > maxVentureDebt(s) + 1e-6)
    return fail(
      `${s.name} borrows at most ${money(state, maxVentureDebt(s))} (${VENTURE_DEBT.maxShare * 100}% of its valuation).`,
    );
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) return fail('Choose a rate.');
  const problem = checkAccount(state, account, amount);
  if (problem) return fail(problem);

  const accepted = debtAccepted(rate, homeCountry(state).policyRate);
  pushEvent(
    state,
    'VENTURE_DEBT_OFFERED',
    { startupId: s.id, name: s.name, amount, rate, accepted },
    accepted ? 2 : 1,
    s.id,
  );
  if (accepted) lendVentureDebt(state, s, amount, rate, account);
  return ok({ accepted });
}
