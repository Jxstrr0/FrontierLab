// The safety ratio and the AI regulator (stage C7a, SIMULATION §15): the ratio
// and its tiers, strict watch and policy buffers, the deal edge, cutting safety
// staff in a run, the mandated pause (accept, decline, deadline, still low at
// the end), a revoked licence and its restart, and the 16 → 17 migration.
import { describe, expect, it } from 'vitest';
import {
  CAPITAL_GATE,
  FOUNDER_MODE_ASSETS,
  LICENCE,
  MANDATED_PAUSE,
  SAFETY,
  SAFETY_TIER_THRESHOLDS,
  TRAINING,
} from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { checkFailure } from '../../src/sim/failure';
import { runIncidents } from '../../src/sim/incidents';
import { pauseFee } from '../../src/sim/mandatedPause';
import { newGame } from '../../src/sim/newGame';
import { reviewFailChance } from '../../src/sim/riskFloor';
import {
  evaluateSafety,
  isPaused,
  safetyDealEdge,
  safetySnapshot,
  safetyTierFor,
  salesGate,
  tierLift,
} from '../../src/sim/safety';
import { migrations } from '../../src/sim/save/migrations';
import type { Business, GameState } from '../../src/sim/state';
import { bankWithFloors } from '../helpers/scenario';

const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

/** Sets the Safety floor's coverage directly (k′ and k). */
function cover(s: GameState, kPrime: number, k = kPrime): void {
  s.hq.coverage.risk = { required: 4, k, kPrime, eff: kPrime };
  evaluateSafety(s);
}

describe('the safety ratio', () => {
  it('is Safety coverage over the model’s exposure', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const snap = safetySnapshot(s);
    expect(snap.strength).toBe(1); // founder mode: no requirements yet
    expect(snap.ratio).toBeCloseTo(snap.strength / snap.exposure);
    expect(s.company.safetyRatio).toBeCloseTo(snap.ratio);
    cover(s, 1, 1.2);
    expect(safetySnapshot(s).strength).toBeCloseTo(1.2);
    cover(s, 0.5, 0.5);
    expect(safetySnapshot(s).strength).toBeCloseTo(0.5);
  });

  it('maps to tiers, raised by strict watch and policy buffers', () => {
    for (const t of SAFETY_TIER_THRESHOLDS.slice(0, -1))
      expect(safetyTierFor(t.minSr)).toBe(t.tier);
    expect(safetyTierFor(0)).toBe('critical');
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(tierLift(s)).toBe(0);
    s.company.watchUntilWeek = s.clock.week + 10;
    expect(tierLift(s)).toBeCloseTo(LICENCE.watchBuffer);
    const adequate = SAFETY_TIER_THRESHOLDS[1]!.minSr;
    expect(safetyTierFor(adequate, tierLift(s))).toBe('watch');
  });

  it('gives data-sensitive businesses a reason to pick a strong lab', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const b = { pentagon: [5, 5, 10, 5, 5] } as unknown as Business;
    const relaxed = { pentagon: [5, 5, 2, 5, 5] } as unknown as Business;
    s.company.tier = 'strong';
    expect(safetyDealEdge(s, b)).toBeCloseTo(SAFETY.dealEdge.strong);
    expect(safetyDealEdge(s, relaxed)).toBe(0);
    s.company.tier = 'critical';
    expect(safetyDealEdge(s, b)).toBeCloseTo(SAFETY.dealEdge.critical);
  });
});

describe('cutting safety staff in a run', () => {
  it('leads to a worse tier, gates and likelier audits', () => {
    // A lab big enough that every HQ requirement applies in full.
    const s = bankWithFloors(['risk'], { capital: FOUNDER_MODE_ASSETS });
    s.departments.risk!.staff = 12;
    s.departments.risk!.skill = 80;
    advanceWeeks(s, 2);
    const before = { tier: s.company.tier, audit: reviewFailChance(s) };
    expect(['strong', 'adequate']).toContain(before.tier);
    cmd.setDeptTarget(s, 'risk', 0);
    s.departments.risk!.staff = 0;
    advanceWeeks(s, 2);
    expect(s.company.tier).toBe('critical');
    expect(salesGate(s)).toBe(CAPITAL_GATE.critical);
    expect(reviewFailChance(s)).toBeGreaterThan(before.audit * 2);
    expect(cmd.buildBranch(s, { lotId: 'x', build: {} as never }).ok).toBe(false);
    advanceWeeks(s, MANDATED_PAUSE.offerWeeks);
    expect(s.incidents.active.some((i) => i.type === 'RECAP_OFFER')).toBe(true);
    expect(s.flags.gameOver).toBeUndefined();
  }, 30_000);
});

