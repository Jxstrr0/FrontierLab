// Bank runs (SIMULATION §13.8) and the regulator's letter (§15): triggers,
// deposit churn during a run and its end. The mandated pause that replaced the
// emergency recapitalisation is tested in safety.test.ts.
import { describe, expect, it } from 'vitest';
import { BANK_RUN } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { bankRunMult } from '../../src/sim/incident/effects';
import { runIncidents } from '../../src/sim/incidents';
import type { GameState } from '../../src/sim/state';
import { openBank } from '../helpers/incidents';
import { bankWithFloors } from '../helpers/scenario';

describe('bank runs', () => {
  /** Ticks incidents week by week until a run starts. */
  function startRun(s: GameState): void {
    for (let i = 0; i < 400 && s.incidents.bankRunWeeksLeft === undefined; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
  }

  it('need weak ratings and weak capital or liquidity', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2.2;
    s.company.tier = 'adequate';
    s.company.liquidityRatio = 0.3;
    for (let i = 0; i < 200; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
    s.company.tier = 'critical';
    s.company.tierWeeks = 5;
    startRun(s);
    const left = s.incidents.bankRunWeeksLeft!;
    expect(left).toBeGreaterThanOrEqual(BANK_RUN.weeks[0]);
    expect(left).toBeLessThanOrEqual(BANK_RUN.weeks[1]);
    expect(s.incidents.active.some((i) => i.type === 'BANK_RUN')).toBe(true);
    expect(s.events.log.some((e) => e.type === 'BANK_RUN')).toBe(true);
    expect(bankRunMult(s)).toBe(BANK_RUN.runMult);
    // It runs its course, then ends.
    for (let i = 0; i < left; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
    expect(bankRunMult(s)).toBe(1);
    expect(s.events.log.some((e) => e.type === 'BANK_RUN_ENDED')).toBe(true);
  });

  it('multiplies plan churn by six while it lasts', () => {
    const base = bankWithFloors([], { weeks: 20 });
    const run = structuredClone(base);
    run.incidents.bankRunWeeksLeft = 3;
    advanceWeeks(base, 1);
    advanceWeeks(run, 1);
    const id = Object.keys(base.branches)[0]!;
    const calm = base.branches[id]!.books.plus!.last.churned;
    const panic = run.branches[id]!.books.plus!.last.churned;
    expect(calm).toBeGreaterThan(0);
    expect(panic / calm).toBeCloseTo(BANK_RUN.runMult, 1);
  });

  it('ends when a public statement works', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    inc.data.odds = 1;
    const r = cmd.resolveIncident(s, inc.id, 'statement');
    expect(r.ok && r.outcome).toContain('worked');
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
  });

  it('lends nothing from the central bank window with no deposit book (C3a)', () => {
    // The window lends a share of deposits; an AI lab holds none, so it borrows
    // nothing. The window itself goes in C3c.
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    expect(inc.data.window).toBe(0);
    const reserves = s.treasury.reserves;
    cmd.resolveIncident(s, inc.id, 'window');
    expect(s.treasury.window).toBe(0);
    expect(s.treasury.reserves).toBe(reserves);
  });

  it('cuts plan prices when the lab chooses to raise its offer', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    cmd.resolveIncident(s, inc.id, 'raise');
    const fx = s.incidents.effects.filter((e) => e.kind === 'planCut');
    expect(fx).toHaveLength(1);
    expect(fx[0]!.value).toBe(BANK_RUN.planCut);
  });
});

describe('regulator letter', () => {
  it('arrives on entering the Restricted band', () => {
    const { s } = openBank();
    s.company.tier = 'restricted';
    s.company.tierWeeks = 0;
    runIncidents(s);
    expect(s.incidents.active.map((i) => i.type)).toContain('REGULATOR_LETTER');
  });
});
