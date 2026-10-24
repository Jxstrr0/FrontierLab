// Macro economy per country (SIMULATION §4): business-cycle phases, GDP,
// inflation, unemployment, house and commercial property indices, the term
// premium and the central bank's policy rule. Derived factors at the bottom are
// read by demand, books and treasury.
import {
  CREDIT_CYCLE,
  DEPOSIT_GROWTH_SLOPE,
  EQUITY_MARKET_DRIFT,
  GDP_FORECAST_SIGMA,
  GDP_HISTORY_WEEKS,
  HPI_HISTORY_WEEKS,
  LOAN_DEMAND,
  MACRO_EMA,
  MACRO_INDEX_SIGMA,
  MACRO_MIN_PHASE_WEEKS,
  MACRO_SIGMA,
  MACRO_TARGETS,
  MACRO_TRANSITIONS,
  MARKET_SHOCK_SIGMA,
  MORTGAGE_LGD_SLOPE,
  POLICY_BIG_GAP,
  POLICY_BIG_STEP,
  POLICY_CAP,
  POLICY_FLOOR,
  POLICY_GDP_NEUTRAL,
  POLICY_GDP_WEIGHT,
  POLICY_HOLD_BAND,
  POLICY_INFLATION_WEIGHT,
  POLICY_STEP,
  TERM_PREMIUM_EMA,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { COUNTRIES } from '../data/countries';
import type { CountryId } from '../data/types';
import { dateOf, weekOfYear } from './calendar';
import { pushEvent } from './events';
import { clamp, ema, sum } from './math';
import { stream, type Rng } from './rng';
import type { CountryState, GameState } from './state';

export function initCountry(id: CountryId, rng: Rng): CountryState {
  const spec = COUNTRIES[id];
  const t = MACRO_TARGETS.expansion;
  return {
    id,
    phase: 'expansion',
    // Start somewhere inside an expansion so cycles differ between seeds.
    weeksInPhase: rng.int(0, WEEKS_PER_YEAR),
    gdp: t.gdp,
    inflation: t.inflation,
    unemployment: t.unemployment,
    hpi: 100,
    cre: 100,
    policyRate: spec.startPolicy,
    termPremium: t.termPremium,
    gdpHistory: [],
    hpiHistory: [],
    prevFtpShort: spec.startPolicy,
    prevFtpLong: spec.startPolicy + t.termPremium,
    cardAnchor: spec.startPolicy,
    startPolicy: spec.startPolicy,
    feeIndex: 1,
    marketReturn: 0,
  };
}

/**
 * Simulates every country in the data (Stage 5): the home country first, then
 * the rest in CONTENT order, so a migrated save and a new game iterate alike.
 */
export function initCountries(state: GameState, home: CountryId): void {
  const rng = stream(state, 'macro');
  const ids = [home, ...(Object.keys(COUNTRIES) as CountryId[]).filter((id) => id !== home)];
  for (const id of ids) state.world.countries[id] ??= initCountry(id, rng);
}

/** Weekly macro update for every simulated country (tick step 1). */
export function updateMacro(state: GameState): void {
  const rng = stream(state, 'macro');
  const date = dateOf(state.meta.startDate, state.clock.day);
  const woy = weekOfYear(date);
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    stepPhase(c, state.clock.week, rng);
    const t = MACRO_TARGETS[c.phase];
    c.gdp = ema(c.gdp, t.gdp, MACRO_EMA) + rng.normal(0, MACRO_SIGMA.gdp);
    c.inflation = ema(c.inflation, t.inflation, MACRO_EMA) + rng.normal(0, MACRO_SIGMA.inflation);
    c.unemployment =
      ema(c.unemployment, t.unemployment, MACRO_EMA) + rng.normal(0, MACRO_SIGMA.unemployment);
    c.hpi *= 1 + t.hpiDrift / WEEKS_PER_YEAR + rng.normal(0, MACRO_INDEX_SIGMA);
    c.cre *= 1 + t.creDrift / WEEKS_PER_YEAR + rng.normal(0, MACRO_INDEX_SIGMA);
    c.termPremium = ema(c.termPremium, t.termPremium, TERM_PREMIUM_EMA);
    c.marketReturn = rng.normal(EQUITY_MARKET_DRIFT[c.phase] / WEEKS_PER_YEAR, MARKET_SHOCK_SIGMA);
    pushHistory(c.gdpHistory, c.gdp, GDP_HISTORY_WEEKS);
    pushHistory(c.hpiHistory, c.hpi, HPI_HISTORY_WEEKS);
  }
  // Policy decisions after every country has updated, so pegs see the anchor's new rate.
  for (const c of Object.values(state.world.countries)) {
    if (!c) continue;
    const spec = COUNTRIES[c.id];
    if (spec.peggedTo) {
      const anchor = state.world.countries[spec.peggedTo];
      if (anchor) c.policyRate = anchor.policyRate + (spec.pegSpread ?? 0);
      continue;
    }
    if (spec.meetingWeeks.includes(woy)) decidePolicy(state, c, rng);
  }
}

