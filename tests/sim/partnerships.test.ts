// Payroll and student partnerships (SIMULATION §13.7): fee formula, the
// participation curve, balances converging, termination and runoff, renewal,
// amortization, the balance identity and a save round-trip.
import { describe, expect, it } from 'vitest';
import {
  DEPOSIT_PER_EMPLOYEE,
  MANAGER_SKILL,
  PARTICIPATION,
  PARTNER_CONTRACT_WEEKS,
  PARTNER_HEALTH,
  PARTNER_RUNOFF_WEEKS,
  STUDENT_PARTNERSHIP,
} from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { balanceSheet, intangibleAssets, totalDeposits } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { hiresPerWeek, staffMods } from '../../src/sim/hq';
import { refreshManagerPool } from '../../src/sim/people';
import { newGame } from '../../src/sim/newGame';
import { balanceTarget, participation, renewalFee, signingFee } from '../../src/sim/partnerships';
import { liquidAssets } from '../../src/sim/treasury';
import { exportCode, importCode } from '../../src/sim/save/serialize';
import type { GameState, Site } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

function setup() {
  const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Partner Bank' });
  const branchId = openScriptedBranch(s, 'midtown');
  // Extra paid-in capital so fees are affordable (keeps the balance identity).
  s.company.paidInCapital += 5_000_000;
  s.company.cash += 5_000_000;
  advanceWeeks(s, 2);
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
  const employer = sites.find((x) => x.kind === 'employer')!;
  const university = sites.find((x) => x.kind === 'university')!;
  return { s, branchId, employer, university };
}

const identity = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

function sign(s: GameState, site: Site, branchId: string, kind: 'payroll' | 'student' = 'payroll') {
  const r = cmd.signPartnership(s, site.id, branchId, 'savings', kind);
  if (!r.ok) throw new Error(r.reason);
  return s.partnerships[r.partnershipId]!;
}

describe('partnership formulas', () => {
  it('prices the signing fee per CONTENT §14', () => {
    const { s, employer, university } = setup();
    const e = employer.employer!;
    expect(signingFee(s, employer, 'payroll')).toBeCloseTo(
      e.employees * 160 * e.incomeMult * CITIES.cal!.incomeIndex,
      6,
    );
    expect(signingFee(s, university, 'student')).toBeCloseTo(
      STUDENT_PARTNERSHIP.students.M * STUDENT_PARTNERSHIP.feePerStudent * CITIES.cal!.incomeIndex,
      6,
    );
  });

  it('follows the participation curve', () => {
    const L = PARTNER_CONTRACT_WEEKS;
    expect(participation(0, L)).toBe(0);
    expect(participation(26, L)).toBeGreaterThan(0.2);
    expect(participation(26, L)).toBeLessThan(0.45);
    expect(participation(52, L)).toBeCloseTo(PARTICIPATION.rampTo, 9);
    expect(participation(104, L)).toBeCloseTo(PARTICIPATION.peak, 9);
    expect(participation(L - 104, L)).toBeCloseTo(PARTICIPATION.peak, 9);
    expect(participation(L, L)).toBeCloseTo(PARTICIPATION.end, 9);
    // Monotone up through the ramp.
    for (let t = 1; t <= 104; t++)
      expect(participation(t, L)).toBeGreaterThanOrEqual(participation(t - 1, L));
  });

  it('scales the balance target with health', () => {
    const { employer } = setup();
    const e = employer.employer!;
    const at = (h: number) => balanceTarget(employer, 'payroll', 0.8, h);
    expect(at(100)).toBeCloseTo(
      e.employees * 0.8 * DEPOSIT_PER_EMPLOYEE * e.incomeMult * CITIES.cal!.incomeIndex * 1.1,
      4,
    );
    expect(at(0)).toBeCloseTo(at(100) * (0.5 / 1.1), 4);
  });
});

