// Loads the owner's real Stage 3 save (schema v4) through every migration and
// keeps playing it, so Stage 4's shape change can't break existing games.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(new URL('../fixtures/owner-save-v4.txt', import.meta.url), 'utf8').trim();

describe('v4 save migration', () => {
  it('loads, gains Stage 4 fields and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(Object.keys(s.world.officeListings).length).toBeGreaterThan(0);
    expect(s.offices).toEqual({});
    expect(s.ledger.pnl.hqStaff).toBe(0);
    const branches = Object.keys(s.branches).length;
    advanceWeeks(s, 8);
    expect(s.flags.gameOver).toBeUndefined();
    expect(Object.keys(s.branches).length).toBe(branches);
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
