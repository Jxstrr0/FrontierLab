// Executive equity grants (SIMULATION §17.2, SCREENS §10.1): grant-date value,
// straight-line grant expense, yearly vesting and option exercise. Grants are
// equity-settled: each week's expense is a non-cash P&L line matched by
// paid-in capital, so the balance identity holds. RSUs become shares as they
// vest; vested options are exercised whenever they are in the money (the
// company receives strike × shares in cash, financing). Leaving forfeits the
// unvested part.
import { EXEC_PAY, EXECUTIVES, WEEKS_PER_YEAR } from '../config/balance';
import { postCash, postPnl } from './ledger';
import { issueShares } from './shares';
import type { EquityGrant, Executive, GameState } from './state';

/** Weeks from grant to the last tranche. */
export const VEST_WEEKS = EXECUTIVES.vestYears * WEEKS_PER_YEAR;

/**
 * Grant-date value per share: the share price for an RSU; for an option
 * max(price − strike, price × optionMinValue) — a simple stand-in for an option
 * model (assumption, decision log).
 */
export function grantFairValue(type: EquityGrant['type'], price: number, strike: number): number {
  if (type === 'rsu') return price;
  return Math.max(price - strike, price * EXEC_PAY.optionMinValue);
}

/** Shares vested after `years` full years: equal yearly parts, the rounding in the last. */
export function vestedAfter(shares: number, years: number): number {
  const y = Math.max(0, Math.min(EXECUTIVES.vestYears, years));
  return Math.floor((shares * y) / EXECUTIVES.vestYears);
}

/** The cap-table holder for an executive's shares. */
const holderOf = (exec: Executive) => ({
  id: exec.id,
  name: exec.name,
  kind: 'executive' as const,
});

/** Exercises vested, unexercised options while the price is above the strike. */
export function exerciseInTheMoney(state: GameState, exec: Executive, g: EquityGrant): void {
  if (g.type !== 'option') return;
  const n = g.vested - g.exercised;
  if (n <= 0 || state.stock.price <= g.strike) return;
  const cash = n * g.strike;
  postCash(state, cash, 'financing');
  state.company.paidInCapital += cash;
  issueShares(state, holderOf(exec), n);
  g.exercised += n;
}

/** One week of one grant: expense, then a tranche on an anniversary, then exercise. */
function grantWeek(state: GameState, exec: Executive, g: EquityGrant): void {
  const age = state.clock.week - g.grantWeek;
  const total = g.shares * g.fairValue;
  if (age > 0 && g.expensed < total) {
    // Straight line over the vesting period; the last week takes any remainder.
    const expense =
      age >= VEST_WEEKS ? total - g.expensed : Math.min(total / VEST_WEEKS, total - g.expensed);
    postPnl(state, 'grantExpense', expense);
    state.company.paidInCapital += expense;
    g.expensed += expense;
  }
  if (age > 0 && age % WEEKS_PER_YEAR === 0) {
    const target = vestedAfter(g.shares, age / WEEKS_PER_YEAR);
    const tranche = target - g.vested;
    if (tranche > 0) {
      g.vested = target;
      if (g.type === 'rsu') {
        issueShares(state, holderOf(exec), tranche);
        g.exercised = g.vested;
      }
    }
  }
  exerciseInTheMoney(state, exec, g);
}

/** Tick step 8: every seated executive's grants. */
export function runGrants(state: GameState): void {
  for (const exec of Object.values(state.executives.seats)) {
    if (!exec) continue;
    for (const g of exec.grants) grantWeek(state, exec, g);
  }
}

/**
 * An executive leaves: vested options in the money are exercised at once, the
 * rest lapse, and unvested shares are forfeited. Expense already recognised stays.
 */
export function settleOnExit(state: GameState, exec: Executive): void {
  for (const g of exec.grants) exerciseInTheMoney(state, exec, g);
  exec.grants = [];
}
