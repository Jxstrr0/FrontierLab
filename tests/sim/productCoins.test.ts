// Product coins from the model's radar (SIMULATION §8, audit batch D).
import { describe, expect, it } from 'vitest';
import { MODEL_COINS } from '../../src/config/balance';
import { allProducts, starsOf } from '../../src/sim/products';
import { coinsOf, modelCoinLift } from '../../src/sim/productCoins';
import { activeModel } from '../../src/sim/underwriting';
import { bankWithFloors } from '../helpers/scenario';

describe('product coins follow the model', () => {
  it('a better radar lifts every product by perPoint per point, clamped to 1–5', () => {
    const s = bankWithFloors([]);
    const spec = allProducts(s)[0]!;
    const before = modelCoinLift(s);
    const m = activeModel(s);
    m.radar = m.radar.map((v) => v + 1) as typeof m.radar;
    const after = modelCoinLift(s);
    expect(after - before).toBeCloseTo(MODEL_COINS.perPoint, 6);
    const coins = coinsOf(s, spec);
    expect(coins).toBeCloseTo(Math.min(5, Math.max(1, starsOf(s, spec) + after)), 6);
  });

  it('never leaves the 1–5 scale', () => {
    const s = bankWithFloors([]);
    const m = activeModel(s);
    const spec = allProducts(s)[0]!;
    m.radar = m.radar.map(() => 10) as typeof m.radar;
    expect(coinsOf(s, spec)).toBeLessThanOrEqual(5);
    m.radar = m.radar.map(() => 0) as typeof m.radar;
    expect(coinsOf(s, spec)).toBeGreaterThanOrEqual(1);
  });
});