describe('payroll partnerships', () => {
  it('signs: cash becomes an intangible, the rival loses the payroll, books balance', () => {
    const { s, branchId, employer } = setup();
    employer.employer!.partnerRivalId = Object.keys(s.rivals)[0];
    const cash = s.company.cash;
    const before = identity(s);
    const p = sign(s, employer, branchId);
    expect(s.company.cash).toBeCloseTo(cash - p.fee, 6);
    expect(intangibleAssets(s)).toBeCloseTo(p.fee, 6);
    expect(employer.employer!.partnerRivalId).toBeUndefined();
    expect(identity(s)).toBeLessThan(Math.max(1, before + 1));
    expect(s.events.log.some((e) => e.type === 'PARTNERSHIP_SIGNED')).toBe(true);
    const again = cmd.signPartnership(s, employer.id, branchId, 'savings');
    expect(again.ok).toBe(false);
  });

  it('refuses without a branch in the city or enough cash', () => {
    const { s, branchId, employer } = setup();
    expect(cmd.signPartnership(s, employer.id, 'nope', 'savings').ok).toBe(false);
    expect(cmd.signPartnership(s, employer.id, branchId, 'mortgage').ok).toBe(false);
    s.company.cash = 10;
    const r = cmd.signPartnership(s, employer.id, branchId, 'savings');
    expect(r.ok).toBe(false);
  });

  it('grows deposits toward target through liquid assets, keeping the identity', () => {
    const { s, branchId, employer } = setup();
    const p = sign(s, employer, branchId);
    for (let w = 0; w < 60; w++) {
      advanceWeeks(s, 1);
      expect(identity(s)).toBeLessThan(1);
    }
    const t = s.clock.week - p.startWeek;
    const target = balanceTarget(employer, 'payroll', participation(t, p.termWeeks), p.health);
    expect(p.balance).toBeGreaterThan(0.8 * target);
    expect(p.balance).toBeLessThan(1.05 * target);
    expect(p.accounts).toBeGreaterThan(0.5 * employer.employer!.employees * 0.65);
    expect(totalDeposits(s)).toBeGreaterThan(p.balance);
    // Liquidity reads the partnership deposits too.
    expect(s.company.liquidityRatio).toBeCloseTo(liquidAssets(s) / totalDeposits(s), 9);
    const snap = s.history.weekly.at(-1)!;
    expect(snap.pnl.amortization).toBeGreaterThan(0);
  });

  it('terminates after 8 weeks of low health and runs off over 12 weeks', () => {
    const { s, branchId, employer } = setup();
    const p = sign(s, employer, branchId);
    advanceWeeks(s, 30);
    const peak = p.balance;
    expect(peak).toBeGreaterThan(0);
    // Stop offering the package: c_package = −2 drags health down.
    s.branches[branchId]!.offered.savings!.on = false;
    p.health = PARTNER_HEALTH.terminateBelow - 1;
    let weeks = 0;
    while (p.status === 'active' && weeks < 20) {
      advanceWeeks(s, 1);
      weeks++;
    }
    expect(p.status).toBe('runoff');
    expect(weeks).toBe(PARTNER_HEALTH.terminateWeeks);
    expect(p.unamortized).toBe(0);
    const ended = s.events.log.find((e) => e.type === 'PARTNERSHIP_ENDED');
    expect(ended?.payload.reason).toBe('terminated');
    // It ran off one week already; it is gone after the remaining weeks.
    advanceWeeks(s, PARTNER_RUNOFF_WEEKS - 2);
    expect(s.partnerships[p.id]).toBeDefined();
    advanceWeeks(s, 1);
    expect(s.partnerships[p.id]).toBeUndefined();
    expect(identity(s)).toBeLessThan(1);
  });

  it('renews in the last year at fee × (1.5 − health/100) and amortizes every fee', () => {
    const { s, branchId, employer } = setup();
    const p = sign(s, employer, branchId);
    const fee0 = p.fee;
    let amortized = 0;
    const tally = () => (amortized += s.history.weekly.at(-1)!.pnl.amortization);
    advanceWeeks(s, 1);
    tally();
    expect(cmd.renewPartnership(s, p.id).ok).toBe(false);
    // Over 13 game years rivals expand around the lone host branch; hold health
    // above the termination line so the deal runs to its term.
    const steadyHealth = () => (p.health = Math.max(p.health, 60));
    for (let w = 1; w < PARTNER_CONTRACT_WEEKS - 52; w++) {
      steadyHealth();
      advanceWeeks(s, 1);
      tally();
    }
    const quote = renewalFee(s, employer, p);
    expect(quote).toBeCloseTo(signingFee(s, employer, 'payroll') * (1.5 - p.health / 100), 6);
    const r = cmd.renewPartnership(s, p.id);
    expect(r.ok).toBe(true);
    expect(p.termWeeks).toBe(2 * PARTNER_CONTRACT_WEEKS);
    expect(p.fee).toBeCloseTo(fee0 + quote, 6);
    while (s.partnerships[p.id]?.status === 'active') {
      steadyHealth();
      advanceWeeks(s, 1);
      tally();
    }
    expect(amortized).toBeCloseTo(fee0 + quote, 2);
    expect(
      s.events.log.some((e) => e.type === 'PARTNERSHIP_ENDED' && e.payload.reason === 'lapsed'),
    ).toBe(true);
    expect(identity(s)).toBeLessThan(1);
  });

  it('releases on request and moves to another branch when the host closes', () => {
    const { s, branchId, employer, university } = setup();
    // Any free lot: rivals often hold every downtown corner.
    const other = openScriptedBranch(s);
    advanceWeeks(s, 2);
    const p = sign(s, employer, branchId);
    const q = sign(s, university, branchId, 'student');
    advanceWeeks(s, 10);
    expect(cmd.closeBranch(s, branchId).ok).toBe(true);
    advanceWeeks(s, 1);
    expect(p.hostBranchId).toBe(other);
    expect(p.status).toBe('active');
    expect(cmd.releasePartnership(s, q.id).ok).toBe(true);
    expect(q.status).toBe('runoff');
    expect(cmd.releasePartnership(s, q.id).ok).toBe(false);
    advanceWeeks(s, 2);
    expect(identity(s)).toBeLessThan(1);
  });

  it('round-trips a save with an active partnership', () => {
    const { s, branchId, employer } = setup();
    sign(s, employer, branchId);
    advanceWeeks(s, 5);
    const back = importCode(exportCode(s));
    expect(back).toEqual(s);
  });
});

