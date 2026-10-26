// Real estate formulas (SIMULATION §21.1–21.2): a building's base and current
// market rent, estimated value, offer acceptance, the occupancy a rent level
// settles at (with a property chief's pricing power), the best rent to charge,
// and an owned building's weekly rent, maintenance, vacancy cost, net and ROI.
// Pure functions of their inputs; realEstate.ts and the UI both read them.
import { REAL_ESTATE, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { clamp } from './math';
import type { GameState, Property, Site } from './state';

/** Base rent per m² per year: the district's rent × the city's rent index (§21.1). */
export function baseRentFor(site: Site): number {
  const district = DISTRICT_SPECS[site.district]?.marketRent ?? 0;
  return district * (CITIES[site.cityId]?.rentIndex ?? 1);
}

/** §21.2: today's market rent, the base rent × the city's cre/100. */
export function marketRentNow(state: GameState, site: Site): number {
  return (baseRentFor(site) * cityCre(state, site.cityId)) / 100;
}

/** The commercial real estate index of the city's country (100 = start). */
export function cityCre(state: GameState, cityId: string): number {
  const country = CITIES[cityId]?.country;
  return (country && state.world.countries[country]?.cre) || 100;
}

/** §21.1: estimated value = size × baseRent × 3.2 × cre / 100, i.e. size × today's market rent × 3.2. */
export function estimateValue(sqm: number, baseRent: number, cre: number): number {
  return (sqm * baseRent * REAL_ESTATE.valueMult * cre) / 100;
}

/** §21.1: chance an offer is accepted = clamp((offer/asking − 0.85) / 0.15, 0, 1). */
export function offerAcceptance(offer: number, asking: number): number {
  if (asking <= 0) return 1;
  return clamp((offer / asking - REAL_ESTATE.offerFloor) / REAL_ESTATE.offerSpan, 0, 1);
}

/**
 * §21.2: occTarget = clamp(0.97 − 1.6 × (rent/(marketRent × (1 + pricingPower)) − 1), 0.30, 0.98).
 * `pricingPower` is the premium a managing property chief gets tenants to accept
 * (execSeats.rentPricingPower), 0 without one.
 */
export function occupancyTarget(rent: number, marketRent: number, pricingPower = 0): number {
  const accepted = marketRent * (1 + pricingPower);
  const ratio = accepted > 0 ? rent / accepted : 1;
  return clamp(
    REAL_ESTATE.occBase - REAL_ESTATE.occSlope * (ratio - 1),
    REAL_ESTATE.occMin,
    REAL_ESTATE.occMax,
  );
}

/** The highest rent/market ratio that still fills the building: 1 − (occMax − occBase)/occSlope. */
export const bestRentRatio = (): number =>
  1 - (REAL_ESTATE.occMax - REAL_ESTATE.occBase) / REAL_ESTATE.occSlope;

/**
 * §21.2: the rent a property chief sets, the highest that still fills the
 * building given their pricing power, rounded down to the rent step and kept
 * inside the owner's rent range.
 */
export function bestRent(marketRent: number, pricingPower = 0): number {
  const raw = marketRent * (1 + pricingPower) * bestRentRatio();
  const stepped = Math.floor(raw / REAL_ESTATE.rentStep) * REAL_ESTATE.rentStep;
  const { min, max } = rentBounds(marketRent);
  return clamp(stepped, min, max);
}

/**
 * §21.2: the rent that holds a building at occupancy `target` (an occupancy
 * dial stop): the occTarget curve solved for rent,
 * marketRent × (1 + pricingPower) × (1 + (occBase − target)/occSlope), stepped
 * and kept in range like bestRent. At or above occMax it is bestRent.
 */
export function rentForOccupancy(marketRent: number, pricingPower: number, target: number): number {
  if (target >= REAL_ESTATE.occMax) return bestRent(marketRent, pricingPower);
  const ratio = 1 + (REAL_ESTATE.occBase - target) / REAL_ESTATE.occSlope;
  const raw = marketRent * (1 + pricingPower) * ratio;
  const stepped = Math.floor(raw / REAL_ESTATE.rentStep) * REAL_ESTATE.rentStep;
  const { min, max } = rentBounds(marketRent);
  return clamp(stepped, min, max);
}

export interface PropertyWeek {
  revenue: number;
  maintenance: number;
  vacancy: number;
  net: number;
}

/** §21.2: one week of rent revenue, fixed maintenance and vacancy cost at the current occupancy. */
export function propertyWeek(p: Pick<Property, 'sqm' | 'rent' | 'marketRent' | 'occupancy'>) {
  const revenue = (p.sqm * p.rent * p.occupancy) / WEEKS_PER_YEAR;
  const maintenance = (p.sqm * p.marketRent * REAL_ESTATE.maintenance) / WEEKS_PER_YEAR;
  const vacancy = (p.sqm * (1 - p.occupancy) * REAL_ESTATE.vacancyPerSqm) / WEEKS_PER_YEAR;
  const week: PropertyWeek = {
    revenue,
    maintenance,
    vacancy,
    net: revenue - maintenance - vacancy,
  };
  return week;
}

/** §21.2: ROI = annualized net / purchase price. */
export function propertyRoi(p: Property): number {
  if (p.purchasePrice <= 0) return 0;
  return (propertyWeek(p).net * WEEKS_PER_YEAR) / p.purchasePrice;
}

/** The rent range the owner may set (per m² per year). */
export function rentBounds(marketRent: number): { min: number; max: number } {
  const [lo, hi] = REAL_ESTATE.rentRange;
  return { min: marketRent * lo, max: marketRent * hi };
}
