// The compute pool (stage C4a, SIMULATION §13.0): the chip cycle's price index,
// office GPU demand, data-center GPUs serving demand first, the office compute
// line at spot × index, and the 8 → 9 migration.
import { describe, expect, it } from 'vitest';
import { COMPUTE } from '../../src/config/balance';
import { DEFAULT_DC_BUILD } from '../../src/data/dataCenters';
import * as cmd from '../../src/sim/commands';
import {
  spotCost,
  headroom,
  newComputeState,
  ownedShare,
  spotPrice,
  updateComputeIndex,
} from '../../src/sim/compute';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { addCapital, identityGap } from '../helpers/mergers';
import { freeLot, openScriptedBranch } from '../helpers/scenario';

const lastRow = (s: GameState, id: string) => s.branches[id]!.pnl.at(-1)!;

describe('the chip cycle', () => {
  it('moves the index between phases inside its clamp, the same way every run', () => {
    const run = () => {
      const s = newGame({ seed: 42, cityId: 'cal' });
      const phases = new Set<string>();
      for (let w = 0; w < 520; w++) {
        updateComputeIndex(s);
        phases.add(s.compute.phase);
      }
      return { s, phases };
    };
    const { s, phases } = run();
    expect(phases.size).toBeGreaterThan(1);
    expect(s.compute.history).toHaveLength(COMPUTE.historyWeeks);
    for (const i of s.compute.history) {
      expect(i).toBeGreaterThanOrEqual(COMPUTE.clamp[0]);
      expect(i).toBeLessThanOrEqual(COMPUTE.clamp[1]);
    }
    expect(run().s.compute.index).toBe(s.compute.index);
    expect(spotPrice(s)).toBeCloseTo(COMPUTE.spotPerGpuWeek * s.compute.index, 9);
  });
});

describe('the compute pool', () => {
  it('charges an office spot × index for its GPUs', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const id = openScriptedBranch(s, 'midtown');
    advanceWeeks(s, 10);
    s.compute.index = 1.2;
    advanceWeeks(s, 1);
    // The index moved this tick; read the factor the office paid against its GPUs.
    const row = lastRow(s, id);
    expect(row.gpus).toBeGreaterThan(0);
    expect(s.compute.demandGpus).toBeCloseTo(row.gpus!, 9);
    expect(s.compute.ownedGpus).toBe(0);
    expect(row.lines.compute / (row.gpus! * COMPUTE.spotPerGpuWeek)).toBeCloseTo(
      s.compute.index,
      9,
    );
    expect(headroom(s)).toBe(0);
  });

  it('lets data-center GPUs serve demand first', () => {
    const s = newGame({ seed: 3, cityId: 'cal', startCash: 1_500_000 });
    addCapital(s, 60_000_000);
    const id = openScriptedBranch(s, 'midtown');
    const r = cmd.buildDataCenter(s, { where: { lotId: freeLot(s).id }, build: DEFAULT_DC_BUILD });
    if (!r.ok) throw new Error(r.reason);
    advanceWeeks(s, 30);
    expect(s.dataCenters[r.dataCenterId]!.status).toBe('open');
    // One 2,000-GPU hall covers a young office's demand outright.
    expect(s.compute.ownedGpus).toBe(2_000);
    expect(ownedShare(s)).toBe(1);
    expect(spotCost(s)).toBe(0);
    // C4c: the office still pays the internal price; the pool books it back,
    // so the company's compute line nets to zero.
    const row = lastRow(s, id);
    expect(row.lines.compute).toBeGreaterThan(0);
    expect(s.compute.weekCharge).toBeCloseTo(row.lines.compute, 6);
    expect(s.compute.weekCost).toBe(0);
    expect(s.history.weekly.at(-1)!.pnl.compute).toBeCloseTo(0, 6);
    expect(identityGap(s)).toBeLessThan(1);
    // Half-covered demand buys half at spot.
    s.compute.demandGpus = 4_000;
    s.compute.spotTrail = 10_000; // well inside the spot limit (C4c)
    expect(spotCost(s)).toBeCloseTo(2_000 * spotPrice(s), 6);
  });
});

describe('save migration 8 → 9 (C4a)', () => {
  it('starts the pool at a normal index of 1', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const raw = s as unknown as Record<string, unknown>;
    delete raw.compute;
    const m = migrations[8]!(raw as never) as unknown as GameState;
    expect(m.compute).toEqual(newComputeState());
  });
});
