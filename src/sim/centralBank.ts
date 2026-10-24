// Read-only views of a country's central bank for its panel (SCREENS §8):
// the yield curve, the next meeting day and the GDP figures it reports.
// Pure functions over GameState; no state changes.
import { DAYS_PER_WEEK, MACRO_TARGETS, WEEKS_PER_YEAR, YIELD_CURVE } from '../config/balance';
import { COUNTRIES } from '../data/countries';
import type { CountryId } from '../data/types';
import { dateOf, weekOfYear } from './calendar';
import { sum } from './math';
import type { CountryState, GameState } from './state';

export interface CurvePoint {
  label: string;
  rate: number;
}

/**
 * SCREENS §8 yield curve: overnight at the policy rate, longer tenors adding a
 * growing share of the term premium (YIELD_CURVE). The premium turns negative
 * in a slowdown (SIMULATION §4.2), so the curve inverts before recessions.
 */
export function yieldCurve(c: CountryState): CurvePoint[] {
  return YIELD_CURVE.map((t) => ({
    label: t.label,
    rate: c.policyRate + t.premiumShare * c.termPremium,
  }));
}

export function isInverted(curve: CurvePoint[]): boolean {
  const first = curve[0];
  const last = curve.at(-1);
  return !!first && !!last && last.rate < first.rate;
}

/** The country whose meetings set this one's rate: itself, or its peg anchor. */
export function meetingCountry(id: CountryId): CountryId {
  return COUNTRIES[id].peggedTo ?? id;
}

/**
 * The game day of the next weekly tick that holds a meeting (macro.ts runs a
 * meeting when the tick's week of the year is in the country's list).
 */
export function nextMeetingDay(state: GameState, id: CountryId): number | undefined {
  const weeks = COUNTRIES[meetingCountry(id)].meetingWeeks;
  if (weeks.length === 0) return undefined;
  const nextTick = (state.clock.week + 1) * DAYS_PER_WEEK;
  for (let k = 0; k <= WEEKS_PER_YEAR + 1; k++) {
    const day = nextTick + k * DAYS_PER_WEEK;
    if (weeks.includes(weekOfYear(dateOf(state.meta.startDate, day)))) return day;
  }
  return undefined;
}

/** GDP growth last quarter (the mean of gdpHistory, as CB_DECISION reports it). */
export function lastQuarterGdp(c: CountryState): number {
  return c.gdpHistory.length ? sum(c.gdpHistory) / c.gdpHistory.length : c.gdp;
}

/**
 * The bank's GDP forecast: the one published with its latest decision while
 * that is still in the event log, else its phase's GDP target (§4.4).
 */
export function gdpForecast(state: GameState, c: CountryState): number {
  const id = meetingCountry(c.id);
  for (let i = state.events.log.length - 1; i >= 0; i--) {
    const e = state.events.log[i]!;
    if (
      e.type === 'CB_DECISION' &&
      e.payload.country === id &&
      typeof e.payload.forecast === 'number'
    )
      return id === c.id ? e.payload.forecast : MACRO_TARGETS[c.phase].gdp;
  }
  return MACRO_TARGETS[c.phase].gdp;
}
