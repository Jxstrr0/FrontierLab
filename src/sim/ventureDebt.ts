// Venture debt (SIMULATION §20.5, §14.2): a loan to a startup from your
// company or from you personally, amortized weekly over 156 weeks. Company
// interest is interest income (`ventureDebtInterest`) and principal comes back
// as investing cash; personal payments go to personal cash. On failure 80% is
// lost (company: a non-cash loan loss) and 20% recovered; on a sale or IPO
// the balance is repaid in full.
import { VENTURE_DEBT, WEEKS_PER_YEAR } from '../config/balance';
import { earn, postCash, postPnl } from './ledger';
import type { Account } from './portfolio';
import type { GameState, Startup } from './state';
import { amortizedPayment } from './ventureModel';

/** Lends `amount` at `rate`: the money leaves your account and lands in the startup's cash. */
export function lendVentureDebt(
  state: GameState,
  s: Startup,
  amount: number,
  rate: number,
  lender: Account,
): void {
  if (lender === 'company') postCash(state, -amount, 'investing');
  else state.personal.cash -= amount;
  s.cash += amount;
  s.ventureDebt = {
    principal: amount,
    balance: amount,
    rate,
    weeksLeft: VENTURE_DEBT.termWeeks,
    payment: amortizedPayment(amount, rate, VENTURE_DEBT.termWeeks),
    lender,
    startWeek: state.clock.week,
  };
}

/** Pays interest and principal to the lender's account. */
function receive(state: GameState, lender: Account, interest: number, principal: number): void {
  if (lender === 'company') {
    if (interest > 0) earn(state, 'ventureDebtInterest', interest);
    if (principal > 0) postCash(state, principal, 'investing');
  } else {
    state.personal.cash += interest + principal;
  }
}

/** One week's payment on a loan: interest first, then principal; the last payment clears it. */
export function serviceLoan(state: GameState, s: Startup): void {
  const d = s.ventureDebt;
  if (!d) return;
  const interest = (d.balance * d.rate) / WEEKS_PER_YEAR;
  const last = d.weeksLeft <= 1;
  const principal = last ? d.balance : Math.min(d.balance, Math.max(0, d.payment - interest));
  receive(state, d.lender, interest, principal);
  s.cash -= interest + principal;
  d.balance -= principal;
  d.weeksLeft -= 1;
  if (last || d.balance <= 0) delete s.ventureDebt;
}

/** Weekly: every outstanding venture loan pays (tick step 8). */
export function serviceVentureDebt(state: GameState): void {
  for (const s of Object.values(state.ventures.startups)) if (s.ventureDebt) serviceLoan(state, s);
}

/** Failure: lose LGD × balance (company: non-cash loan loss) and recover the rest. */
export function writeOffDebt(state: GameState, s: Startup): void {
  const d = s.ventureDebt;
  if (!d) return;
  const loss = d.balance * VENTURE_DEBT.lgd;
  const recovered = d.balance - loss;
  if (d.lender === 'company') {
    postPnl(state, 'loanLosses', loss);
    postCash(state, recovered, 'investing');
  } else {
    state.personal.cash += recovered;
  }
  delete s.ventureDebt;
}

/** Sale or IPO: the balance is repaid in full. */
export function repayDebtInFull(state: GameState, s: Startup): void {
  const d = s.ventureDebt;
  if (!d) return;
  receive(state, d.lender, 0, d.balance);
  s.cash -= d.balance;
  delete s.ventureDebt;
}
