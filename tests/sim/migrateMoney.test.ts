// Save migration 6 → 7 (stage C3b): a save with bank-style office P&L rows, no
// compute line and central bank funding behind its Loan Desk loans moves onto
// the AI lines and repays the borrowing without moving equity, then plays on.
import { describe, expect, it } from 'vitest';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { legacyTreasury } from '../../src/sim/save/legacyTreasury';
import { migrate, migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

/** A schema-6 save: today's state with the old line shapes put back. */
function oldSave(): { s: GameState; branchId: string } {
  const s = newGame({ seed: 6, cityId: 'cal', bankName: 'Old Lab' });
  const branchId = openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 12);
  const b = s.branches[branchId]!;
  b.pnl = [
    {
      week: s.clock.week,
      revenue: 9_000,
      income: 1_000,
      lines: {
        loanInterest: 2_000,
        fundingCredit: 1_000,
        fees: 5_000,
        wealthServices: 1_000,
        depositInterest: 300,
        fundingCharge: 700,
        losses: 100,
        staff: 4_000,
        manager: 1_000,
        rent: 900,
        marketing: 500,
        equipment: 200,
        servicing: 100,
        overhead: 200,
      },
    } as never,
  ];
  const strip = (pnl: Record<string, number>) => delete pnl.compute;
  strip(s.ledger.pnl);
  for (const w of s.history.weekly) strip(w.pnl);
  // Borrowing that once carried Loan Desk loans sits in reserves until repaid.
  const t = legacyTreasury(s);
  t.window = 400_000;
  t.overnight = 100_000;
  t.reserves += 500_000;
  return { s, branchId };
}

describe('save migration 6 → 7 (C3b)', () => {
  it('moves office rows onto the AI lines and repays the borrowing at unchanged equity', () => {
    const { s, branchId } = oldSave();
    const raw = { ...(structuredClone(s) as object), schemaVersion: 6 } as never;
    const step = structuredClone(s);
    migrations[6]!(step as never);
    const t = legacyTreasury(step);
    expect(t.window + t.overnight).toBe(0);
    expect(t.reserves).toBeCloseTo(legacyTreasury(s).reserves - 500_000);
    const m = migrate(raw) as unknown as GameState;
    const row = m.branches[branchId]!.pnl[0]!;
    expect(row.lines.plans).toBe(5_000);
    expect(row.lines.api).toBe(1_000);
    expect(row.lines.loanDesk).toBe(2_000);
    expect(row.lines.compute).toBe(0);
    expect(row.lines.servicing).toBe(400);
    expect(row.revenue).toBe(8_000);
    expect(row.income).toBe(1_000);
    expect(m.ledger.pnl.compute).toBe(0);
    expect(m.history.weekly.every((w) => w.pnl.compute === 0)).toBe(true);
    expect('treasury' in m).toBe(false);
    expect(balanceSheet(m).equity).toBeCloseTo(balanceSheet(s).equity, 4);
    expect(identityGap(m)).toBeLessThan(1);
    advanceWeeks(m, 8);
    expect(identityGap(m)).toBeLessThan(1);
    expect(m.branches[branchId]!.pnl.at(-1)!.lines.compute).toBeGreaterThan(0);
  });
});
