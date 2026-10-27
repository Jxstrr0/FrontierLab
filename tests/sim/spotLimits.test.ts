// Spot limits, emergency burst, capacity crunch and outages (stage C4c,
// SIMULATION §13.0), the internal compute charge, and the 10 → 11 migration.
import { describe, expect, it } from 'vitest';
import { COMPUTE, OUTAGE, SPOT } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import {
  allocation,
  outageChurnMult,
  settleCompute,
  spotLimit,
  waitlisted,
} from '../../src/sim/compute';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { openScriptedBranch } from '../helpers/scenario';

const lab = () => {
  const s = newGame({ seed: 3, cityId: 'cal' });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, 4);
  return s;
};

const types = (s: GameState) => s.events.log.map((e) => e.type);

describe('the spot limit', () => {
  it('grows with the trail, shrinks in a shortage and never tops maxGpus', () => {
    const s = lab();
    s.compute.phase = 'normal';
    s.compute.spotTrail = 0;
    expect(spotLimit(s)).toBe(SPOT.baseGpus);
    s.compute.spotTrail = 4_000;
    expect(spotLimit(s)).toBe(SPOT.baseGpus + SPOT.trailMult * 4_000);
    s.compute.phase = 'shortage';
    expect(spotLimit(s)).toBeCloseTo(
      (SPOT.baseGpus + SPOT.trailMult * 4_000) * SPOT.phaseMult.shortage,
      9,
    );
    s.compute.phase = 'normal';
    s.compute.spotTrail = 1e9;
    expect(spotLimit(s)).toBe(SPOT.maxGpus);
  });

  it('splits demand into spot, burst and unserved', () => {
    const s = lab();
    s.compute.phase = 'normal';
    s.compute.spotTrail = 0;
    s.compute.demandGpus = 2_000;
    const a = allocation(s);
    expect(a.spot).toBe(SPOT.baseGpus);
    expect(a.burst).toBe(SPOT.burstShare * SPOT.baseGpus);
    expect(a.short).toBe(2_000 - a.spot - a.burst);
    expect(waitlisted(s)).toBe(true);
    s.compute.autoSpotBuy = false;
    expect(allocation(s).spot).toBe(0);
    expect(allocation(s).short).toBe(2_000);
  });
});

describe('crunch and outages', () => {
  it('waitlists new sign-ups, then starts an outage that raises churn', () => {
    const s = lab();
    expect(cmd.setAutoSpotBuy(s, false).ok).toBe(true);
    advanceWeeks(s, 1);
    expect(s.compute.crunchWeeks).toBe(1);
    expect(types(s)).toContain('COMPUTE_CRUNCH');
    // No new plan seats while waitlisted.
    advanceWeeks(s, 1);
    const books = Object.values(s.branches)[0]!.books;
    const newSeats = Object.values(books).reduce((n, b) => n + (b.last.newAccounts ?? 0), 0);
    expect(newSeats).toBe(0);
    advanceWeeks(s, OUTAGE.afterWeeks);
    expect(s.compute.outageWeeksLeft).toBeGreaterThan(0);
    expect(outageChurnMult(s)).toBe(OUTAGE.churnMult);
    expect(types(s)).toContain('COMPUTE_OUTAGE');
    expect(identityGap(s)).toBeLessThan(1);

    // Back on spot, the crunch clears and the outage tails off.
    cmd.setAutoSpotBuy(s, true);
    s.compute.spotTrail = 1e6;
    advanceWeeks(s, 1);
    expect(s.compute.crunchWeeks).toBe(0);
    expect(types(s)).toContain('COMPUTE_CRUNCH_ENDED');
    advanceWeeks(s, OUTAGE.weeks);
    expect(s.compute.outageWeeksLeft).toBe(0);
  });

  it('marks you after an emergency burst', () => {
    const s = lab();
    s.compute.spotTrail = 0;
    s.compute.phase = 'normal';
    s.compute.demandGpus = SPOT.baseGpus * 1.1;
    s.compute.ownedGpus = 0;
    settleCompute(s);
    expect(s.compute.burstStigmaWeeks).toBe(SPOT.stigmaWeeks);
    expect(types(s)).toContain('COMPUTE_BURST');
  });
});

describe('the internal compute charge', () => {
  it('charges offices spot and books the pool cost on the compute line', () => {
    const s = lab();
    s.compute.spotTrail = 1e6;
    advanceWeeks(s, 1);
    const c = s.compute;
    const row = Object.values(s.branches)[0]!.pnl.at(-1)!;
    expect(row.lines.compute).toBeCloseTo(row.gpus! * COMPUTE.spotPerGpuWeek * c.index, 6);
    // All of it was bought at spot, so the pool cost equals the charge.
    expect(c.weekCost).toBeCloseTo(c.weekCharge, 6);
    expect(s.history.weekly.at(-1)!.pnl.compute).toBeCloseTo(c.weekCost, 6);
  });
});

describe('save migration 10 → 11', () => {
  it('turns auto spot-buy on and seeds the trail with the gap', () => {
    const s = lab();
    const c = s.compute as unknown as Record<string, unknown>;
    for (const k of [
      'autoSpotBuy',
      'spotTrail',
      'crunchWeeks',
      'outageWeeksLeft',
      'burstStigmaWeeks',
      'weekCharge',
      'weekCost',
    ])
      delete c[k];
    const m = migrations[10]!(s as never) as unknown as GameState;
    expect(m.compute.autoSpotBuy).toBe(true);
    expect(m.compute.spotTrail).toBeCloseTo(
      Math.max(0, m.compute.demandGpus - m.compute.ownedGpus - m.compute.rentedGpus),
      9,
    );
    expect(m.compute.crunchWeeks).toBe(0);
    expect(m.compute.weekCost).toBe(0);
  });
});
