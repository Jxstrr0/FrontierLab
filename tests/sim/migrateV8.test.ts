// Loads a Stage 7 save (schema v8, 233 steady weeks, listed, HQ prices on, a
// building and a currency position) through the Stage 8 migration, then flies
// to new cities and keeps playing: the start city becomes home, HQ prices
// belong to Canada, and the balance identity holds through every arrival.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(
  new URL('../fixtures/stage7-save-v8.txt', import.meta.url),
  'utf8',
).trim();

const balanced = (s: ReturnType<typeof importCode>) => {
  const bs = balanceSheet(s);
  expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
};

describe('v8 save migration', () => {
  it('loads, gains Stage 8 fields, travels and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.meta.homeCityId).toBe('cal');
    expect(s.world.travel).toEqual({ kmThisWeek: 0, totalKm: 0, flights: 0, faresPaid: 0 });
    expect(s.ledger.pnl.travel).toBe(0);
    expect(s.company.applyRatesToAll).toBe(true);
    expect(Object.keys(s.company.companyPrices)).toEqual(['CA']);
    expect(s.company.companyPrices.CA!.savings).toBeGreaterThan(0);
    balanced(s);

    expect(cmd.travelTo(s, 'van').ok).toBe(true);
    expect(s.world.cities.van?.generated).toBe(true);
    expect(Object.values(s.world.lots).some((l) => l.cityId === 'van')).toBe(true);
    balanced(s);
    expect(cmd.travelTo(s, 'fmm').ok).toBe(true);
    advanceWeeks(s, 4);
    expect(cmd.travelTo(s, 'lon').ok).toBe(true);
    advanceWeeks(s, 4);
    expect(s.flags.gameOver).toBeUndefined();
    balanced(s);
  });
});
