// Product development (SIMULATION §16.6): the odds table against the doc's
// reference numbers, a development completing into a working product, digital
// projects, deleting a developed product, and command validation.
import { describe, expect, it } from 'vitest';
import { companyArr } from '../../src/sim/arr';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { budgetScore, devOdds, devScore, starOdds } from '../../src/sim/development';
import { normalCdf } from '../../src/sim/detmath';
import { PRODUCTS } from '../../src/data/products';
import { AFFINITY } from '../../src/data/segments';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { allProducts, developedSpec, productSpec } from '../../src/sim/products';
import { marketRef } from '../../src/sim/rates';
import type { GameState } from '../../src/sim/state';
import { activeModel, RADAR } from '../../src/sim/underwriting';
import { gameWithFloors } from '../helpers/productsFloor';

const devInput = {
  name: 'Silver Plan',
  templateId: 'golden_years',
  tier: 'medium' as const,
  weeks: 4,
  weeklyBudget: 5_000,
};

function developed(s: GameState) {
  return Object.values(s.products.catalog).filter((e) => e.developed);
}

describe('development odds', () => {
  it('matches the normal CDF', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 14);
    expect(normalCdf(1.959963984540054)).toBeCloseTo(0.975, 12);
    expect(normalCdf(-3.5)).toBeCloseTo(0.000232629, 8);
  });

  it('gives about 27/42/26/5/0 at D = 0.10', () => {
    const odds = starOdds(0.1);
    [0.27, 0.42, 0.26, 0.05, 0].forEach((ref, i) =>
      expect(Math.abs(odds[i]! - ref)).toBeLessThan(0.01),
    );
  });

  it('gives 3★ ≈ 14%, 4★ ≈ 39%, 5★ ≈ 45% at D = 1', () => {
    const odds = starOdds(1);
    expect(odds[2]).toBeCloseTo(0.14, 2);
    expect(odds[3]).toBeCloseTo(0.39, 2);
    expect(odds[4]).toBeCloseTo(0.45, 2);
    expect(odds.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('scores budget on a log scale and uses team 0.5 without a Products floor', () => {
    expect(budgetScore(5_000)).toBe(0);
    expect(budgetScore(50_000)).toBeCloseTo(0.5, 12);
    expect(budgetScore(500_000)).toBeCloseTo(1, 12);
    expect(budgetScore(5_000_000)).toBe(1);
    const s = newGame({ seed: 1, cityId: 'cal' });
    // 4 weeks at $5k/week: the reference case, D = 0.10.
    expect(devScore(s, 4, 5_000)).toBeCloseTo(0.1, 12);
    expect(devOdds(s, 48, 500_000)[4]).toBeGreaterThan(0.3);
  });
});

describe('developments', () => {
  it('completes into a product that takes accounts once offered', () => {
    const { s, branchId } = gameWithFloors(['products']);
    const r = cmd.startDevelopment(s, devInput);
    expect(r.ok).toBe(true);
    expect(s.products.developments).toHaveLength(1);
    advanceWeeks(s, 3);
    expect(developed(s)).toHaveLength(0);
    advanceWeeks(s, 1);
    expect(s.products.developments).toHaveLength(0);
    const [entry] = developed(s);
    expect(entry).toBeDefined();
    expect(entry!.stars).toBeGreaterThanOrEqual(1);
    expect(entry!.stars).toBeLessThanOrEqual(5);
    expect(entry!.base).toBe('plus');
    const spent = s.history.weekly.reduce((sum, w) => sum + w.pnl.development, 0);
    expect(spent).toBeCloseTo(20_000, 6);
    expect(s.events.log.some((e) => e.type === 'PRODUCT_DEVELOPED')).toBe(true);

    const id = entry!.id;
    const branch = s.branches[branchId]!;
    expect(branch.offered[id]).toEqual({ on: false, price: expect.any(Number) });
    expect(allProducts(s).map((p) => p.id)).toContain(id);
    expect(cmd.setOffered(s, branchId, id, true).ok).toBe(true);
    advanceWeeks(s, 8);
    const book = branch.books[id]!;
    expect(book.accounts).toBeGreaterThan(0);
    expect(book.balance).toBeGreaterThan(0);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);

    // Deleting it moves its customers (and their ARR) onto Plus.
    const arr = companyArr(s);
    const plus = branch.books.plus!.accounts;
    const accounts = book.accounts;
    expect(cmd.deleteProduct(s, id).ok).toBe(true);
    expect(s.products.catalog[id]).toBeUndefined();
    expect(branch.books[id]).toBeUndefined();
    expect(branch.offered[id]).toBeUndefined();
    expect(branch.books.plus!.accounts).toBeCloseTo(plus + accounts, 6);
    expect(companyArr(s)).toBeCloseTo(arr, 4);
    expect(cmd.deleteProduct(s, 'plus')).toEqual({
      ok: false,
      reason: 'Only products you developed can be deleted.',
    });
    expect(cmd.deleteProduct(s, id).ok).toBe(false);
  });

  it('builds the spec from the base, template and tier', () => {
    const { s } = gameWithFloors([]);
    const spec = developedSpec({
      id: 'dev_x',
      stars: 4,
      developed: true,
      name: 'Gold Plan',
      base: 'plus',
      templateId: 'golden_years',
      tier: 'premium',
    })!;
    // Plus's RET affinity + 0.15; the template's $12 fee × the Premium 1.25.
    expect(spec.affinity!.RET).toBeCloseTo(AFFINITY.plus!.RET + 0.15, 12);
    expect(spec.defaultRule).toEqual({ base: 'fixed', value: 12 * 1.25 });
    expect(spec.productsBump).toBeCloseTo(0.05, 12);
    s.products.catalog.dev_r = {
      id: 'dev_r',
      stars: 3,
      developed: true,
      name: 'Dedicated',
      base: 'api',
      templateId: 'dedicated_capacity',
      tier: 'medium',
    };
    const dedicated = productSpec(s, 'dev_r')!;
    expect(dedicated.kind).toBe('usage');
    expect(dedicated.ticket).toBeCloseTo(PRODUCTS.api!.ticket * 4, 6);
    expect(dedicated.churn).toBeCloseTo(PRODUCTS.api!.churn * 0.5, 12);
    s.products.catalog.dev_t = {
      id: 'dev_t',
      stars: 3,
      developed: true,
      name: 'Realtime',
      base: 'api',
      templateId: 'realtime_api',
      tier: 'medium',
    };
    // A $6 template on a $3 base competes against a market reference twice as high.
    const cityId = s.world.currentCityId;
    expect(marketRef(s, cityId, 'dev_t')).toBeCloseTo(marketRef(s, cityId, 'api') * 2, 12);
  });

  it('runs digital projects once, needing an IT floor', () => {
    const noIt = gameWithFloors(['products']).s;
    const mobile = { ...devInput, name: '', templateId: 'mobile_app_v2' };
    expect(cmd.startDevelopment(noIt, mobile)).toEqual({
      ok: false,
      reason: 'Digital projects need an IT floor at HQ.',
    });
    const { s } = gameWithFloors(['products', 'it']);
    expect(cmd.startDevelopment(s, mobile).ok).toBe(true);
    expect(cmd.startDevelopment(s, mobile).ok).toBe(false);
    expect(cmd.startDevelopment(s, { ...mobile, templateId: 'instant_decisions' }).ok).toBe(true);
    const speedBefore = activeModel(s).radar[RADAR.speed];
    advanceWeeks(s, 4);
    expect(s.products.digitalDone).toEqual(['mobile_app_v2', 'instant_decisions']);
    expect(developed(s)).toHaveLength(0);
    expect(activeModel(s).radar[RADAR.speed]).toBe(speedBefore + 2);
    expect(cmd.startDevelopment(s, mobile)).toEqual({
      ok: false,
      reason: 'Mobile App 2.0 is already done.',
    });
  });

  it('validates and cancels developments', () => {
    const bare = gameWithFloors([]).s;
    expect(cmd.startDevelopment(bare, devInput)).toEqual({
      ok: false,
      reason: 'Product development needs a Products floor at HQ.',
    });
    const { s } = gameWithFloors(['products']);
    expect(cmd.startDevelopment(s, { ...devInput, weeklyBudget: 4_000 }).ok).toBe(false);
    expect(cmd.startDevelopment(s, { ...devInput, weeks: 5 }).ok).toBe(false);
    expect(cmd.startDevelopment(s, { ...devInput, name: '  ' })).toEqual({
      ok: false,
      reason: 'Give the product a name.',
    });
    expect(cmd.startDevelopment(s, { ...devInput, templateId: 'nope' }).ok).toBe(false);
    const r = cmd.startDevelopment(s, { ...devInput, weeks: 12, weeklyBudget: 20_400 });
    if (!r.ok) throw new Error(r.reason);
    expect(s.products.developments[0]!.weeklyBudget).toBe(20_000);
    advanceWeeks(s, 2);
    expect(cmd.cancelDevelopment(s, r.developmentId).ok).toBe(true);
    expect(s.products.developments).toHaveLength(0);
    expect(cmd.cancelDevelopment(s, r.developmentId).ok).toBe(false);
  });
});
