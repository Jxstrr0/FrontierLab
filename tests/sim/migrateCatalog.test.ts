// Save migration 5 → 6 (stage C3a): a save holding the bank catalog (deposit
// and loan books, a developed product, a development in progress, a deposit
// partnership, a savings-rate boost, old rival prices) settles its old books
// without moving equity, opens the AI catalog in every office, and then plays
// on and round-trips like any other save.
import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../../src/data/products';
import { emptyBook } from '../../src/sim/branch/books';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION, type Book, type GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

const OLD_IDS = ['chequing', 'savings', 'gic1y', 'personal_loan', 'mortgage', 'wealth', 'dev_old'];

function oldBook(balance: number, accounts: number): Book {
  return { ...emptyBook(), balance, accounts };
}

/** A schema-5 save: today's state with the bank's catalog put back in. */
function bankSave(): { s: GameState; branchId: string } {
  const s = newGame({ seed: 5, cityId: 'cal', bankName: 'Old Bank' });
  const branchId = openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 10);
  const b = s.branches[branchId]!;
  // Deposits sat in reserves; loans were funded out of them. Equity is unchanged
  // by either, so the books stay balanced with the old ids in place.
  b.books.savings = oldBook(2_000_000, 800);
  b.books.chequing = oldBook(500_000, 900);
  b.books.dev_old = oldBook(300_000, 120);
  b.books.mortgage = oldBook(1_200_000, 4);
  b.books.personal_loan = oldBook(250_000, 20);
  b.books.wealth = oldBook(5_000_000, 30); // off the balance sheet
  s.treasury.reserves += 2_000_000 + 500_000 + 300_000 - 1_200_000 - 250_000;
  for (const id of ['savings', 'chequing', 'mortgage', 'personal_loan', 'wealth', 'dev_old'])
    b.offered[id] = { on: true, price: 0.02 };
  s.products.catalog.savings = { id: 'savings', stars: 3, developed: false };
  s.products.catalog.dev_old = {
    id: 'dev_old',
    stars: 4,
    developed: true,
    name: 'Silver Saver',
    base: 'savings',
    templateId: 'senior_saver',
    tier: 'medium',
  };
  s.products.developments.push({
    ...structuredClone(s.products.developments[0] ?? ({} as never)),
    id: 'dev_job',
    name: 'Green GIC',
    templateId: 'green_gic',
    tier: 'medium',
    weeks: 12,
    weeklyBudget: 5_000,
    spent: 10_000,
    progress: 2,
    odds: [0.2, 0.2, 0.2, 0.2, 0.2],
  } as GameState['products']['developments'][number]);
  (s.company.companyPrices.CA ??= {}).savings = 0.03;
  (s.company.companyOffered ??= {}).savings = true;
  const rival = Object.values(s.rivals)[0]!;
  rival.prices.savings = 0.031;
  rival.priceLags.savings = { target: 0.031, weeksLeft: 2 };
  rival.priceWar.cal = 0.0015;
  s.incidents.effects.push({
    kind: 'savingsBoost' as never,
    scope: 'cal',
    value: 0.005,
    untilWeek: s.clock.week + 10,
  });
  return { s, branchId };
}

/** Migrates a state as a schema-5 save would be: JSON in, the 5 → 6 step, then typed. */
function migrated(s: GameState): GameState {
  const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & { schemaVersion: number };
  raw.schemaVersion = 5;
  const out = migrate(raw) as unknown as GameState;
  expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  return out;
}

describe('migration 5 → 6 (C3a catalog)', () => {
  it('settles the bank books without moving equity and opens the AI catalog', () => {
    const { s, branchId } = bankSave();
    const reserves = s.treasury.reserves;
    const cash = s.company.cash;
    const before = s.branches[branchId]!;
    const customers = before.customers;
    const freeBefore = before.books.free_tier?.accounts ?? 0;
    const m = migrated(s);
    expect(identityGap(m)).toBeLessThan(1);

    const b = m.branches[branchId]!;
    for (const id of OLD_IDS) {
      expect(b.books[id], id).toBeUndefined();
      expect(b.offered[id], id).toBeUndefined();
      expect(m.products.catalog[id], id).toBeUndefined();
      expect(m.company.companyPrices.CA?.[id], id).toBeUndefined();
      expect(m.company.companyOffered?.[id], id).toBeUndefined();
    }
    // Deposits paid out and loans sold: reserves (and cash, for any shortfall) net the two.
    const settled = 2_000_000 + 500_000 + 300_000 - 1_200_000 - 250_000;
    expect(m.treasury.reserves + m.company.cash).toBeCloseTo(reserves + cash - settled, 2);
    expect(m.treasury.reserves).toBeGreaterThanOrEqual(0);

    for (const spec of Object.values(PRODUCTS)) {
      expect(b.books[spec.id], spec.id).toBeDefined();
      expect(b.offered[spec.id], spec.id).toBeDefined();
      expect(m.products.catalog[spec.id], spec.id).toBeDefined();
    }
    // Yesterday's customers land on the Free Tier.
    expect(b.books.free_tier!.accounts).toBeCloseTo(freeBefore + customers, 6);
    // The development on a bank template is dropped, with its spend already booked.
    expect(m.products.developments.some((d) => d.id === 'dev_job')).toBe(false);

    const rival = Object.values(m.rivals)[0]!;
    expect(rival.prices.savings).toBeUndefined();
    expect(rival.priceLags.savings).toBeUndefined();
    expect(rival.priceWar).toEqual({});
    expect(m.incidents.effects.some((e) => (e.kind as string) === 'savingsBoost')).toBe(false);
  });

  it('switches a deposit partnership to a plan package, settling its balance', () => {
    const { s, branchId } = bankSave();
    const site = Object.values(s.world.sites).find(
      (x) => x.cityId === 'cal' && x.kind === 'employer',
    )!;
    // Sign a deal today, then dress it as a schema-5 deposit package funded into reserves.
    s.company.paidInCapital += 5_000_000;
    s.company.cash += 5_000_000;
    const r = cmd.signPartnership(s, site.id, branchId, 'team', 'payroll');
    if (!r.ok) throw new Error(r.reason);
    const old = s.partnerships[r.partnershipId]!;
    old.productId = 'savings';
    old.balance = 400_000;
    s.treasury.reserves += 400_000;
    const m = migrated(s);
    const p = m.partnerships[r.partnershipId]!;
    expect(p.productId).toBe('team');
    expect(p.balance).toBe(0);
    expect(identityGap(m)).toBeLessThan(1);
  });

  it('plays on with the books balanced and round-trips the save', () => {
    const { s } = bankSave();
    const m = migrated(s);
    for (let w = 0; w < 8; w++) {
      advanceWeeks(m, 1);
      expect(identityGap(m)).toBeLessThan(1);
      expect(Number.isFinite(m.company.cash)).toBe(true);
    }
    expect(importCode(exportCode(m))).toEqual(m);
  });
});
