// Treasury (SIMULATION §13.1–13.6): liquid assets (reserves, the Loan Desk's
// lending fund), funding lot interest and maturities, automatic overnight and
// central bank window funding, funding freezes, and interest on all of it.
// Government bonds were removed in stage C3c. Market offers are generated in
// fundingMarket.ts.
import {
  FREEZE_RELEASE,
  LIQ_MIN,
  LIQ_REPAY_BUFFER,
  OVERNIGHT_LIMIT,
  OVERNIGHT_LIMIT_MULT,
  OVERNIGHT_SPREAD,
  RATING_SPREADS,
  RESERVE_RATE_SPREAD,
  WEEKS_PER_YEAR,
  WINDOW_SPREAD,
  WINDOW_STIGMA,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { totalDeposits } from './balanceSheet';
import { pushEvent } from './events';
import { matureLots, payLotInterest } from './fundingLots';
import { treasuryPenalty } from './hq';
import { earn, spend } from './ledger';
import { stream } from './rng';
import type { CountryState, GameState } from './state';

/** The country whose central bank the treasury deals with (the home city's). */
export function homeCountry(state: GameState): CountryState {
  const c = state.world.countries[CITIES[state.meta.homeCityId]!.country];
  if (!c) throw new Error('Home country not simulated');
  return c;
}

export function ratingSpread(capitalRatio: number): number {
  for (const r of RATING_SPREADS) if (capitalRatio >= r.minCr) return r.spread;
  return 0;
}

export function overnightRate(state: GameState): number {
  return (
    homeCountry(state).policyRate +
    OVERNIGHT_SPREAD +
    ratingSpread(state.company.capitalRatio) +
    treasuryPenalty(state)
  );
}

export function windowRate(state: GameState): number {
  return homeCountry(state).policyRate + WINDOW_SPREAD;
}

export function liquidAssets(state: GameState): number {
  return state.treasury.reserves;
}

/** Tick step 6. */
export function runTreasury(state: GameState): void {
  const t = state.treasury;
  const c = homeCountry(state);

  // §13.6 lots: interest from corporate cash, then maturities drain L before §13.5 runs.
  payLotInterest(state);
  matureLots(state);

  const deposits = totalDeposits(state);
  handleShortfall(state, deposits);
  repayWholesale(state, deposits);

  // Interest: reserves earn the deposit-facility rate; wholesale funding costs.
  const reserveRate = Math.max(0, c.policyRate - RESERVE_RATE_SPREAD);
  earn(state, 'reserveInterest', (Math.max(0, t.reserves) * reserveRate) / WEEKS_PER_YEAR);
  spend(
    state,
    'wholesaleInterest',
    (t.overnight * overnightRate(state) + t.window * windowRate(state)) / WEEKS_PER_YEAR,
  );

  if (t.windowStigmaWeeks > 0) t.windowStigmaWeeks -= 1;
  state.company.liquidityRatio = deposits > 0 ? liquidAssets(state) / deposits : null;
}

/** Window stigma (§13.5): branch ratings dip for 4 weeks, with a chance of a news story. */
export function applyWindowStigma(state: GameState, amount: number): void {
  state.treasury.windowStigmaWeeks = WINDOW_STIGMA.weeks;
  if (stream(state, 'news').chance(WINDOW_STIGMA.newsChance)) {
    pushEvent(state, 'WINDOW_USE', { amount }, 2);
  }
}

/**
 * §13.5: with auto-funding on, borrow overnight up to the limit to hold liquid
 * assets at the player's target, and go to the central bank window only for
 * whatever the minimum still lacks. Without auto-funding, nothing is borrowed
 * and a shortfall under the minimum freezes lending.
 */
function handleShortfall(state: GameState, deposits: number): void {
  const t = state.treasury;
  const L = liquidAssets(state);
  const minL = LIQ_MIN * deposits;
  const targetL = t.liqTarget * deposits;
  if (t.freeze && L >= (LIQ_MIN + FREEZE_RELEASE) * deposits) t.freeze = false;
  if (!t.autoFunding) {
    if (L < minL) t.freeze = true;
    return;
  }
  if (L >= targetL) return;
  const limit = OVERNIGHT_LIMIT * deposits * OVERNIGHT_LIMIT_MULT[state.company.tier];
  const overnight = Math.max(0, Math.min(targetL - L, limit - t.overnight));
  t.overnight += overnight;
  t.reserves += overnight;
  const underMin = minL - L - overnight;
  if (underMin > 0) {
    t.window += underMin;
    t.reserves += underMin;
    applyWindowStigma(state, underMin);
  }
  t.freeze = false;
}

/** Above target + 5pp, repay the window first, then overnight, down to target. */
function repayWholesale(state: GameState, deposits: number): void {
  const t = state.treasury;
  const L = liquidAssets(state);
  if (L <= (t.liqTarget + LIQ_REPAY_BUFFER) * deposits) return;
  let excess = L - t.liqTarget * deposits;
  for (const key of ['window', 'overnight'] as const) {
    const amt = Math.min(excess, t[key]);
    t[key] -= amt;
    t.reserves -= amt;
    excess -= amt;
  }
}

/** Company cash → the lending fund (reserves). There is no reverse transfer (§13.2). */
export function addToLendingFund(state: GameState, amount: number): void {
  state.treasury.reserves += amount;
}
