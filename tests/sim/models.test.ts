// Underwriting models (SIMULATION §16.7) and the company lineup: custom model
// radar and cost, bureau hosting, the Internal History gate, the two-week
// switching blend, and Apply-to-all pricing.
import { describe, expect, it } from 'vitest';
import * as cmd from '../../src/sim/commands';
import { branchPrice } from '../../src/sim/branch/pricing';
import {
  activeModel,
  appCost,
  customFigures,
  previewModel,
  updateModels,
} from '../../src/sim/underwriting';
import { advanceWeeks } from '../../src/sim/engine';
import { checksum, exportCode, importCode, serialize } from '../../src/sim/save/serialize';
import { gameWithFloors } from '../helpers/productsFloor';

const MIX = { bureau: 0.5, cashflow: 0.5 };

describe('custom models', () => {
  it('computes radar = Σ w × profile × qualityMult and cost = Σ w × cost', () => {
    const { s } = gameWithFloors(['products']);
    // qualityMult = 0.9 + 0.2 × 1 × 80/100 = 1.06
    const f = customFigures(s, MIX, 'custom');
    expect(f.radar[0]).toBeCloseTo(7 * 1.06, 12);
    expect(f.radar[1]).toBeCloseTo(6.5 * 1.06, 12);
    expect(f.costPerApp).toBeCloseTo(1.8, 12);
    const hosted = customFigures(s, MIX, 'hosted');
    expect(hosted.radar[0]).toBeCloseTo(7 * 0.95, 12);
    expect(hosted.costPerApp).toBeCloseTo(1.8 * 1.15, 12);
    const p = previewModel(s, { bureau: 50, cashflow: 50 }, 'custom');
    expect(p.radar[0]).toBeCloseTo(7 * 1.06, 12);
    expect(p.problem).toBe('The data inputs must add up to 100%.');
    expect(previewModel(s, MIX, 'custom').problem).toBeNull();
  });

  it('gates Internal History on loans booked and grows its accuracy', () => {
    const { s } = gameWithFloors(['products']);
    const mix = { internal: 1 };
    expect(cmd.saveCustomModel(s, { name: 'Home grown', mix })).toEqual({
      ok: false,
      reason: 'Internal History needs 5,000 loans booked first.',
    });
    s.underwriting.loansBooked = 10_000;
    const r = cmd.saveCustomModel(s, { name: 'Home grown', mix });
    if (!r.ok) throw new Error(r.reason);
    // accuracy = 4 + min(5, 10,000 / 20,000 × 5) = 6.5, × qualityMult 1.06
    expect(s.underwriting.models[r.modelId]!.radar[0]).toBeCloseTo(6.5 * 1.06, 12);
    s.underwriting.loansBooked = 40_000;
    updateModels(s);
    expect(s.underwriting.models[r.modelId]!.radar[0]).toBeCloseTo(9 * 1.06, 12);
  });

  it('blends the old and new model linearly over the two-week switch', () => {
    const { s } = gameWithFloors(['products']);
    const old = activeModel(s);
    const r = cmd.saveCustomModel(s, { name: 'Blend', mix: MIX });
    if (!r.ok) throw new Error(r.reason);
    const next = s.underwriting.models[r.modelId]!;
    expect(cmd.activateModel(s, r.modelId).ok).toBe(true);
    const at = (w: number) => old.radar[0] * w + next.radar[0] * (1 - w);
    expect(activeModel(s).radar[0]).toBeCloseTo(at(2 / 3), 12);
    expect(activeModel(s).costPerApp).toBeCloseTo((1.2 * 2) / 3 + 1.8 / 3, 12);
    updateModels(s);
    expect(activeModel(s).radar[0]).toBeCloseTo(at(1 / 3), 12);
    updateModels(s);
    expect(s.underwriting.switching).toBeUndefined();
    expect(activeModel(s).radar[0]).toBeCloseTo(next.radar[0], 12);
    expect(appCost(s)).toBeCloseTo(1.8, 12);
    expect(cmd.activateModel(s, r.modelId).ok).toBe(false);
  });

  it('validates model commands', () => {
    const { s } = gameWithFloors([]);
    expect(cmd.saveCustomModel(s, { name: 'X', mix: MIX })).toEqual({
      ok: false,
      reason: 'Custom models need a Products floor at HQ.',
    });
    // Calgary hosts Northscore only.
    expect(cmd.buyBureauModel(s, 'clearline_premium')).toEqual({
      ok: false,
      reason: 'Clearline has no office in this city.',
    });
    expect(cmd.buyBureauModel(s, 'northscore_inclusion')).toEqual({
      ok: true,
      modelId: 'northscore_inclusion',
    });
    expect(s.underwriting.switching).toEqual({ fromId: 'clearline_basic', weeksLeft: 2 });
    expect(cmd.commissionBureauModel(s, { bureau: 'TrueMark', name: 'T', mix: MIX }).ok).toBe(
      false,
    );
    expect(
      cmd.commissionBureauModel(s, { bureau: 'Northscore', name: 'N', mix: { bureau: 0.4 } }).ok,
    ).toBe(false);
    const r = cmd.commissionBureauModel(s, { bureau: 'Northscore', name: 'My mix', mix: MIX });
    if (!r.ok) throw new Error(r.reason);
    const m = s.underwriting.models[r.modelId]!;
    expect(m.hostedBy).toBe('Northscore');
    expect(m.costPerApp).toBeCloseTo(1.8 * 1.15, 12);
    expect(s.underwriting.activeModelId).toBe(r.modelId);
  });
});

