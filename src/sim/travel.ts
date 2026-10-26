// Travel (DESIGN §5.17, SIMULATION §22): the weekly free-flying allowance,
// fares past it, and the private jet. Flights are instant in the simulation;
// the plane animation is cosmetic. Travel is never blocked: a fare the founder
// can't cover from personal cash is paid by the bank as a travel expense.
import { hasTrophyPerk } from './trophies';
import { FLIGHT_FARE, JET, TRAVEL_KM_PER_WEEK, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { JETS } from '../data/jets';
import { cityDistanceKm } from './geo';
import { listPrice } from './nominal';
import type { GameState } from './state';

export interface FlightQuote {
  to: string;
  km: number;
  mode: 'free' | 'fare' | 'jet';
  /** Whole fare (0 unless mode is 'fare'). */
  fare: number;
  personalPays: number;
  bankPays: number;
}

/** Free km left this week. */
export function kmRemaining(state: GameState): number {
  return Math.max(0, TRAVEL_KM_PER_WEEK - state.world.travel.kmThisWeek);
}

/** One-way fare to a destination past the allowance: FLIGHT_FARE × its costIndex × today's price list. */
export function fareTo(state: GameState, cityId: string): number {
  // Owning the airline trophy (§22a) makes every flight free.
  if (hasTrophyPerk(state, 'freeFlights')) return 0;
  return listPrice(state, FLIGHT_FARE * (CITIES[cityId]?.costIndex ?? 1), cityId);
}

/** Your jet's range in km: null for global, undefined without a jet. */
export function jetRange(state: GameState): number | null | undefined {
  const jet = state.personal.jet;
  return jet ? (JETS[jet.model]?.rangeKm ?? null) : undefined;
}

/** Whether your jet can make a hop of `km`. */
export function jetReaches(state: GameState, km: number): boolean {
  const range = jetRange(state);
  return range !== undefined && (range === null || km <= range);
}

/** What a flight from where you are would cost; `jet` asks for your own plane. */
export function flightQuote(state: GameState, to: string, jet = false): FlightQuote {
  const km = cityDistanceKm(state.world.currentCityId, to);
  if (jet && jetReaches(state, km)) {
    return { to, km, mode: 'jet', fare: 0, personalPays: 0, bankPays: 0 };
  }
  if (km <= kmRemaining(state)) {
    return { to, km, mode: 'free', fare: 0, personalPays: 0, bankPays: 0 };
  }
  const fare = fareTo(state, to);
  const personalPays = Math.min(fare, Math.max(0, state.personal.cash));
  return { to, km, mode: 'fare', fare, personalPays, bankPays: fare - personalPays };
}

/** Weekly (tick step 11): reset the allowance; the jet costs upkeep and loses value. */
export function runTravel(state: GameState): void {
  state.world.travel.kmThisWeek = 0;
  const jet = state.personal.jet;
  if (!jet) return;
  state.personal.cash -= (jet.value * JET.upkeepRate) / WEEKS_PER_YEAR;
  jet.value -= (jet.value * JET.depreciation) / WEEKS_PER_YEAR;
}

/** A week's upkeep of a jet worth `value`, from personal cash (as runTravel charges it). */
export function jetUpkeepWeekly(value: number): number {
  return (value * JET.upkeepRate) / WEEKS_PER_YEAR;
}

/** What selling the jet would raise now. */
export function jetResale(state: GameState): number {
  const jet = state.personal.jet;
  return jet ? jet.value * (1 - JET.resaleHaircut) : 0;
}
