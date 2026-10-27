// Test setup for the stock market and equity raises: a Calgary game with extra
// paid-in capital (identity kept), an office holding ARR, four profitable
// quarters on record and a Strong tier, so it qualifies for an IPO;
// `publicBank` also lists it.
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { listPendingIpo } from '../../src/sim/equityIpo';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { openScriptedBranch } from './scenario';

export const BANK = 'ashgrove';

/** Adds paid-in capital and the matching cash, keeping the balance identity. */
export function addCapital(s: GameState, amount: number): void {
  s.company.cash += amount;
  s.company.paidInCapital += amount;
}

/** Puts `arr` of Pro plan ARR on an office (opening one if there is none). */
export function giveArr(s: GameState, arr: number): void {
  const id = Object.keys(s.branches)[0] ?? openScriptedBranch(s);
  s.branches[id]!.books.pro!.balance += arr;
}

/** Four quarters each earning `roe`/4 of current equity. */
export function setQuarters(s: GameState, roe: number, n = 4): void {
  const equity = balanceSheet(s).equity;
  s.history.quarterly = Array.from({ length: n }, (_, i) => ({
    endWeek: i * 13 + 12,
    year: 2027,
    q: ((i % 4) + 1) as 1 | 2 | 3 | 4,
    revenue: equity * 0.1,
    netIncome: (equity * roe) / 4,
    eps: 0,
    roe,
  }));
}

/** A private bank that passes every IPO rule. */
export function eligibleBank(seed = 42, capital = 40_000_000, arr = 120_000_000): GameState {
  const s = newGame({ seed, cityId: 'cal', bankName: 'Test Bank' });
  addCapital(s, capital);
  giveArr(s, arr);
  setQuarters(s, 0.15);
  s.company.tier = 'strong';
  return s;
}

/** An eligible bank that has launched and listed its IPO. */
export function publicBank(seed = 42, floatPct = 0.25): GameState {
  const s = eligibleBank(seed);
  const r = cmd.launchIpo(s, BANK, floatPct);
  if (!r.ok) throw new Error(r.reason);
  if (!listPendingIpo(s)) throw new Error('IPO did not list');
  return s;
}

/** Equity from the balance sheet minus the rolled-forward expectation (should be ~0). */
export function identityGap(s: GameState): number {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
}

/** Shares on the cap table minus shares outstanding (should be 0). */
export function capTableGap(s: GameState): number {
  return s.stock.holders.reduce((t, h) => t + h.shares, 0) - s.company.sharesOutstanding;
}
