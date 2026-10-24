// Loads a Stage 5 save (schema v6, 160 steady weeks) through the Stage 6
// migration and keeps playing it: rivals gain share counts and prices, the city
// gains its investment bank, and the founder holds every share of the bank.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { START_PERSONAL_CASH, START_CEO_SALARY } from '../../src/config/balance';
import { STOCKS } from '../../src/data/stocks';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(
  new URL('../fixtures/stage5-save-v6.txt', import.meta.url),
  'utf8',
).trim();

describe('v6 save migration', () => {
  it('loads, gains Stage 6 fields and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    for (const r of Object.values(s.rivals)) {
      expect(r.shares).toBeGreaterThan(0);
      expect(r.price).toBeGreaterThan(0);
    }
    const banks = Object.values(s.world.sites).filter((x) => x.kind === 'investmentBank');
    expect(banks.map((b) => b.refId)).toEqual(['ashgrove']);
    expect(Object.keys(s.market.companies).sort()).toEqual(Object.keys(STOCKS).sort());
    expect(s.stock.holders).toHaveLength(1);
    expect(s.stock.holders[0]!.shares).toBe(s.company.sharesOutstanding);
    expect(s.stock.price).toBeGreaterThan(0);
    expect(s.personal.cash).toBe(START_PERSONAL_CASH);
    expect(s.governance.ceoSalary).toBe(START_CEO_SALARY);
    expect(s.company.goodwill).toBe(0);
    expect(s.ledger.pnl.execPay).toBe(0);
    const before = balanceSheet(s);
    expect(Math.abs(before.equity - before.expectedEquity)).toBeLessThan(1);
    advanceWeeks(s, 8);
    expect(s.flags.gameOver).toBeUndefined();
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