function stepPhase(c: CountryState, week: number, rng: Rng): void {
  c.weeksInPhase += 1;
  if (c.forceRecessionAtWeek !== undefined && week === c.forceRecessionAtWeek) {
    c.phase = 'recession';
    c.weeksInPhase = 0;
    return;
  }
  if (c.weeksInPhase < MACRO_MIN_PHASE_WEEKS) return;
  let roll = rng.next();
  for (const tr of MACRO_TRANSITIONS[c.phase]) {
    roll -= tr.p;
    if (roll < 0) {
      c.phase = tr.to;
      c.weeksInPhase = 0;
      return;
    }
  }
}

/** SIMULATION §4.4: a Taylor-style rule in percent units, converted to decimals. */
function decidePolicy(state: GameState, c: CountryState, rng: Rng): void {
  const spec = COUNTRIES[c.id];
  const targetPct =
    spec.neutral * 100 +
    POLICY_INFLATION_WEIGHT * (c.inflation - spec.inflationTarget) +
    POLICY_GDP_WEIGHT * (c.gdp - POLICY_GDP_NEUTRAL);
  const diff = targetPct / 100 - c.policyRate;
  let change = 0;
  if (Math.abs(diff) >= POLICY_HOLD_BAND) {
    change = Math.sign(diff) * (Math.abs(diff) > POLICY_BIG_GAP ? POLICY_BIG_STEP : POLICY_STEP);
  }
  const before = c.policyRate;
  c.policyRate = clamp(Math.round((c.policyRate + change) * 1e6) / 1e6, POLICY_FLOOR, POLICY_CAP);
  change = c.policyRate - before;
  c.lastDecision = { week: state.clock.week, change };
  const lastQuarterGdp = c.gdpHistory.length ? sum(c.gdpHistory) / c.gdpHistory.length : c.gdp;
  pushEvent(state, 'CB_DECISION', {
    country: c.id,
    cb: spec.centralBank,
    rate: c.policyRate,
    change,
    gdp: lastQuarterGdp,
    forecast: MACRO_TARGETS[c.phase].gdp + rng.normal(0, GDP_FORECAST_SIGMA),
    inflation: c.inflation,
  });
}

function pushHistory(list: number[], value: number, keep: number): void {
  list.push(value);
  if (list.length > keep) list.splice(0, list.length - keep);
}

// ─── Derived factors (§4.5) ───────────────────────────────────────────────────

/** Multiplies default rates. */
export function creditCycle(c: CountryState): number {
  return Math.max(
    CREDIT_CYCLE.floor,
    1 + CREDIT_CYCLE.slope * (c.unemployment - CREDIT_CYCLE.base),
  );
}

export function loanDemand(c: CountryState): number {
  const neutral = COUNTRIES[c.id].neutral;
  return clamp(
    1 +
      LOAN_DEMAND.gdpSlope * (c.gdp - POLICY_GDP_NEUTRAL) -
      LOAN_DEMAND.rateSlope * (c.policyRate - neutral) * 100,
    LOAN_DEMAND.min,
    LOAN_DEMAND.max,
  );
}

export function depositGrowth(c: CountryState): number {
  return 1 + DEPOSIT_GROWTH_SLOPE * (c.gdp - POLICY_GDP_NEUTRAL);
}

/** House price change over the last 52 weeks, as a fraction. */
export function hpiYoY(c: CountryState): number {
  const first = c.hpiHistory[0];
  if (first === undefined || c.hpiHistory.length < 2) return 0;
  return c.hpi / first - 1;
}

export function mortgageLgdMult(c: CountryState): number {
  return 1 + MORTGAGE_LGD_SLOPE * Math.max(0, -hpiYoY(c));
}
