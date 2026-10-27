// Save migration for rival books (schema 21 → 22): deposits become customers
// and ARR at the rival's prices, equity less the offices becomes cash, and the
// bank-era fields are dropped.
import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/sim/newGame';
import { arrPerCustomer, rivalBookAssets } from '../../src/sim/rivalFinance';
import { migrateRivalBooks } from '../../src/sim/save/migrateRivalBooks';
import type { GameState } from '../../src/sim/state';

/** A schema-21 rival shape: deposits and loans per office, equity and a capital ratio. */
function legacy(s: GameState) {
  for (const bank of Object.values(s.rivals)) {
    const raw = bank as unknown as Record<string, unknown>;
    raw.capitalRatio = 0.12;
    delete raw.cash;
    delete raw.negativeQuarters;
    bank.equity = 40_000_000;
    for (const office of bank.branches) {
      const o = office as unknown as Record<string, unknown>;
      o.deposits = 45_000_000;
      o.loans = 36_900_000;
      delete o.customers;
      delete o.arr;
    }
  }
}

describe('migrateRivalBooks (21 → 22)', () => {
  it('derives customers, ARR, cash and costs and drops the bank fields', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    legacy(s);
    migrateRivalBooks(s);
    for (const bank of Object.values(s.rivals)) {
      const raw = bank as unknown as Record<string, unknown>;
      expect(raw.capitalRatio).toBeUndefined();
      expect(bank.negativeQuarters).toBe(0);
      expect(bank.costs).toBeGreaterThan(0);
      expect(bank.cash).toBeGreaterThan(0);
      expect(bank.cash).toBeCloseTo(
        Math.max(40_000_000 - rivalBookAssets(s, bank), 13 * bank.costs),
        0,
      );
      expect(bank.equity).toBeCloseTo(bank.cash + rivalBookAssets(s, bank), 0);
      for (const office of bank.branches) {
        const o = office as unknown as Record<string, unknown>;
        expect(o.deposits).toBeUndefined();
        expect(o.loans).toBeUndefined();
        expect(office.customers).toBe(4_500);
        expect(office.arr).toBeCloseTo(4_500 * arrPerCustomer(s, bank, office.cityId), 6);
      }
    }
  });

  it('leaves a lab already on the new books alone', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const bank = Object.values(s.rivals)[0]!;
    const before = { cash: bank.cash, customers: bank.branches[0]!.customers };
    migrateRivalBooks(s);
    expect(bank.cash).toBe(before.cash);
    expect(bank.branches[0]!.customers).toBe(before.customers);
  });
});
