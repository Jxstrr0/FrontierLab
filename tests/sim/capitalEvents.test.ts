// Outage rumours (SIMULATION §13.8, the BANK_RUN case) and the regulator's
// letter (§15): triggers (weak ratings plus an outage, a weak or falling safety
// tier, or a ratings slide), plan churn during a rumour and its end. The
// mandated pause that replaced the emergency recapitalisation is tested in
// safety.test.ts.
import { describe, expect, it } from 'vitest';
import { BANK_RUN } from '../../src/config/balance';
import { companyArr } from '../../src/sim/arr';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { bankRunCondition, statementOdds, tierDropped } from '../../src/sim/incident/capitalEvents';
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

  it('need weak ratings and an outage, a weak or falling tier, or a ratings slide', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2.4;
    s.company.tier = 'adequate';
    s.company.tierWeeks = 50;
    expect(bankRunCondition(s)).toBe(false);
    for (let i = 0; i < 200; i++) {
      s.clock.week += 1;
      runIncidents(s);
    }
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
    // An outage, a slide under slideOverall, or a recent tier drop each qualify.
    s.compute.outageWeeksLeft = 2;
    expect(bankRunCondition(s)).toBe(true);
    s.compute.outageWeeksLeft = 0;
    b.ratings.overall = BANK_RUN.slideOverall - 0.1;
    expect(bankRunCondition(s)).toBe(true);
    b.ratings.overall = 2.4;
    s.history.weekly.push({ tier: 'strong' } as GameState['history']['weekly'][number]);
    s.history.weekly.push({ tier: 'adequate' } as GameState['history']['weekly'][number]);
    s.company.tierWeeks = 0;
    expect(tierDropped(s)).toBe(true);
    expect(bankRunCondition(s)).toBe(true);
    s.company.tierWeeks = BANK_RUN.tierDropWeeks;
    expect(bankRunCondition(s)).toBe(false);
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

  it('prices the public statement on the safety ratio', () => {
    const { s } = openBank();
    s.company.safetyRatio = BANK_RUN.statementFromSr;
    expect(statementOdds(s)).toBeCloseTo(BANK_RUN.statementBase, 9);
    s.company.safetyRatio = BANK_RUN.statementFromSr + 0.1;
    expect(statementOdds(s)).toBeCloseTo(
      BANK_RUN.statementBase + 10 * BANK_RUN.statementPerPoint,
      9,
    );
    s.company.safetyRatio = 5;
    expect(statementOdds(s)).toBe(BANK_RUN.statementMax);
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

  it('ends the rumour with service credits priced on ARR (C8f)', () => {
    const { s, b } = openBank();
    b.ratings.overall = 2;
    s.company.tier = 'critical';
    s.company.tierWeeks = 3;
    startRun(s);
    const inc = s.incidents.active.find((i) => i.type === 'BANK_RUN')!;
    expect(inc.data.credits).toBeCloseTo(BANK_RUN.creditShare * companyArr(s));
    const r = cmd.resolveIncident(s, inc.id, 'credits');
    expect(r.ok).toBe(true);
    expect(s.incidents.bankRunWeeksLeft).toBeUndefined();
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