describe('company lineup', () => {
  it('applies HQ prices and lineup to every branch while Apply-to-all is on', () => {
    const { s, branchId } = gameWithFloors([]);
    const branch = s.branches[branchId]!;
    expect(cmd.setCompanyPrice(s, 'savings', 0.03).ok).toBe(false);
    const own = branch.offered.savings!.price;
    expect(cmd.setApplyRatesToAll(s, true).ok).toBe(true);
    expect(s.company.companyPrices.CA!.savings).toBe(own);
    expect(cmd.setCompanyPrice(s, 'savings', 0.0312)).toEqual({ ok: true, price: 0.031 });
    expect(branchPrice(s, branch, 'savings')).toBe(0.031);
    expect(cmd.setOffered(s, branchId, 'mortgage', true)).toEqual({
      ok: false,
      reason: 'Set at HQ.',
    });
    expect(cmd.setCompanyOffered(s, 'mortgage', true).ok).toBe(true);
    expect(branch.offered.mortgage!.on).toBe(true);
    expect(s.company.companyOffered!.mortgage).toBe(true);
    expect(cmd.setApplyRatesToAll(s, false).ok).toBe(true);
    expect(branchPrice(s, branch, 'savings')).toBe(own);
  });
});

describe('Products floor saves', () => {
  it('round-trips developments, developed products and custom models', () => {
    const { s, branchId } = gameWithFloors(['products', 'it']);
    const input = { name: 'Silver', templateId: 'senior_saver', tier: 'low' as const };
    expect(cmd.startDevelopment(s, { ...input, weeks: 4, weeklyBudget: 5_000 }).ok).toBe(true);
    expect(cmd.startDevelopment(s, { ...input, weeks: 48, weeklyBudget: 9_000 }).ok).toBe(true);
    advanceWeeks(s, 4);
    const id = Object.values(s.products.catalog).find((e) => e.developed)!.id;
    expect(cmd.setOffered(s, branchId, id, true).ok).toBe(true);
    const r = cmd.saveCustomModel(s, { name: 'Mine', mix: MIX });
    if (!r.ok) throw new Error(r.reason);
    expect(cmd.activateModel(s, r.modelId).ok).toBe(true);
    advanceWeeks(s, 1);
    const back = importCode(exportCode(s));
    expect(back).toEqual(s);
    advanceWeeks(back, 6);
    advanceWeeks(s, 6);
    expect(checksum(serialize(back))).toBe(checksum(serialize(s)));
  });
});
