// Treasury (SIMULATION §13.1–13.5): liquid assets (reserves plus government
// bonds), bond mark-to-market, automatic overnight and central bank window
// funding, funding freezes, and interest on all of it.
import {
  BOND_DURATION,
  BOND_PULL_TO_PAR_WEEKS,
  BOND_YIELD_SPREAD,
  FREEZE_RELEASE,
  LIQ_MIN,
  LIQ_REPAY_BUFFER,
  OVERNIGHT_LIMIT,
  OVERNIGHT_LIMIT_MULT,
  OVERNIGHT_SPREAD,
  RATING_SPREADS,
  WEEKS_PER_YEAR,
  WINDOW_SPREAD,
  WINDOW_STIGMA,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { totalDeposits } from './balanceSheet';
import { pushEvent } from './events';
import { earn, postPnl, spend } from './ledger';
import { ftpLong } from './rates';
import { stream } from './rng';
import type { CountryState, GameState } from './state';

/** The country whose central bank the treasury deals with (the home city's). */
export function homeCountry(state: GameState): CountryState {
  const firstBranch = Object.values(state.branches)[0];
  const cityId = firstBranch?.cityId ?? state.world.currentCityId;
  const c = state.world.countries[CITIES[cityId]!.country];
  if (!c) throw new Error('Home country not simulated');
  return c;
}

export function ratingSpread(capitalRatio: number): number {
  for (const r of RATING_SPREADS) if (capitalRatio >= r.minCr) return r.spread;
  return 0;
}

export function overnightRate(state: GameState): number {
  // treasuryPenalty is 0 until the Treasury floor exists (Stage 4).
  return (
    homeCountry(state).policyRate + OVERNIGHT_SPREAD + ratingSpread(state.company.capitalRatio)
  );
}

export function windowRate(state: GameState): number {
  return homeCountry(state).policyRate + WINDOW_SPREAD;
}

export function liquidAssets(state: GameState): number {
  return state.treasury.reserves + state.treasury.bondsMarket;
}

/** Tick step 6. */
export function runTreasury(state: GameState): void {
  const t = state.treasury;
  const c = homeCountry(state);

  // §13.4 mark-to-market on FTP_long moves, then pull to par.
  const dLong = ftpLong(c) - c.prevFtpLong;
  t.bondsMarket *= 1 - BOND_DURATION * dLong;
  t.bondsMarket += (t.bondsBook - t.bondsMarket) / BOND_PULL_TO_PAR_WEEKS;

  const deposits = totalDeposits(state);
  handleShortfall(state, deposits);
  repayWholesale(state, deposits);
  rebalanceBonds(state, deposits, c);

  // Interest: reserves earn the policy rate, bonds pay their book coupon, wholesale costs.
  earn(state, 'reserveInterest', (Math.max(0, t.reserves) * c.policyRate) / WEEKS_PER_YEAR);
  earn(state, 'bondCoupon', (t.bondsBook * t.bondBookYield) / WEEKS_PER_YEAR);
  spend(
    state,
    'wholesaleInterest',
    (t.overnight * overnightRate(state) + t.window * windowRate(state)) / WEEKS_PER_YEAR,
  );

  if (t.windowStigmaWeeks > 0) t.windowStigmaWeeks -= 1;
  state.company.liquidityRatio = deposits > 0 ? liquidAssets(state) / deposits : null;
}

/** §13.5: borrow overnight, then from the window; without auto-funding, freeze lending. */
function handleShortfall(state: GameState, deposits: number): void {
  const t = state.treasury;
  const minL = LIQ_MIN * deposits;
  let need = minL - liquidAssets(state);
  if (need <= 0) {
    if (t.freeze && liquidAssets(state) >= (LIQ_MIN + FREEZE_RELEASE) * deposits) t.freeze = false;
    return;
  }
  if (!t.autoFunding) {
    t.freeze = true;
    return;
  }
  const limit = OVERNIGHT_LIMIT * deposits * OVERNIGHT_LIMIT_MULT[state.company.tier];
  const overnight = Math.max(0, Math.min(need, limit - t.overnight));
  t.overnight += overnight;
  t.reserves += overnight;
  need -= overnight;
  if (need > 0) {
    t.window += need;
    t.reserves += need;
    t.windowStigmaWeeks = WINDOW_STIGMA.weeks;
    if (stream(state, 'news').chance(WINDOW_STIGMA.newsChance)) {
      pushEvent(state, 'WINDOW_USE', { amount: need }, 2);
    }
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

/** Bonds target bondShare of liquid assets above LIQ_MIN × deposits (§13.4). */
function rebalanceBonds(state: GameState, deposits: number, c: CountryState): void {
  const t = state.treasury;
  const target = t.bondShare * Math.max(0, liquidAssets(state) - LIQ_MIN * deposits);
  const diff = target - t.bondsMarket;
  if (diff > 0) {
    const yieldNew = ftpLong(c) + BOND_YIELD_SPREAD;
    t.bondBookYield =
      t.bondsBook + diff > 0
        ? (t.bondsBook * t.bondBookYield + diff * yieldNew) / (t.bondsBook + diff)
        : yieldNew;
    t.bondsBook += diff;
    t.bondsMarket += diff;
    t.reserves -= diff;
  } else if (diff < 0 && t.bondsMarket > 0) {
    const sell = Math.min(-diff, t.bondsMarket);
    const bookPart = (sell * t.bondsBook) / t.bondsMarket;
    postPnl(state, 'realizedGains', sell - bookPart);
    t.bondsBook -= bookPart;
    t.bondsMarket -= sell;
    t.reserves += sell;
  }
}

/** Corporate cash → liquid assets. There is no reverse transfer (§13.2). */
export function transferIn(state: GameState, amount: number): void {
  state.treasury.reserves += amount;
}
