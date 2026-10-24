// Real estate formulas (SIMULATION §21.1–21.2): a building's market rent and
// estimated value, offer acceptance, the occupancy a rent level settles at, and
// an owned building's weekly rent, maintenance, vacancy cost, net and ROI.
// Pure functions of their inputs; realEstate.ts and the UI both read them.
import { REAL_ESTATE, WEEKS_PER_YEAR } from '../config/balance';
import { CITIES } from '../data/cities';
import { DISTRICT_SPECS } from '../data/districts';
import { clamp } from './math';
import type { GameState, Property, Site } from './state';

/** Market rent per m² per year: the district's rent × the city's rent index (§21.1). */
export function marketRentFor(site: Site): number {
  const district = DISTRICT_SPECS[site.district]?.marketRent ?? 0;
  return district * (CITIES[site.cityId]?.rentIndex ?? 1);
}

/** The commercial real estate index of the city's country (100 = start). */
export function cityCre(state: GameState, cityId: string): number {
  const country = CITIES[cityId]?.country;
  return (country && state.world.countries[country]?.cre) || 100;
}

/** §21.1: estimated value = size × marketRent × 3.2 × cre / 100. */
export function estimateValue(sqm: number, marketRent: number, cre: number): number {
  return (sqm * marketRent * REAL_ESTATE.valueMult * cre) / 100;
}

/** §21.1: chance an offer is accepted = clamp((offer/asking − 0.85) / 0.15, 0, 1). */
export function offerAcceptance(offer: number, asking: number): number {
  if (asking <= 0) return 1;
  return clamp((offer / asking - REAL_ESTATE.offerFloor) / REAL_ESTATE.offerSpan, 0, 1);
}

/** §21.2: occTarget = clamp(0.97 − 1.6 × (rent/marketRent − 1), 0.30, 0.98). */
export function occupancyTarget(rent: number, marketRent: number): number {
  const ratio = marketRent > 0 ? rent / marketRent : 1;
  return clamp(
    REAL_ESTATE.occBase - REAL_ESTATE.occSlope * (ratio - 1),
    REAL_ESTATE.occMin,
    REAL_ESTATE.occMax,
  );
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
