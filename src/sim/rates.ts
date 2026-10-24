// Funds transfer pricing and reference prices (SIMULATION §5): FTP rates, each
// product's default price rule, and the market reference m(p, city) — the
// branch-weighted average of rival prices, which your own branches never move.
import { CITIES } from '../data/cities';
import { PRODUCTS, type ProductSpec } from '../data/products';
import { clamp } from './math';
import { baseId, productSpec } from './products';
import type { CountryState, GameState } from './state';

export function ftpShort(c: CountryState): number {
  return c.policyRate;
}

export function ftpLong(c: CountryState): number {
  return c.policyRate + c.termPremium;
}

export function ftpFor(spec: ProductSpec, c: CountryState): number {
  return spec.tenor === 'long' ? ftpLong(c) : ftpShort(c);
}

/** The product's default price under current rates (§5 default price rules). */
export function defaultPrice(spec: ProductSpec, c: CountryState): number {
  const rule = spec.defaultRule;
  let price: number;
  switch (rule.base) {
    case 'ftpShort':
      price = Math.max(rule.floor ?? -Infinity, ftpShort(c) + rule.spread);
      break;
    case 'ftpLong':
      price = Math.max(rule.floor ?? -Infinity, ftpLong(c) + rule.spread);
      break;
    case 'card':
      // Card APRs are fixed and follow FTP only in large moves (cardAnchor).
      price = rule.value + (c.cardAnchor - c.startPolicy);
      break;
    case 'fixed':
      // $ fees re-price yearly with inflation; % fees don't.
      price = spec.priceType === 'pctFee' ? rule.value : rule.value * c.feeIndex;
      break;
  }
  return clamp(price, spec.min, spec.max);
}

export function countryOfCity(state: GameState, cityId: string): CountryState {
  const city = CITIES[cityId];
  const c = city && state.world.countries[city.country];
  if (!c) throw new Error(`No simulated country for city ${cityId}`);
  return c;
}

/** Recomputes m(p, city) for every generated city (tick step 2). */
export function updateMarketRefs(state: GameState): void {
  for (const city of Object.values(state.world.cities)) {
    const c = countryOfCity(state, city.id);
    for (const spec of Object.values(PRODUCTS)) {
      let weighted = 0;
      let count = 0;
      for (const rival of Object.values(state.rivals)) {
        if (rival.status !== 'active') continue;
        const n = rival.branches.filter((b) => b.cityId === city.id).length;
        const price = rival.prices[spec.id];
        if (n > 0 && price !== undefined) {
          weighted += price * n;
          count += n;
        }
      }
      city.marketRef[spec.id] = count > 0 ? weighted / count : defaultPrice(spec, c);
    }
  }
}

/**
 * Market reference for a product in a city, falling back to the default rule.
 * A developed product compares against its base product's market (× refMult).
 */
export function marketRef(state: GameState, cityId: string, productId: string): number {
  const spec = productSpec(state, productId);
  if (!spec) throw new Error(`Unknown product ${productId}`);
  const refId = baseId(spec);
  const ref = state.world.cities[cityId]?.marketRef[refId];
  const m = ref ?? defaultPrice(PRODUCTS[refId] ?? spec, countryOfCity(state, cityId));
  return spec.refMult === undefined ? m : m * spec.refMult;
}
