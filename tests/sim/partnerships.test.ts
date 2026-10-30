// Student partnerships (SIMULATION §13.7): fee formula, the participation
// curve, ARR converging, termination and runoff, renewal, amortization, the
// balance identity and a save round-trip. Staff-plan (payroll) deals with
// employers are refused: an employer's one deal is its anchor account (B1).
import { describe, expect, it } from 'vitest';
import {
  MANAGER_SKILL,
  PARTICIPATION,
  PARTNER_CONTRACT_WEEKS,
  PARTNER_HEALTH,
  PARTNER_RUNOFF_WEEKS,
  STUDENT_PARTNERSHIP,
} from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { balanceSheet, intangibleAssets } from '../../src/sim/balanceSheet';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { hiresPerWeek, staffMods } from '../../src/sim/hq';
import { refreshManagerPool } from '../../src/sim/people';
import { newGame } from '../../src/sim/newGame';
import {
  balanceTarget,
  headcount,
  participation,
  renewalFee,
  signingFee,
} from '../../src/sim/partnerships';
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

function sign(s: GameState, site: Site, branchId: string) {
  const r = cmd.signPartnership(s, site.id, branchId, 'team', 'student');
  if (!r.ok) throw new Error(r.reason);
  return s.partnerships[r.partnershipId]!;
}

describe('partnership formulas', () => {
  it('prices the signing fee per SIMULATION §13.7', () => {
    const { s, university } = setup();
    expect(headcount(university, 'student')).toBe(STUDENT_PARTNERSHIP.students.M);
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
    const { university } = setup();
    const at = (h: number) => balanceTarget(university, 'student', 0.8, h);
    expect(at(100)).toBeCloseTo(
      STUDENT_PARTNERSHIP.students.M *
        0.8 *
        STUDENT_PARTNERSHIP.arrPerStudent *
        CITIES.cal!.incomeIndex *
        1.1,
      4,
    );
    expect(at(0)).toBeCloseTo(at(100) * (0.5 / 1.1), 4);
  });
});

describe('staff-plan deals are retired', () => {
  it('refuses a payroll partnership anywhere, pointing at the Deal Desk', () => {
    const { s, branchId, employer, university } = setup();
    for (const site of [employer, university]) {
      const r = cmd.signPartnership(s, site.id, branchId, 'team', 'payroll');
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/Deal Desk/);
    }
    expect(Object.keys(s.partnerships)).toHaveLength(0);
  });

  it('only lets universities sign a student partnership', () => {
    const { s, branchId, employer } = setup();
    const r = cmd.signPartnership(s, employer.id, branchId, 'team', 'student');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/universities/);
  });
});

describe('student partnerships', () => {
  it('signs: cash becomes an intangible and the books balance', () => {
    const { s, branchId, university } = setup();
    const cash = s.company.cash;
    const before = identity(s);
    const p = sign(s, university, branchId);
    expect(p.kind).toBe('student');
    expect(s.company.cash).toBeCloseTo(cash - p.fee, 6);
    expect(intangibleAssets(s)).toBeCloseTo(p.fee, 6);
    expect(identity(s)).toBeLessThan(Math.max(1, before + 1));
    expect(s.events.log.some((e) => e.type === 'PARTNERSHIP_SIGNED')).toBe(true);
    const again = cmd.signPartnership(s, university.id, branchId, 'team', 'student');
    expect(again.ok).toBe(false);
  });

  it('refuses without a branch in the city or enough cash', () => {
    const { s, branchId, university } = setup();
    expect(cmd.signPartnership(s, university.id, 'nope', 'team', 'student').ok).toBe(false);
    // The package must be a paid plan: not the API, not the free tier.
    expect(cmd.signPartnership(s, university.id, branchId, 'api', 'student').ok).toBe(false);
    expect(cmd.signPartnership(s, university.id, branchId, 'free_tier', 'student').ok).toBe(false);
    s.company.cash = 10;
    const r = cmd.signPartnership(s, university.id, branchId, 'team', 'student');
    expect(r.ok).toBe(false);
  });

  it('grows ARR toward target and bills it as plan fees, keeping the identity', () => {
    const { s, branchId, university } = setup();
    const p = sign(s, university, branchId);
    for (let w = 0; w < 60; w++) {
      advanceWeeks(s, 1);
      expect(identity(s)).toBeLessThan(1);
    }
    const t = s.clock.week - p.startWeek;
    const target = balanceTarget(university, 'student', participation(t, p.termWeeks), p.health);
    expect(p.balance).toBeGreaterThan(0.8 * target);
    expect(p.balance).toBeLessThan(1.05 * target);
    expect(p.accounts).toBeGreaterThan(0.5 * headcount(university, 'student') * 0.65);
    const snap = s.history.weekly.at(-1)!;
    // The student plans bill a week of their ARR on top of the office's own plans.
    expect(snap.pnl.accountFees).toBeGreaterThan(p.balance / 52);
    expect(snap.pnl.amortization).toBeGreaterThan(0);
  });

  it('terminates after 8 weeks of low health and runs off over 12 weeks', () => {
    const { s, branchId, university } = setup();
    const p = sign(s, university, branchId);
    advanceWeeks(s, 30);
    const peak = p.balance;
    expect(peak).toBeGreaterThan(0);
    // Stop offering the package: c_package = −2 drags health down.
    s.branches[branchId]!.offered.team!.on = false;
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
    const { s, branchId, university } = setup();
    const p = sign(s, university, branchId);
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
    const quote = renewalFee(s, university, p);
    expect(quote).toBeCloseTo(signingFee(s, university, 'student') * (1.5 - p.health / 100), 6);
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

  it('releases on request and runs off when the host office closes', () => {
    const { s, branchId, university } = setup();
    // C2a: one office per city, so the other office is in Saskatoon and can't host Calgary sites.
    expect(cmd.travelTo(s, 'sas').ok).toBe(true);
    openScriptedBranch(s);
    advanceWeeks(s, 2);
    const q = sign(s, university, branchId);
    advanceWeeks(s, 10);
    expect(cmd.releasePartnership(s, q.id).ok).toBe(true);
    expect(q.status).toBe('runoff');
    expect(cmd.releasePartnership(s, q.id).ok).toBe(false);
    // A released deal frees the university for a new one.
    const p = sign(s, university, branchId);
    expect(cmd.closeBranch(s, branchId).ok).toBe(true);
    advanceWeeks(s, 1);
    expect(p.status).toBe('runoff');
    advanceWeeks(s, 2);
    expect(identity(s)).toBeLessThan(1);
  });

  it('round-trips a save with an active partnership', () => {
    const { s, branchId, university } = setup();
    sign(s, university, branchId);
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
