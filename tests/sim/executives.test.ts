// Executives (SIMULATION §17.2): candidate pools, execMult on HQ coverage,
// payroll, equity grants (expense, vesting, exercise) with the balance identity,
// the resignation formula, EXEC_POACHED, firing, the CTO and the CFO.
import { describe, expect, it } from 'vitest';
import {
  APP_RATING,
  CANDIDATE_REROLL,
  EXEC_PAY,
  EXECUTIVES,
  GRAD_PROGRAM,
  WEEKS_PER_YEAR,
} from '../../src/config/balance';
import { INCIDENT_PARAMS } from '../../src/data/incidents';
import * as cmd from '../../src/sim/commands';
import { ctoTerm } from '../../src/sim/company';
import { advanceWeeks, weeklyTick } from '../../src/sim/engine';
import { refreshExecCandidates } from '../../src/sim/execCandidates';
import { runGrants, VEST_WEEKS } from '../../src/sim/execGrants';
import { execMarketSalary, execMult, execMultOf, resignChance } from '../../src/sim/execSeats';
import { execRerollFee } from '../../src/sim/candidateRerolls';
import { staffEff, statementDelayWeeks } from '../../src/sim/hq';
import { incidentChance, raiseIncident } from '../../src/sim/incidents';
import { sharesHeld } from '../../src/sim/shares';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type Executive, type GameState } from '../../src/sim/state';
import { execGame, hire, holderTotal, identityGap } from '../helpers/executives';

/** Advances exactly one week of ticks without the rest of the engine's randomness mattering. */
const tick = (s: GameState) => {
  s.clock.day += 7;
  s.clock.week = s.clock.day / 7;
  weeklyTick(s);
};

describe('candidate pools', () => {
  it('fills every seat once there is an Executive floor, skills in range', () => {
    const s = execGame();
    for (const seat of ['coo', 'cfo', 'cpo', 'cmo', 'cto', 'cro', 'creo'] as const) {
      const pool = s.executives.candidates[seat]!;
      expect(pool).toHaveLength(EXECUTIVES.candidatesPerSeat);
      for (const c of pool) {
        for (const v of [c.leadership, c.expertise, c.loyalty]) {
          expect(v).toBeGreaterThanOrEqual(EXECUTIVES.skillRange[0]);
          expect(v).toBeLessThanOrEqual(EXECUTIVES.skillRange[1]);
        }
        expect(c.salary % EXEC_PAY.salaryStep).toBe(0);
      }
    }
  });

  it('adds the graduate program bonus to new candidates', () => {
    const s = execGame();
    s.company.gradProgram = { siteId: 'x', university: 'U', renewWeek: 999 } as never;
    refreshExecCandidates(s, true);
    const all = Object.values(s.executives.candidates).flat();
    expect(Math.min(...all.map((c) => c!.expertise))).toBeGreaterThanOrEqual(
      EXECUTIVES.skillRange[0] + GRAD_PROGRAM.skillBonus,
    );
  });

  it("pays a recruiter for a seat's new candidates, doubling until the free refresh", () => {
    const s = execGame();
    const old = s.executives.candidates.cfo!.map((c) => c.id);
    const others = s.executives.candidates.cmo!.map((c) => c.id);
    const fee = execRerollFee(s, 'cfo');
    expect(fee).toBe(Math.round((execMarketSalary(s) * CANDIDATE_REROLL.feeShare) / 100) * 100);
    const cash = s.company.cash;
    const r = cmd.rerollExecCandidates(s, 'cfo');
    expect(r.ok && r.fee).toBe(fee);
    expect(s.company.cash).toBeCloseTo(cash - fee);
    const fresh = s.executives.candidates.cfo!;
    expect(fresh).toHaveLength(EXECUTIVES.candidatesPerSeat);
    expect(fresh.some((c) => old.includes(c.id))).toBe(false);
    expect(s.executives.candidates.cmo!.map((c) => c.id)).toEqual(others);
    expect(Math.abs(execRerollFee(s, 'cfo') - fee * CANDIDATE_REROLL.growth)).toBeLessThanOrEqual(
      100,
    );
    expect(execRerollFee(s, 'cmo')).toBe(fee);
    refreshExecCandidates(s, true);
    expect(execRerollFee(s, 'cfo')).toBe(fee);
    s.company.cash = fee - 1;
    expect(cmd.rerollExecCandidates(s, 'cfo').ok).toBe(false);
    s.company.cash = fee * 10;
    hire(s, 'cfo');
    expect(cmd.rerollExecCandidates(s, 'cfo').ok).toBe(false);
  });

  it('adds reroll counts to v16 saves', () => {
    const s = execGame();
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    delete (raw.people as Partial<GameState['people']>).rerolls;
    delete (raw.executives as Partial<GameState['executives']>).rerolls;
    raw.schemaVersion = 16;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.people.rerolls).toEqual({});
    expect(up.executives.rerolls).toEqual({});
    expect(cmd.rerollExecCandidates(up, 'cfo').ok).toBe(true);
  });

  it('refuses to hire without an Executive floor', () => {
    const s = execGame();
    const c = s.executives.candidates.coo![0]!;
    delete s.departments.executive;
    expect(cmd.hireExec(s, 'coo', c.id).ok).toBe(false);
  });
});

