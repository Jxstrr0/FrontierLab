// What the AI model does (stage C6a, SIMULATION §16.7): Efficiency scales the
// compute behind each customer, quality lifts price headroom, the Model rating
// and contract chances, Safety counts with data-sensitive businesses, data
// licences are charged per customer, and the 13 → 14 save migration.
import { describe, expect, it } from 'vitest';
import { MODEL_EFFECTS } from '../../src/config/balance';
import { winChance } from '../../src/sim/branch/dealDesk';
import { campaignEffects } from '../../src/sim/branch/marketing';
import { productsTarget } from '../../src/sim/branch/ratings';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { Pentagon } from '../../src/data/types';
import type { GameState } from '../../src/sim/state';
import {
  activeModel,
  inferenceMult,
  modelDealEdge,
  modelQuality,
  priceHeadroom,
} from '../../src/sim/underwriting';
import { dealGame, lotBusinesses, setRivals } from '../helpers/deals';
import { openScriptedBranch } from '../helpers/scenario';

/** Sets the house model's radar (no switch is running at the start). */
function setRadar(s: GameState, radar: Pentagon): void {
  s.underwriting.models[s.underwriting.activeModelId]!.radar = radar;
}

describe('the starting model', () => {
  it('is the neutral point: ×1 compute, prices at market, no contract edge', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(activeModel(s).radar).toEqual([6, 8, 4, 4, 7]);
    expect(modelQuality(activeModel(s))).toBeCloseTo(MODEL_EFFECTS.qualityRef, 12);
    expect(inferenceMult(s)).toBe(1);
    expect(priceHeadroom(s)).toBeCloseTo(1, 12);
  });
});

describe('Efficiency', () => {
  it('saves 5% of compute per point above 7', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    setRadar(s, [6, 8, 4, 4, 9]);
    expect(inferenceMult(s)).toBeCloseTo(0.9, 12);
    setRadar(s, [6, 8, 4, 4, 3]);
    expect(inferenceMult(s)).toBeCloseTo(1.2, 12);
  });

  it('cuts the compute an office pays for', () => {
    const run = (eff: number) => {
      const s = newGame({ seed: 42, cityId: 'cal' });
      openScriptedBranch(s, 'midtown');
      setRadar(s, [6, 8, 4, 4, eff]);
      advanceWeeks(s, 20);
      return s.history.weekly.at(-1)!.pnl;
    };
    const base = run(7);
    const lean = run(10);
    expect(lean.compute).toBeLessThan(base.compute * 0.9);
  });
});

describe('model quality', () => {
  it('lifts price headroom 4% a point', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    setRadar(s, [8, 8, 6, 6, 8]); // quality 7.2
    expect(priceHeadroom(s)).toBeCloseTo(1 + 0.04 * (7.2 - 5.8), 12);
    setRadar(s, [4, 4, 4, 4, 4]); // quality 4: prices must sit 7.2% under market
    expect(priceHeadroom(s)).toBeCloseTo(1 - 0.04 * 1.8, 12);
  });

  it('lifts the Model rating', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    const branch = s.branches[id]!;
    const fx = campaignEffects(s, branch);
    const before = productsTarget(s, branch, fx);
    setRadar(s, [9, 9, 8, 8, 9]);
    expect(productsTarget(s, branch, fx)).toBeGreaterThan(before + 0.25);
  });

  it('wins contracts: +0.05 a point, and Safety counts with sensitive data', () => {
    const { s, id } = dealGame();
    setRivals(s);
    const branch = s.branches[id]!;
    const b = lotBusinesses(s)[0]!;
    delete b.vendor;
    b.pentagon[2] = 5;
    const base = winChance(s, branch, b, 0);
    setRadar(s, [7, 9, 5, 4, 8]); // quality 6.6, Safety 4
    expect(modelDealEdge(s, b)).toBeCloseTo(0.05 * 0.8, 12);
    expect(winChance(s, branch, b, 0)).toBeCloseTo(base + 0.04, 12);
    b.pentagon[2] = 10; // very sensitive data: Safety 4 now costs 0.03 × −1 × 5 / 5
    expect(modelDealEdge(s, b)).toBeCloseTo(0.04 - 0.03, 12);
    setRadar(s, [7, 9, 5, 9, 3]); // same quality, Safety 9
    expect(modelDealEdge(s, b)).toBeCloseTo(0.04 + 0.03 * 4, 12);
  });
});

describe('data licences', () => {
  it('are charged each week per customer', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 20);
    const pnl = s.history.weekly.at(-1)!.pnl;
    expect(pnl.underwriting).toBeGreaterThan(0);
  });
});

describe('save migration 13 → 14', () => {
  it('turns cost per application into licence per customer and renames packages', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const m = s.underwriting.models.clearline_basic! as unknown as Record<string, unknown>;
    delete m.costPerCustomer;
    m.costPerApp = 1.2;
    m.name = 'Clearline Basic Score';
    migrations[13]!(s as never);
    const after = s.underwriting.models.clearline_basic!;
    expect(after.costPerCustomer).toBeCloseTo(12, 12);
    expect(after.name).toBe('Clearline Web Base');
    expect('costPerApp' in after).toBe(false);
  });
});
