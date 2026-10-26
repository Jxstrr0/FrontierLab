// Migration 27 → 28 (DESIGN decision log 2026-10-26): conventions now open for
// four weeks. Runs still to come or open in a v27 save stretch to the new
// length and their exclusive rounds stay open as long; runs already over, and
// the `weeklyResults` setting, are left alone.
import { describe, expect, it } from 'vitest';
import { CONVENTIONS } from '../../src/config/balance';
import { advanceWeeks } from '../../src/sim/engine';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { bankWithFloors } from '../helpers/scenario';

type Raw = Record<string, unknown> & { schemaVersion: number };

describe('v27 → v28 migration', () => {
  it('stretches open and upcoming convention runs and their rounds', () => {
    const s0 = bankWithFloors(['investment'], { weeks: 24 });
    const raw = JSON.parse(JSON.stringify(s0)) as Raw;
    const state = raw as unknown as GameState;
    // As v27 stored them: open for one week, announced two weeks out.
    const fair = state.conventions.runs.find(
      (r) => r.conventionId === 'foothillsFounders' && r.year === 2027,
    )!;
    const past = state.conventions.runs.find((r) => r.endWeek <= state.clock.week)!;
    for (const r of state.conventions.runs) r.endWeek = r.startWeek + 1;
    for (const id of fair.startupIds) {
      const round = state.ventures.startups[id]!.round!;
      round.closesWeek = fair.endWeek;
    }
    const pastEnd = past.endWeek;
    raw.schemaVersion = 27;

    const s = migrate(raw) as unknown as GameState;
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    const run = s.conventions.runs.find(
      (r) => r.conventionId === 'foothillsFounders' && r.year === 2027,
    )!;
    expect(run.endWeek).toBe(run.startWeek + CONVENTIONS.activeWeeks);
    expect(run.startupIds.length).toBeGreaterThan(0);
    for (const id of run.startupIds) {
      expect(s.ventures.startups[id]!.round!.closesWeek).toBe(run.endWeek);
    }
    const over = s.conventions.runs.find(
      (r) => r.conventionId === past.conventionId && r.year === past.year,
    )!;
    expect(over.endWeek).toBe(pastEnd);
    expect(s.settings.weeklyResults).toBe('weekly');
    advanceWeeks(s, 8);
    expect(s.flags.gameOver).toBeUndefined();
  });
});
