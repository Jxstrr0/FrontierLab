// Product and pricing commands at a branch, the company lineup on the Products
// floor ("Apply rates to all branches"), and the company risk appetite.
// While Apply-to-all is on, HQ owns every branch's prices and lineup.
import { CITIES } from '../../data/cities';
import type { ProductSpec } from '../../data/products';
import type { CountryId } from '../../data/types';
import { isOffered } from '../branch/pricing';
import { allProducts, productSpec } from '../products';
import { clamp, roundToStep } from '../math';
import { countryOfCity, defaultPrice } from '../rates';
import type { Branch, GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

/** A branch's offer slot for a product, created at the default price if missing. */
function slotOf(state: GameState, branch: Branch, spec: ProductSpec) {
  return (branch.offered[spec.id] ??= {
    on: false,
    price: roundToStep(defaultPrice(spec, countryOfCity(state, branch.cityId)), spec.step),
  });
}

export function setOffered(
  state: GameState,
  branchId: string,
  productId: string,
  on: boolean,
): CommandResult {
  const branch = state.branches[branchId];
  const spec = productSpec(state, productId);
  if (!branch) return fail('That sales office no longer exists.');
  if (!spec) return fail('Unknown product.');
  if (state.company.applyRatesToAll) return fail('Set at HQ.');
  if (branch.delegation.products)
    return fail('Your manager sets products here. Turn off Products & rates delegation first.');
  slotOf(state, branch, spec).on = on;
  return ok();
}

export function setPrice(
  state: GameState,
  branchId: string,
  productId: string,
  price: number,
): CommandResult<{ price: number }> {
  const branch = state.branches[branchId];
  const spec = productSpec(state, productId);
  if (!branch) return fail('That sales office no longer exists.');
  if (!spec) return fail('Unknown product.');
  if (state.company.applyRatesToAll) return fail('Set at HQ.');
  if (branch.delegation.products)
    return fail('Your manager sets prices here. Turn off Products & rates delegation first.');
  if (!Number.isFinite(price)) return fail('Enter a number.');
  const p = clamp(roundToStep(price, spec.step), spec.min, spec.max);
  slotOf(state, branch, spec).price = p;
  return ok({ price: p });
}

const openBranches = (state: GameState) =>
  Object.values(state.branches).filter((b) => b.status !== 'closed');

/**
 * "Apply rates to all branches". Turning it on seeds HQ prices and the HQ
 * lineup from your first branch (defaults if you have none) and applies the
 * lineup everywhere; branch managers stop setting products and rates. Turning
 * it off hands each branch back its own rate sheet.
 */
export function setApplyRatesToAll(state: GameState, on: boolean): CommandResult {
  const c = state.company;
  if (c.applyRatesToAll === on) return ok();
  c.applyRatesToAll = on;
  if (!on) return ok();
  const branches = openBranches(state);
  const first = branches[0];
  const lineup = (c.companyOffered ??= {});
  if (first) for (const spec of allProducts(state)) lineup[spec.id] = isOffered(first, spec.id);
  // Each country's list starts from its first branch's rate sheet (defaults if none).
  const countries = new Set<CountryId>([CITIES[state.meta.homeCityId]!.country]);
  for (const b of branches) countries.add(CITIES[b.cityId]!.country);
  for (const country of countries) {
    const ref = branches.find((b) => CITIES[b.cityId]?.country === country);
    seedCountryPrices(state, country, ref);
  }
  for (const branch of openBranches(state)) {
    for (const [pid, value] of Object.entries(lineup)) {
      const spec = productSpec(state, pid);
      if (spec) slotOf(state, branch, spec).on = value;
    }
  }
  return ok();
}

/**
 * A country's HQ price list, from a reference branch's rate sheet or the
 * country's default prices. Replaces any list the country had.
 */
export function seedCountryPrices(state: GameState, country: CountryId, ref?: Branch): void {
  const c = state.world.countries[country];
  if (!c) return;
  const list: Record<string, number> = {};
  for (const spec of allProducts(state)) {
    list[spec.id] = ref?.offered[spec.id]?.price ?? roundToStep(defaultPrice(spec, c), spec.step);
  }
  state.company.companyPrices[country] = list;
}

/**
 * HQ price for a product in one country (the home country by default), used at
 * every branch there while Apply-to-all is on.
 */
export function setCompanyPrice(
  state: GameState,
  productId: string,
  price: number,
  country: CountryId = CITIES[state.meta.homeCityId]!.country,
): CommandResult<{ price: number }> {
  const spec = productSpec(state, productId);
  if (!spec) return fail('Unknown product.');
  if (!state.company.applyRatesToAll)
    return fail('Turn on "Apply rates to all sales offices" to set HQ prices.');
  if (!state.world.countries[country]) return fail('Unknown country.');
  if (!Number.isFinite(price)) return fail('Enter a number.');
  const p = clamp(roundToStep(price, spec.step), spec.min, spec.max);
  if (!state.company.companyPrices[country]) {
    // A country without a list yet starts from its first branch's sheet, as Apply-to-all does.
    const ref = openBranches(state).find((b) => CITIES[b.cityId]?.country === country);
    seedCountryPrices(state, country, ref);
  }
  state.company.companyPrices[country]![productId] = p;
  return ok({ price: p });
}

/**
 * Offers or withdraws a product company-wide, and new branches follow this
 * lineup. With Apply-to-all on it reaches every branch; otherwise branches
 * whose manager runs Products & rates keep choosing for themselves.
 */
export function setCompanyOffered(state: GameState, productId: string, on: boolean): CommandResult {
  const spec = productSpec(state, productId);
  if (!spec) return fail('Unknown product.');
  (state.company.companyOffered ??= {})[productId] = on;
  for (const branch of openBranches(state)) {
    if (branch.delegation.products && !state.company.applyRatesToAll) continue;
    slotOf(state, branch, spec).on = on;
  }
  return ok();
}

export function setRiskAppetite(state: GameState, level: number): CommandResult {
  if (![1, 2, 3, 4, 5].includes(level)) return fail('Risk appetite runs from 1 to 5.');
  state.company.riskAppetite = level as 1 | 2 | 3 | 4 | 5;
  return ok();
}
