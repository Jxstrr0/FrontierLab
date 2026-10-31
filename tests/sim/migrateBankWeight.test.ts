// Save migration 37 → 38 (cleanup batch): a save still holding the bank
// treasury, its dead P&L lines and the bank-only fields folds the treasury
// into corporate cash at unchanged equity, drops the rest, then plays on and
// round-trips like any other save.
import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

/** A schema-37 save: today's state with the bank-era fields put back. */
function oldSave(): { raw: Record<string, unknown> & { schemaVersion: number }; s: GameState } {
  const s = newGame({ seed: 37, cityId: 'cal', bankName: 'Old Lab' });
  const branchId = openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 6);
  const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & { schemaVersion: number };
  raw.schemaVersion = 37;
  const old = raw as unknown as GameState & Record<string, unknown>;
  // 3M of reserves against 0.8M still owed: 2.2M of equity the old balance sheet counted.
  raw.treasury = {
    reserves: 3_000_000,
    liqTarget: 0.15,
    autoFunding: true,
    freeze: false,
    overnight: 200_000,
    window: 100_000,
    windowStigmaWeeks: 2,
    lots: [{ id: 'fl_1', type: 'term_interbank', amount: 500_000, rate: 0.05 }],
    offers: [{ id: 'fo_1', type: 'term_interbank' }],
    offersRefreshWeek: 4,
  };
  old.company.retainedEarnings += 2_200_000;
  (old.company as unknown as Record<string, unknown>).liquidityRatio = null;
  (old.risk as unknown as Record<string, unknown>).losses = [];
  const pnl = old.ledger.pnl as unknown as Record<string, number>;
  pnl.wholesaleInterest = 1_000;
  pnl.reserveInterest = 400;
  pnl.realizedGains = 0;
  old.company.cash += 400 - 1_000; // both were paid in cash this week
  const week = old.history.weekly.at(-1)! as unknown as Record<string, unknown>;
  week.netRevenue = 1;
  (week.totals as Record<string, number>).deposits = 0;
  (week.totals as Record<string, number>).liquid = 3_000_000;
  (week.pnl as Record<string, number>).depositInterest = 0;
  const row = old.branches[branchId]!.pnl.at(-1)!;
  (row.lines as unknown as Record<string, number>).losses = 0;
  for (const r of Object.values(old.rivals))
    (r as unknown as Record<string, unknown>).priceLags = {};
  for (const c of Object.values(old.world.countries))
    Object.assign(c!, {
      prevFtpShort: 0.03,
      prevFtpLong: 0.04,
      cardAnchor: 0.03,
      startPolicy: 0.03,
    });
  old.rng.funding = [1, 2, 3, 4];
  Object.assign(old.meta, { saveName: 'Old Lab' });
  Object.assign(old.world.travel, { faresPaid: 0, totalKm: 0 });
  Object.assign(old.market, { shock: 0 });
  return { raw, s };
}

describe('save migration 37 → 38 (bank cleanup)', () => {
  it('folds the treasury into cash at unchanged equity and drops the bank fields', () => {
    const { raw, s } = oldSave();
    const cash = s.company.cash;
    const corporateInterest = s.ledger.pnl.corporateInterest;
    const ventureDebtInterest = s.ledger.pnl.ventureDebtInterest;
    const m = migrate(raw) as unknown as GameState;
    expect(m.schemaVersion).toBe(SCHEMA_VERSION);
    expect(m.company.cash).toBeCloseTo(cash - 600 + 3_000_000 - 800_000, 2);
    expect(identityGap(m)).toBeLessThan(1);
    expect('treasury' in m).toBe(false);
    expect('liquidityRatio' in m.company).toBe(false);
    expect('losses' in m.risk).toBe(false);
    expect(m.rng.funding).toBeUndefined();
    // Dead lines fold into their replacements, so net income is unchanged.
    const pnl = m.ledger.pnl as unknown as Record<string, number>;
    expect(pnl.corporateInterest).toBeCloseTo(corporateInterest + 1_000);
    expect(pnl.ventureDebtInterest).toBeCloseTo(ventureDebtInterest + 400);
    for (const k of ['wholesaleInterest', 'reserveInterest', 'realizedGains'])
      expect(k in pnl).toBe(false);
    const week = m.history.weekly.at(-1)! as unknown as Record<string, unknown>;
    expect('netRevenue' in week).toBe(false);
    expect('liquid' in (week.totals as object)).toBe(false);
    expect('depositInterest' in (week.pnl as object)).toBe(false);
    for (const b of Object.values(m.branches))
      for (const r of b.pnl) expect('losses' in r.lines).toBe(false);
    for (const r of Object.values(m.rivals)) expect('priceLags' in r).toBe(false);
    for (const c of Object.values(m.world.countries)) expect('cardAnchor' in c!).toBe(false);
    expect('saveName' in m.meta).toBe(false);
    expect('faresPaid' in m.world.travel).toBe(false);
    expect('shock' in m.market).toBe(false);
  });

  it('plays on with the books balanced and round-trips the save', () => {
    const m = migrate(oldSave().raw) as unknown as GameState;
    advanceWeeks(m, 4);
    expect(identityGap(m)).toBeLessThan(1);
    expect(importCode(exportCode(m))).toEqual(m);
  });
});
