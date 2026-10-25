// What the founder's homes and cars are worth and cost (SIMULATION §22). Pure
// functions of the state: the weekly step (personalAssets.ts), the commands and
// the UI all read these, so a price on screen is the price the command charges.
import { CARS_CFG, HOMES_CFG, WEEKS_PER_YEAR } from '../config/balance';
import { CARS } from '../data/cars';
import { HOMES } from '../data/homes';
import type { CountryId } from '../data/types';
import { clamp } from './math';
import type { GameState, OwnedCar, OwnedHome, Site } from './state';

/** A country's house price index (100 = the start). */
export function countryHpi(state: GameState, country: CountryId): number {
  return state.world.countries[country]?.hpi || 100;
}

/** The hpi a home's value follows: its country's. */
export function homeHpi(state: GameState, homeId: string): number {
  const spec = HOMES[homeId];
  return spec ? countryHpi(state, spec.country) : 100;
}

/** Asking price today: the list price moved by the country's house prices since the start. */
export function homeAsking(state: GameState, homeId: string): number {
  const spec = HOMES[homeId];
  return spec ? Math.round((spec.price * homeHpi(state, homeId)) / 100) : 0;
}

/** Chance the seller accepts: a linear ramp from HOMES_CFG.offerMin of asking (0) to asking (1). */
export function homeOfferAcceptance(offer: number, asking: number): number {
  if (asking <= 0) return 1;
  return clamp((offer / asking - HOMES_CFG.offerMin) / (1 - HOMES_CFG.offerMin), 0, 1);
}

/** Offer stepper bounds: HOMES_CFG.offerMin of asking up to asking, in steps of offerStep. */
export function homeOfferBounds(asking: number): { min: number; max: number; step: number } {
  const step = Math.max(1000, Math.round((asking * HOMES_CFG.offerStep) / 1000) * 1000);
  return { min: Math.ceil((asking * HOMES_CFG.offerMin) / step) * step, max: asking, step };
}

/** The home you own with this home id, if any. */
export function ownedHome(state: GameState, homeId: string): OwnedHome | undefined {
  return state.personal.empire.homes.find((h) => h.homeId === homeId);
}

/** Weeks until the seller hears offers again after a refusal (0 = open now). */
export function homeLockWeeks(state: GameState, homeId: string): number {
  const until = state.personal.empire.offerLocks?.[homeId];
  return until === undefined ? 0 : Math.max(0, until - state.clock.week);
}

/** The map building of a home (its vacation home site). */
export function homeSite(state: GameState, homeId: string): Site | undefined {
  return Object.values(state.world.sites).find(
    (x) => x.kind === 'vacationHome' && x.refId === homeId,
  );
}

export const homeUpkeepWeekly = (value: number) => (value * HOMES_CFG.upkeepRate) / WEEKS_PER_YEAR;
export const rebuildCost = (value: number) => value * HOMES_CFG.rebuildCost;
/** What a sale raises: value less the agent's fee. */
export const homeSalePrice = (value: number) => value * (1 - HOMES_CFG.sellFee);

/** A car's yearly value change: classics gain, everything else loses. */
export function carYearlyChange(carId: string): number {
  return CARS[carId]?.classic ? CARS_CFG.classicGain : -CARS_CFG.depreciation;
}
export const carUpkeepWeekly = (value: number) => (value * CARS_CFG.upkeepRate) / WEEKS_PER_YEAR;
/** What a dealer pays for your car: value less the resale haircut. */
export const carResale = (car: Pick<OwnedCar, 'value'>) => car.value * (1 - CARS_CFG.resaleHaircut);
