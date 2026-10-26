// Migration 31 → 32 (DESIGN decision log 2026-10-26): the rich list's fortunes
// shrink to the new range, each keeping its place in the span, so the list
// stays sorted and its names and sources stay put.
import { describe, expect, it } from 'vitest';
import { RICH_LIST } from '../../src/config/balance';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';

type Raw = Record<string, unknown> & { schemaVersion: number };

describe('v31 → v32 migration', () => {
  it('maps every fortune from the old range into the new one, in order', () => {
    const s0 = newGame({ seed: 5, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s0)) as Raw;
    const list = (raw as unknown as GameState).personal.empire.richList;
    // As v31 drew them: log-uniform between $1.5B and $120B.
    const old = [120e9, Math.sqrt(1.5e9 * 120e9), 1.5e9];
    list.fortunes = old.map((worth, i) => ({
      id: `rich_${i + 1}`,
      name: `P ${i}`,
      source: 'x',
      worth,
    }));
    raw.schemaVersion = 31;

    const s = migrate(raw) as unknown as GameState;
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    const [lo, hi] = RICH_LIST.fortune;
    const worths = s.personal.empire.richList.fortunes.map((f) => f.worth);
    expect(worths[0]).toBe(hi);
    expect(worths[2]).toBe(lo);
    expect(worths[1]).toBeCloseTo(Math.sqrt(lo * hi), -6);
    expect(s.personal.empire.richList.fortunes.map((f) => f.name)).toEqual(['P 0', 'P 1', 'P 2']);
  });
});
