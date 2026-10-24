// Loads a Stage 4 save (schema v5, 100 scripted weeks with an office) through the
// Stage 5 migration and keeps playing it: every country gains a macro economy,
// rivals gain financials, cities gain rival head offices, employers and a university.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COUNTRIES } from '../../src/data/countries';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(
  new URL('../fixtures/stage4-save-v5.txt', import.meta.url),
  'utf8',
).trim();

describe('v5 save migration', () => {
  it('loads, gains Stage 5 fields and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.keys(s.world.countries).sort()).toEqual(Object.keys(COUNTRIES).sort());
    for (const r of Object.values(s.rivals)) {
      expect(r.equity).toBeGreaterThan(0);
      expect(r.ceo).not.toBe('');
      for (const b of r.branches) expect(b.deposits).toBeGreaterThan(0);
    }
    const kinds = Object.values(s.world.sites).map((x) => x.kind);
    expect(kinds.filter((k) => k === 'rivalHq').length).toBe(Object.keys(s.rivals).length);
    expect(kinds.filter((k) => k === 'university')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'employer').length).toBeGreaterThanOrEqual(2);
    expect(s.partnerships).toEqual({});
    expect(s.ledger.pnl.corporateInterest).toBe(0);
    const before = balanceSheet(s);
    expect(Math.abs(before.equity - before.expectedEquity)).toBeLessThan(1);
    advanceWeeks(s, 8);
    expect(s.flags.gameOver).toBeUndefined();
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
