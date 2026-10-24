// Read-only views for the startup panel (SCREENS §11): the advisor line,
// valuation, top shareholders, the quarterly bars, what blocks investing and
// the venture debt stepper bounds.
import { VENTURE_DEBT } from '../../config/balance';
import { dateOf, quarterOf } from '../../sim/calendar';
import type { Account } from '../../sim/portfolio';
import { startupShares } from '../../sim/portfolio';
import type { GameState, Startup } from '../../sim/state';
import { homeCountry } from '../../sim/treasury';
import { accessBlock } from '../../sim/ventureAccess';
import { isPrivate } from '../../sim/ventureGen';
import { maxVentureDebt } from '../../sim/ventureModel';
import { ventureTierBlock } from '../../sim/commands';

const BARS = 8;
const MIN_STEP = 1000;
const STEPS = 20;
/** The rate stepper runs from 1% to 5 points above the acceptance line. */
const RATE_MIN = 0.01;
const RATE_HEADROOM = 0.05;

export const raising = (s: GameState, st: Startup) =>
  !!st.round && st.round.closesWeek > s.clock.week && isPrivate(st);

export function advisorLine(s: GameState, st: Startup): string {
  switch (st.stage) {
    case 'failed':
      return 'They have shut down. The shares are worthless.';
    case 'acquired':
      return 'They were bought out; every shareholder was paid in cash.';
    case 'public':
      return 'They are listed now. Trade the shares at an investment bank.';
    default:
      break;
  }
  if (!raising(s, st)) return "They aren't raising right now.";
  const weeks = st.round!.closesWeek - s.clock.week;
  return `They're raising a ${st.round!.name}. The round closes in ${weeks} week${weeks === 1 ? '' : 's'}.`;
}

/** Valuation before the open round's money (or the last mark when not raising). */
export function preMoney(st: Startup): number {
  return st.round ? st.postMoney - st.round.amount : st.shares * st.lastPrice;
}

export interface HolderRow {
  name: string;
  pct: number;
  you: boolean;
}

/** The largest shareholders, you included when you hold shares. */
export function topShareholders(st: Startup, n = 5): HolderRow[] {
  const total = Math.max(1, st.shares);
  return [...st.holders]
    .filter((h) => h.shares > 0)
    .sort((a, b) => b.shares - a.shares)
    .slice(0, n)
    .map((h) => ({
      name: h.name,
      pct: h.shares / total,
      you: h.kind === 'company' || h.kind === 'personal',
    }));
}

export interface QuarterBar {
  label: string;
  a: number;
  b: number;
}

/** Short label for the quarter `back` quarters before the one that ended last: "Q3 '27". */
function quarterLabel(s: GameState, back: number): string {
  const d = dateOf(s.meta.startDate, s.clock.day);
  const idx = Math.max(0, d.getUTCFullYear() * 4 + (quarterOf(d) - 1) - 1 - back);
  return `Q${(idx % 4) + 1} '${String(Math.floor(idx / 4) % 100).padStart(2, '0')}`;
}

/** Last 8 quarters: revenue and net income, or cash and debt (balance sheet). */
export function quarterBars(s: GameState, st: Startup, mode: 'income' | 'balance'): QuarterBar[] {
  const qs = st.quarters.slice(-BARS);
  return qs.map((q, i) => ({
    label: quarterLabel(s, qs.length - 1 - i),
    a: mode === 'income' ? q.revenue : (q.cash ?? 0),
    b: mode === 'income' ? q.netIncome : (q.debt ?? 0),
  }));
}

/** Why you can't invest from an account now, or undefined. */
export function investBlock(s: GameState, st: Startup, account: Account): string | undefined {
  if (!isPrivate(st)) return 'This startup is no longer private.';
  const access = accessBlock(s, st);
  if (access) return access;
  if (account === 'company') return ventureTierBlock(s);
  return undefined;
}

export const accountCash = (s: GameState, account: Account) =>
  account === 'company' ? s.company.cash : s.personal.cash;

/** Venture debt stepper bounds: amount up to 10% of post-money, rate around the acceptance line. */
export function debtBounds(s: GameState, st: Startup) {
  const policy = homeCountry(s).policyRate;
  const max = maxVentureDebt(st);
  // About 20 steps from zero to the maximum, in round numbers.
  const step = Math.max(MIN_STEP, Math.pow(10, Math.floor(Math.log10(Math.max(1, max / STEPS)))));
  const ceiling = policy + VENTURE_DEBT.spread;
  return {
    maxAmount: Math.floor(max / step) * step,
    amountStep: step,
    ceiling,
    rateMin: RATE_MIN,
    rateMax: ceiling + RATE_HEADROOM,
  };
}

export const yourShares = (st: Startup, account: Account) => startupShares(st, account);