describe('graduate program', () => {
  it('lifts candidate skill by 10 and adds a hire per week', () => {
    const { s, university } = setup();
    const a = structuredClone(s);
    const b = structuredClone(s);
    expect(cmd.startGradProgram(b, university.id).ok).toBe(true);
    refreshManagerPool(a, 'cal', true);
    refreshManagerPool(b, 'cal', true);
    const pa = a.people.managerCandidates.cal!;
    const pb = b.people.managerCandidates.cal!;
    for (let i = 0; i < pa.length; i++) {
      const sa = pa[i]!.skills.people;
      const sb = pb[i]!.skills.people;
      expect(sb).toBe(Math.min(MANAGER_SKILL.max, Math.max(MANAGER_SKILL.min, sa + 10)));
    }
    expect(hiresPerWeek(1, staffMods(b)) - hiresPerWeek(1, staffMods(a))).toBe(1);
  });

  it('charges up front and yearly, and ends on request', () => {
    const { s, university } = setup();
    const cash = s.company.cash;
    expect(cmd.startGradProgram(s, university.id).ok).toBe(true);
    const cost = cash - s.company.cash;
    expect(cost).toBeCloseTo(120_000 * CITIES.cal!.wageIndex, 6);
    expect(cmd.startGradProgram(s, university.id).ok).toBe(false);
    expect(s.events.log.some((e) => e.type === 'GRAD_PROGRAM' && e.payload.started)).toBe(true);

    const due = s.company.gradProgram!.renewWeek;
    advanceWeeks(s, due - s.clock.week - 1);
    expect(s.history.weekly.at(-1)!.pnl.benefits).toBeLessThan(cost);
    advanceWeeks(s, 1);
    expect(s.history.weekly.at(-1)!.pnl.benefits).toBeGreaterThanOrEqual(cost - 1);
    expect(s.company.gradProgram!.renewWeek).toBe(due + 52);
    expect(cmd.endGradProgram(s).ok).toBe(true);
    expect(s.company.gradProgram).toBeUndefined();
    expect(cmd.endGradProgram(s).ok).toBe(false);
    expect(identity(s)).toBeLessThan(1);
  });
});
