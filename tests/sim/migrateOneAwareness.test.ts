// Save migration 38 → 39 (audit batch D): a city's brand awareness b folds
// into its sales office's awareness as 1 − (1 − a)(1 − b), the effective
// awareness the office already had, and leaves no city field behind.
import { describe, expect, it } from 'vitest';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

describe('migration 38 → 39: one awareness per city', () => {
  it('folds the city number into the office as the effective awareness', () => {
    const s = newGame({ seed: 38, cityId: 'cal', bankName: 'Old Lab' });
    const id = openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 4);
    const raw = JSON.parse(JSON.stringify(s)) as GameState & { schemaVersion: number };
    raw.schemaVersion = 38;
    raw.branches[id]!.awareness = 0.4;
    (raw.world.cities.cal as unknown as Record<string, number>).brandAwareness = 0.25;
    const out = migrate(raw as never) as unknown as GameState & { schemaVersion: number };
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
    expect(out.branches[id]!.awareness).toBeCloseTo(1 - 0.6 * 0.75, 12);
    expect('brandAwareness' in out.world.cities.cal!).toBe(false);
  });
});
