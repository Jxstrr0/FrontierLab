// Product and pricing commands at a branch, plus the company risk appetite.
import { PRODUCTS } from '../../data/products';
import { clamp, roundToStep } from '../math';
import type { GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

export function setOffered(
  state: GameState,
  branchId: string,
  productId: string,
  on: boolean,
): CommandResult {
  const branch = state.branches[branchId];
  const spec = PRODUCTS[productId];
  if (!branch) return fail('That branch no longer exists.');
  if (!spec) return fail('Unknown product.');
  if (branch.delegation.products)
    return fail('Your manager sets products here. Turn off Products & rates delegation first.');
  const slot = (branch.offered[productId] ??= { on: false, price: spec.min });
  slot.on = on;
  return ok();
}

export function setPrice(
  state: GameState,
  branchId: string,
  productId: string,
  price: number,
): CommandResult<{ price: number }> {
  const branch = state.branches[branchId];
  const spec = PRODUCTS[productId];
  if (!branch) return fail('That branch no longer exists.');
  if (!spec) return fail('Unknown product.');
  if (state.company.applyRatesToAll) return fail('Set at HQ.');
  if (branch.delegation.products)
    return fail('Your manager sets prices here. Turn off Products & rates delegation first.');
  if (!Number.isFinite(price)) return fail('Enter a number.');
  const p = clamp(roundToStep(price, spec.step), spec.min, spec.max);
  const slot = (branch.offered[productId] ??= { on: false, price: p });
  slot.price = p;
  return ok({ price: p });
}

export function setRiskAppetite(state: GameState, level: number): CommandResult {
  if (![1, 2, 3, 4, 5].includes(level)) return fail('Risk appetite runs from 1 to 5.');
  state.company.riskAppetite = level as 1 | 2 | 3 | 4 | 5;
  return ok();
}
