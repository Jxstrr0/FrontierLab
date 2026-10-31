// Save migration 7 → 8 (stage C3c): a save holding foreclosed property, government
// bonds with an unrealised gain and a covered bond lot sells the property into
// cash and the bonds into reserves without moving equity, then plays on.
import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { legacyTreasury, type LegacyTreasury } from '../../src/sim/save/legacyTreasury';
import { migrate, migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

/** A schema-7 save: today's state with REO, bonds and a covered bond put back as asset swaps. */
function oldSave(): GameState {
  const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Old Lab' });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 8);
  const raw = s as unknown as Record<string, unknown>;
  // 300K of cash became foreclosed homes; 1M of reserves bought bonds now worth 1.05M.
  raw.reo = { cal: { units: 2, value: 300_000, mode: 'rent', hpiRef: 1 } };
  s.company.cash -= 300_000;
  const t = legacyTreasury(s);
  t.reserves -= 1_000_000;
  Object.assign(t, {
    bondsMarket: 1_050_000,
    bondsBook: 1_000_000,
    bondBookYield: 0.04,
    bondShare: 0.3,
  });
  t.lots.push({
    id: 'fl_old',
    type: 'covered_bond',
    counterparty: 'Meridian Treasury',
    amount: 0,
    rate: 0.05,
    startWeek: 0,
    maturityWeek: 400,
  });
  return s;
}

describe('save migration 7 → 8 (C3c)', () => {
  it('sells the bonds into reserves and turns covered bonds into term lots', () => {
    const s = structuredClone(oldSave());
    const reserves = legacyTreasury(s).reserves;
    migrations[7]!(s as never);
    const t = legacyTreasury(s) as LegacyTreasury & Record<string, unknown>;
    expect(t.reserves).toBeCloseTo(reserves + 1_050_000);
    expect('bondsMarket' in t).toBe(false);
    expect('bondShare' in t).toBe(false);
    expect(t.lots.find((l) => l.id === 'fl_old')!.type).toBe('term_interbank');
  });

  it('sells REO into cash at unchanged equity, and the reserves reach cash by schema 38', () => {
    const s = oldSave();
    const cash = s.company.cash;
    const reserves = legacyTreasury(s).reserves;
    const retained = s.company.retainedEarnings;
    const raw = { ...(structuredClone(s) as object), schemaVersion: 7 } as never;
    const m = migrate(raw) as unknown as GameState;
    expect(m.company.cash).toBeCloseTo(cash + 300_000 + reserves + 1_050_000);
    expect(m.company.retainedEarnings).toBeCloseTo(retained + 50_000);
    expect('reo' in m).toBe(false);
    expect('treasury' in m).toBe(false);
    expect(identityGap(m)).toBeLessThan(1);
    advanceWeeks(m, 4);
    expect(identityGap(m)).toBeLessThan(1);
  });
});
