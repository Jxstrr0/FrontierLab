// Loads a Stage 8 save (schema v9: steady to week 200, a jet, a New York
// branch) through the Stage 9 migration and keeps playing: Calgary gains its
// car dealer and vacation home, New York its auction house, the empire starts
// empty, and the balance identity holds.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { advanceWeeks } from '../../src/sim/engine';
import { netWorth } from '../../src/sim/netWorth';
import { importCode } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION } from '../../src/sim/state';

const code = readFileSync(
  new URL('../fixtures/stage8-save-v9.txt', import.meta.url),
  'utf8',
).trim();

describe('v9 save migration', () => {
  it('loads, gains Stage 9 fields and keeps playing', () => {
    const s = importCode(code);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    const kinds = (city: string) =>
      Object.values(s.world.sites)
        .filter((x) => x.cityId === city)
        .map((x) => x.kind);
    expect(kinds('cal')).toContain('autoDealer');
    expect(kinds('cal')).toContain('vacationHome');
    expect(kinds('nyc')).toContain('auctionHouse');
    expect(s.personal.empire.homes).toEqual([]);
    expect(s.personal.jet?.model).toBe('corvid600');
    expect(s.ledger.pnl.franchiseRevenue).toBe(0);
    const nw = netWorth(s);
    expect(nw.jet).toBeGreaterThan(0);
    expect(nw.total).toBeGreaterThan(nw.cash);
    advanceWeeks(s, 6);
    expect(s.flags.gameOver).toBeUndefined();
    const bs = balanceSheet(s);
    expect(Math.abs(bs.equity - bs.expectedEquity)).toBeLessThan(1);
  });
});
