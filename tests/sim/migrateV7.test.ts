// Loads a Stage 6 save (schema v7, 230 steady weeks, listed, with foreclosed
// homes) through the Stage 7 migration and keeps playing it: the city gains
// property buildings, a convention centre and its lobbying firm, foreclosed
// homes get a mode, and the balance identity still holds.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REAL_ESTATE } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(
  new URL('../fixtures/stage6-save-v7.txt', import.meta.url),
  'utf8',
).trim();

describe('v7 save migration', () => {
  it('loads, gains Stage 7 fields and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    const sites = Object.values(s.world.sites);
    const props = sites.filter((x) => x.kind === 'property');
    expect(props).toHaveLength(REAL_ESTATE.buildingsPerCity.M);
    for (const p of props) expect(p.property!.sqm).toBeGreaterThan(0);
    expect(sites.filter((x) => x.kind === 'conventionCenter').map((x) => x.refId)).toEqual([
      'foothillsFounders',
    ]);
    expect(sites.filter((x) => x.kind === 'lobbyingFirm').map((x) => x.refId)).toEqual([
      'parliamentRow',
    ]);
    expect(s.reo.cal!.mode).toBe('rent'); // held in v7, renting since schema 15
    expect(s.reo.cal!.hpiRef).toBeGreaterThan(0);
    expect(s.ledger.pnl.rentalIncome).toBe(0);
    expect(s.lobbying.campaigns).toEqual([]);
    const before = balanceSheet(s);
    expect(Math.abs(before.equity - before.expectedEquity)).toBeLessThan(1);
    advanceWeeks(s, 8);
    expect(s.flags.gameOver).toBeUndefined();
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