describe('execMult (§17.2)', () => {
  it('is 0.9 + 0.25 × expertise/100', () => {
    expect(execMultOf(0)).toBeCloseTo(0.9);
    expect(execMultOf(80)).toBeCloseTo(1.1);
    expect(execMultOf(100)).toBeCloseTo(1.15);
  });

  it('scales the effective staff of the seat’s departments only', () => {
    const s = execGame(['hr', 'it']);
    for (const id of ['hr', 'it'] as const) {
      s.departments[id]!.staff = 10;
      s.departments[id]!.skill = 60;
    }
    const before = staffEff(s, s.departments.hr!);
    const itBefore = staffEff(s, s.departments.it!);
    const coo = hire(s, 'coo');
    expect(execMult(s, 'hr')).toBeCloseTo(execMultOf(coo.expertise));
    expect(staffEff(s, s.departments.hr!)).toBeCloseTo(before * execMultOf(coo.expertise));
    expect(staffEff(s, s.departments.it!)).toBeCloseTo(itBefore);
  });
});

describe('payroll and firing', () => {
  it('pays salaries weekly into execPay and keeps the identity', () => {
    const s = execGame();
    const coo = hire(s, 'coo');
    const cfo = hire(s, 'cfo');
    advanceWeeks(s, 2);
    const last = s.history.weekly.at(-1)!;
    const expected = (coo.salary + cfo.salary + s.governance.ceoSalary) / WEEKS_PER_YEAR;
    expect(last.pnl.execPay).toBeCloseTo(expected, 4);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('fires with severance of severanceWeeks of salary', () => {
    const s = execGame();
    const cmo = hire(s, 'cmo');
    const before = s.ledger.pnl.execPay;
    const r = cmd.fireExec(s, 'cmo');
    expect(r.ok).toBe(true);
    const severance = (cmo.salary * EXECUTIVES.severanceWeeks) / WEEKS_PER_YEAR;
    expect(s.ledger.pnl.execPay - before).toBeCloseTo(severance);
    expect(s.executives.seats.cmo).toBeUndefined();
    expect(s.events.log.at(-1)!.type).toBe('EXEC_FIRED');
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('bounds salaries by the market', () => {
    const s = execGame();
    hire(s, 'cro');
    const b = cmd.execSalaryBounds(s);
    expect(cmd.setExecSalary(s, 'cro', b.max + EXEC_PAY.salaryStep).ok).toBe(false);
    expect(cmd.setExecSalary(s, 'cro', b.min).ok).toBe(true);
    expect(s.executives.seats.cro!.salary).toBe(b.min);
  });
});

/** An executive who never resigns, for long grant runs. */
const loyal = (e: Executive) => {
  e.loyalty = EXECUTIVES.resignLoyalty * 100;
  return e;
};

describe('equity grants', () => {
  it('expenses RSUs straight-line, vests 25% a year and keeps the cap table whole', () => {
    const s = execGame();
    const coo = loyal(hire(s, 'coo'));
    const shares = 40_000;
    const start = s.company.sharesOutstanding;
    expect(cmd.addGrant(s, 'coo', 'rsu', shares).ok).toBe(true);
    const g = coo.grants[0]!;
    expect(g.fairValue).toBeCloseTo(s.stock.price);
    const paidIn = s.company.paidInCapital;
    for (let w = 0; w < VEST_WEEKS; w++) {
      tick(s);
      expect(identityGap(s)).toBeLessThan(1);
      expect(holderTotal(s)).toBe(s.company.sharesOutstanding);
      if (w + 1 === WEEKS_PER_YEAR) {
        expect(g.vested).toBe(shares / 4);
        expect(sharesHeld(s, coo.id)).toBe(shares / 4);
      }
    }
    expect(g.vested).toBe(shares);
    expect(s.company.sharesOutstanding).toBe(start + shares);
    expect(g.expensed).toBeCloseTo(shares * g.fairValue, 6);
    expect(s.company.paidInCapital - paidIn).toBeCloseTo(shares * g.fairValue, 6);
  });

  it('exercises vested options only while in the money', () => {
    const s = execGame();
    const cfo = loyal(hire(s, 'cfo'));
    const price = s.stock.price;
    // A strike far above anything the private valuation reaches in a year.
    const strike = price * 50;
    cmd.addGrant(s, 'cfo', 'option', 10_000, strike);
    const g = cfo.grants[0]!;
    expect(g.fairValue).toBeCloseTo(price * EXEC_PAY.optionMinValue);
    for (let w = 0; w < WEEKS_PER_YEAR; w++) tick(s);
    expect(g.vested).toBe(2_500);
    expect(g.exercised).toBe(0);
    // The share price rises above the strike: the vested part is exercised.
    s.stock.price = strike * 1.5;
    const cash = s.company.cash;
    const paidIn = s.company.paidInCapital;
    runGrants(s);
    expect(g.exercised).toBe(2_500);
    expect(s.company.cash - cash).toBeCloseTo(2_500 * strike);
    expect(s.company.paidInCapital - paidIn).toBeGreaterThanOrEqual(2_500 * strike);
    expect(sharesHeld(s, cfo.id)).toBe(2_500);
    expect(holderTotal(s)).toBe(s.company.sharesOutstanding);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('forfeits unvested grants when the executive leaves', () => {
    const s = execGame();
    hire(s, 'cpo');
    cmd.addGrant(s, 'cpo', 'rsu', 8_000);
    const shares = s.company.sharesOutstanding;
    cmd.fireExec(s, 'cpo');
    advanceWeeks(s, 60);
    expect(s.company.sharesOutstanding).toBe(shares);
  });

  it('rejects grants above the cap or without a strike', () => {
    const s = execGame();
    hire(s, 'cmo');
    const max = cmd.maxGrantShares(s);
    expect(cmd.addGrant(s, 'cmo', 'rsu', max + 1).ok).toBe(false);
    expect(cmd.addGrant(s, 'cmo', 'option', 1_000, 0).ok).toBe(false);
  });
});

describe('resignation (§17.2)', () => {
  const exec = { loyalty: 60, salary: 100_000, grants: [] } as unknown as Executive;
  it('follows 0.002 × (1.5 − loyalty/100) × underpaid × grants', () => {
    expect(resignChance(exec, 100_000)).toBeCloseTo(0.002 * 0.9);
    expect(resignChance(exec, 120_000)).toBeCloseTo(0.002 * 0.9 * 2);
    const granted = {
      ...exec,
      grants: [{ shares: 100, vested: 0 }],
    } as unknown as Executive;
    expect(resignChance(granted, 120_000)).toBeCloseTo(0.002 * 0.9 * 2 * 0.5);
  });
});

describe('EXEC_POACHED', () => {
  const poach = (s: GameState, seat: 'cto' | 'coo') => {
    const e = s.executives.seats[seat]!;
    return raiseIncident(s, 'EXEC_POACHED', 'company', seat, {
      seat,
      execId: e.id,
      name: e.name,
      title: 'Officer',
      rival: 'Granite Trust',
    })!;
  };

  it('counter-offer raises salary 25% and loyalty 10', () => {
    const s = execGame();
    const coo = hire(s, 'coo');
    const salary = coo.salary;
    const loyalty = coo.loyalty;
    const inc = poach(s, 'coo');
    expect(cmd.resolveIncident(s, inc.id, 'counter').ok).toBe(true);
    expect(coo.salary).toBeCloseTo(salary * (1 + EXECUTIVES.counterRaise), -4);
    expect(coo.loyalty).toBe(Math.min(100, loyalty + EXECUTIVES.counterLoyalty));
    expect(s.executives.seats.coo).toBe(coo);
  });

  it('letting them go empties the seat; an empty CTO seat then drags the app rating', () => {
    const s = execGame();
    const cto = hire(s, 'cto');
    expect(ctoTerm(s)).toBeCloseTo((APP_RATING.ctoBonus * cto.expertise) / 100);
    const inc = poach(s, 'cto');
    cmd.resolveIncident(s, inc.id, 'release');
    expect(s.executives.seats.cto).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'EXEC_RESIGNED')).toBe(true);
    expect(ctoTerm(s)).toBeCloseTo(-APP_RATING.ctoVacancy);
  });
});

describe('CTO and CFO hooks', () => {
  it('breach odds read the CTO’s expertise (vacant seat = vacantCtoExpertise)', () => {
    const s = execGame();
    const b = Object.values(s.branches)[0]!;
    b.status = 'open';
    b.customers = 2_000;
    const vacant = incidentChance(s, 'DATA_BREACH', 'company');
    const cto = hire(s, 'cto');
    const seated = incidentChance(s, 'DATA_BREACH', 'company');
    const base = INCIDENT_PARAMS.DATA_BREACH.ctoBase;
    expect(seated / vacant).toBeCloseTo(
      (base - cto.expertise / 100) / (base - EXECUTIVES.vacantCtoExpertise / 100),
    );
  });

  it('a seated CFO halves statement delays (rounded up)', () => {
    const s = execGame();
    s.hq.coverage.finance = { required: 10, k: 0.5, kPrime: 0.5, eff: 0.5 };
    const delay = statementDelayWeeks(s);
    expect(delay).toBeGreaterThan(0);
    hire(s, 'cfo');
    expect(statementDelayWeeks(s)).toBe(Math.ceil(delay / 2));
  });
});

describe('releasing the Executive suite', () => {
  it('lets every executive go with severance', () => {
    const s = execGame();
    hire(s, 'coo');
    hire(s, 'cto');
    const office = Object.values(s.offices)[0]!;
    const floor = office.floors.indexOf('executive');
    expect(cmd.releaseFloor(s, office.id, floor).ok).toBe(true);
    expect(s.executives.seats.coo).toBeUndefined();
    expect(s.executives.seats.cto).toBeUndefined();
    expect(s.events.log.filter((e) => e.type === 'EXEC_FIRED')).toHaveLength(2);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('delegation defaults and seat memory (schema v13)', () => {
  it('a new hire starts with every delegation on', () => {
    const s = execGame();
    const coo = hire(s, 'coo');
    expect(Object.values(coo.delegations).every(Boolean)).toBe(true);
  });

  it('a seat remembers its last holder’s toggles for the next hire', () => {
    const s = execGame();
    hire(s, 'cfo');
    cmd.setExecDelegation(s, 'cfo', 'dividends', false);
    cmd.setExecDelegation(s, 'cfo', 'capital', false);
    cmd.fireExec(s, 'cfo');
    expect(s.executives.remembered.cfo).toMatchObject({
      treasury: true,
      capital: false,
      dividends: false,
    });
    refreshExecCandidates(s, true);
    const next = hire(s, 'cfo');
    expect(next.delegations).toMatchObject({ treasury: true, capital: false, dividends: false });
  });
});

describe('migration 13 → 14', () => {
  it('splits Share sales out of the CFO’s Capital switch without changing what it does', () => {
    const s = execGame();
    const cfo = hire(s, 'cfo');
    cfo.delegations.capital = false;
    s.executives.remembered.cfo = { treasury: true, capital: true, dividends: true };
    refreshExecCandidates(s, true);
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const ex = raw.executives as GameState['executives'];
    delete ex.seats.cfo!.delegations.shares;
    for (const c of ex.candidates.cfo ?? []) delete c.delegations.shares;
    const company = raw.company as GameState['company'];
    delete company.lastBuild;
    raw.schemaVersion = 13;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.executives.seats.cfo!.delegations.shares).toBe(false);
    expect(up.executives.remembered.cfo!.shares).toBe(true);
    expect(up.executives.candidates.cfo![0]!.delegations.shares).toBe(true);
    const newest = Object.values(up.branches).sort((a, b) => b.builtDay - a.builtDay)[0];
    expect(up.company.lastBuild).toEqual(newest?.build);
  });
});

describe('migration 12 → 13', () => {
  it('adds the new executive fields and switches waiting candidates on', () => {
    const s = execGame();
    refreshExecCandidates(s, true);
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    const ex = raw.executives as Record<string, unknown>;
    delete ex.remembered;
    delete ex.growthCities;
    delete ex.lastExpansionWeek;
    for (const pool of Object.values(ex.candidates as Record<string, Executive[]>))
      for (const c of pool) for (const id of Object.keys(c.delegations)) c.delegations[id] = false;
    raw.schemaVersion = 12;
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.executives).toMatchObject({
      remembered: {},
      growthCities: {},
      lastExpansionWeek: -1,
    });
    const first = up.executives.candidates.coo![0]!;
    expect(Object.values(first.delegations).every(Boolean)).toBe(true);
  });
});