describe('the mandated pause', () => {
  /** A lab eight weeks under the revoke line, with the offer on the table. */
  function sinking(): GameState {
    const s = bankWithFloors(['products'], { weeks: 30 });
    cover(s, 0.2);
    s.company.lowCapitalWeeks = MANDATED_PAUSE.offerWeeks - 1;
    checkFailure(s);
    return s;
  }
  const offer = (s: GameState) => s.incidents.active.find((i) => i.type === 'RECAP_OFFER')!;

  it('is offered after eight weeks under the line', () => {
    const s = sinking();
    expect(offer(s)).toBeDefined();
    expect(offer(s).data.amount).toBe(pauseFee(s));
    expect(s.incidents.recap?.offeredWeek).toBe(s.clock.week);
  });

  it('accepting pays the monitors and stops new business and training', () => {
    const s = sinking();
    const cash = s.company.cash;
    const fee = pauseFee(s);
    expect(cmd.resolveIncident(s, offer(s).id, 'accept').ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - fee);
    expect(isPaused(s)).toBe(true);
    expect(salesGate(s)).toBe(0);
    expect(
      cmd.startTrainingRun(s, { name: 'X', focus: 0, weeks: 4, weeklyBudget: TRAINING.minWeekly })
        .ok,
    ).toBe(false);
    expect(identityGap(s)).toBeLessThan(1);
    // The monitors lift Safety coverage while the pause lasts.
    advanceWeeks(s, 1);
    expect(s.hq.coverage.risk!.kPrime).toBeGreaterThanOrEqual(MANDATED_PAUSE.monitorLift);
    expect(s.events.log.some((e) => e.type === 'SAFETY_PAUSE')).toBe(true);
  });

  it('ends quietly when the ratio has recovered, and revokes the licence when not', () => {
    const ok = sinking();
    cmd.resolveIncident(ok, offer(ok).id, 'accept');
    ok.clock.week += MANDATED_PAUSE.weeks;
    cover(ok, 1);
    checkFailure(ok);
    expect(ok.company.pause).toBeUndefined();
    expect(ok.company.watchUntilWeek).toBeUndefined();

    const low = sinking();
    cmd.resolveIncident(low, offer(low).id, 'accept');
    low.clock.week += MANDATED_PAUSE.weeks;
    cover(low, 0.2);
    checkFailure(low);
    expect(low.company.pause?.reason).toBe('revoked');
  });

  it('declining (or letting the deadline pass) revokes the licence: not game over', () => {
    const s = sinking();
    cmd.resolveIncident(s, offer(s).id, 'decline');
    expect(s.flags.gameOver).toBeUndefined();
    expect(s.company.pause).toEqual({
      reason: 'revoked',
      untilWeek: s.clock.week + LICENCE.pauseWeeks,
    });
    expect(s.events.log.some((e) => e.type === 'LICENCE_REVOKED')).toBe(true);

    const late = sinking();
    late.clock.week = offer(late).deadlineWeek;
    runIncidents(late);
    expect(late.company.pause?.reason).toBe('revoked');
  });

  it('after a revoked licence, restores it and keeps strict watch for a year', () => {
    const s = sinking();
    cmd.resolveIncident(s, offer(s).id, 'decline');
    s.clock.week += LICENCE.pauseWeeks - 1;
    checkFailure(s);
    expect(isPaused(s)).toBe(true);
    s.clock.week += 1;
    cover(s, 1);
    checkFailure(s);
    expect(isPaused(s)).toBe(false);
    expect(s.events.log.some((e) => e.type === 'LICENCE_RESTORED')).toBe(true);
    const audit = reviewFailChance(s);
    expect(tierLift(s)).toBeCloseTo(LICENCE.watchBuffer);
    s.clock.week = s.company.watchUntilWeek!;
    expect(tierLift(s)).toBe(0);
    expect(reviewFailChance(s)).toBeCloseTo(audit / LICENCE.watchAuditMult);
  });
});

describe('save migration 16 → 17', () => {
  it('sets the safety ratio and tier and drops an old recapitalisation', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const raw = s as unknown as { company: Record<string, unknown> };
    delete raw.company.safetyRatio;
    s.company.lowCapitalWeeks = 5;
    s.incidents.recap = { offeredWeek: 0 };
    migrations[16]!(raw as never);
    expect(s.company.safetyRatio).toBeCloseTo(safetySnapshot(s).ratio);
    expect(s.company.tier).toBe(safetySnapshot(s).tier);
    expect(s.company.lowCapitalWeeks).toBe(0);
    expect(s.incidents.recap).toBeUndefined();
  });
});
