// HQ departments (SIMULATION §16.2–16.5): staffing, salaries, morale and skill
// for each floor's team, the founder-mode ramp, staffing requirements and the
// coverage every shortfall effect reads, plus HR benefits. Tick step 7.
import { hqUnits } from './branch/officeSize';
import {
  ATTRACTION_RANGE,
  BENEFIT_CAP,
  BENEFIT_FLATTEN,
  DEPT_DEFAULT_EFF,
  DEPT_REQUIREMENTS,
  DEPT_SKILL,
  EXEC_DELEGATION,
  FEATURES,
  FOUNDER_MODE_ASSETS,
  FOUNDER_RAMP,
  GRAD_PROGRAM,
  HIRE_BASE,
  HOURS_PER_WEEK,
  HQ_COVERAGE,
  HQ_EFFECTS,
  MORALE,
  QUIT_BASE,
  REMOTE_FRIDAY_STAFF,
  SKILL,
  START_STAFF_MORALE,
  TREASURY_PENALTY,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { BENEFIT_RULES, BENEFITS } from '../data/benefits';
import { CITIES } from '../data/cities';
import { DEPARTMENTS, HQ_DEPTS } from '../data/departments';
import { dpow, dtanh } from './detmath';
import { execMult, seated } from './execSeats';
import { totalWholesale } from './fundingLots';
import { riskCoverageBonus } from './incident/effects';
import { spend } from './ledger';
import { clamp, ema } from './math';
import { nominalIndex } from './nominal';
import type { Coverage, Department, DeptId, GameState, HqDeptId } from './state';

// ─── Size and requirements ────────────────────────────────────────────────────

/**
 * Your offices in HQ units (C2a): each open or fitting-out office counts its
 * size's hqUnits, so a Flagship weighs on HQ like four Starters.
 */
export function officeUnits(state: GameState): number {
  let units = 0;
  for (const b of Object.values(state.branches)) if (b.status !== 'closed') units += hqUnits(b);
  return units;
}

export function hqStaff(state: GameState): number {
  return Object.values(state.departments).reduce((n, d) => n + (d?.staff ?? 0), 0);
}

/** Everyone on the payroll: branch staff, branch managers and HQ staff. */
export function employeeCount(state: GameState): number {
  let n = hqStaff(state);
  for (const b of Object.values(state.branches)) if (b.status !== 'closed') n += b.staff.count;
  for (const m of Object.values(state.people.managers)) if (m.branchId) n += 1;
  return n;
}

/** Annual payroll across branches, managers and HQ (for % of salary benefits). */
export function annualPayroll(state: GameState): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    if (b.status !== 'closed')
      total += b.staff.count * b.staff.wage * HOURS_PER_WEEK * WEEKS_PER_YEAR;
  }
  for (const m of Object.values(state.people.managers)) if (m.branchId) total += m.salary;
  for (const d of Object.values(state.departments)) if (d) total += d.staff * d.salary;
  return total;
}

/** Founder-mode ramp (§16.3): requirements phase in from 3 to 6 office units, or at $250M assets. */
export function founderRamp(state: GameState): number {
  // With the HQ system switched off (FEATURES.hq), no requirements apply.
  if (!FEATURES.hq) return 0;
  const assets = state.history.weekly.at(-1)?.totals.assets ?? 0;
  if (assets >= FOUNDER_MODE_ASSETS) return 1;
  return clamp((officeUnits(state) - FOUNDER_RAMP.fromBranches) / FOUNDER_RAMP.overBranches, 0, 1);
}

/** Staff a department needs (CONTENT §9). */
export function requiredStaff(state: GameState, id: HqDeptId): number {
  const last = state.history.weekly.at(-1)?.totals;
  const assets = last?.assets ?? 0;
  const branches = officeUnits(state);
  const wholesale = totalWholesale(state);
  const r = DEPT_REQUIREMENTS;
  switch (id) {
    // +4 once listed: investor relations and quarterly filings (CONTENT §9).
    case 'finance':
      return (
        r.finance.base +
        r.finance.perBranch * branches +
        r.finance.perAssets * assets +
        (state.stock.status === 'public' ? r.finance.public : 0)
      );
    case 'hr':
      return r.hr.base + r.hr.perEmployee * employeeCount(state);
    case 'products':
      return (
        r.products.base +
        r.products.perBranch * branches +
        r.products.perDevelopment * state.products.developments.length
      );
    case 'treasury':
      return r.treasury.base + r.treasury.perFunding * ((last?.deposits ?? 0) + wholesale);
    case 'marketing':
      return (
        r.marketing.base +
        r.marketing.perBranch * branches +
        r.marketing.perCampaign * state.marketing.campaigns.length
      );
    case 'it':
      return r.it.base + r.it.perBranch * branches + r.it.perAssets * assets;
    case 'risk':
      return r.risk.base + r.risk.perBranch * branches + r.risk.perArr * (last?.arr ?? 0);
  }
}

// ─── Desks and salaries ───────────────────────────────────────────────────────

/** Desks across every floor this department holds, in every office. */
export function deptDesks(state: GameState, id: DeptId): number {
  let desks = 0;
  for (const o of Object.values(state.offices)) {
    for (const f of o.floors) {
      if (f === id) desks += DEPARTMENTS[id].fixedDesks ?? o.desksPerFloor;
    }
  }
  return desks;
}

/** The city that sets HQ salaries: the first office's, else the home city. */
export function hqCityId(state: GameState): string {
  return Object.values(state.offices)[0]?.cityId ?? state.meta.homeCityId;
}

/** Market pay for a department: base × the HQ city's wageIndex × its nominal index (§4.6). */
export function deptMarketSalary(state: GameState, id: DeptId): number {
  const cityId = hqCityId(state);
  return (
    DEPARTMENTS[id].marketSalary * (CITIES[cityId]?.wageIndex ?? 1) * nominalIndex(state, cityId)
  );
}

// ─── Coverage (§16.4) ─────────────────────────────────────────────────────────

/** Effective staff: headcount scaled by skill, morale, Remote Fridays and the seat's execMult (§16.4). */
export function staffEff(state: GameState, d: Department): number {
  const remote = state.people.benefits.remote_fri ? 1 - REMOTE_FRIDAY_STAFF : 1;
  return (
    d.staff *
    (HQ_COVERAGE.skillBase + (HQ_COVERAGE.skillSlope * d.skill) / 100) *
    (HQ_COVERAGE.moraleBase + (HQ_COVERAGE.moraleSlope * d.morale) / 100) *
    remote *
    execMult(state, d.id)
  );
}

export function computeCoverage(state: GameState, id: HqDeptId, ramp: number): Coverage {
  const d = state.departments[id];
  const required = requiredStaff(state, id);
  const k = Math.min(HQ_COVERAGE.kMax, (d ? staffEff(state, d) : 0) / Math.max(required, 0.01));
  // Consultants hired after a regulator audit lift Risk coverage′ for a while (§23).
  const extra = id === 'risk' ? riskCoverageBonus(state) : 0;
  const kPrime = Math.min(1, 1 - ramp * (1 - Math.min(k, 1)) + extra);
  const bonus = k > 1 ? Math.min(HQ_COVERAGE.bonusCap, (k - 1) * HQ_COVERAGE.bonusSlope) : 0;
  const eff = kPrime < 1 ? dpow(kPrime, HQ_COVERAGE.curve) : 1 + bonus;
  return { required, k, kPrime, eff };
}

export function fullCoverage(): Record<HqDeptId, Coverage> {
  const out = {} as Record<HqDeptId, Coverage>;
  for (const id of HQ_DEPTS) out[id] = { required: 0, k: 1, kPrime: 1, eff: 1 };
  return out;
}

export function updateCoverage(state: GameState): void {
  const ramp = founderRamp(state);
  state.hq.ramp = ramp;
  for (const id of HQ_DEPTS) state.hq.coverage[id] = computeCoverage(state, id, ramp);
}

/** effect(k′) for a department: 1 at full coverage, lower when short, up to 1.05 above. */
export function cov(state: GameState, id: HqDeptId): number {
  return state.hq.coverage[id]?.eff ?? 1;
}

/** Shortfall 0–1 for penalties of the form (1 − k′) × x. */
export function shortfall(state: GameState, id: HqDeptId): number {
  return Math.max(0, 1 - cov(state, id));
}

/** Default probabilities × (1 + 0.4(1 − k′)) while the Risk team is short (CONTENT §9). */
export function riskPdMult(state: GameState): number {
  return 1 + HQ_EFFECTS.riskPd * shortfall(state, 'risk');
}

/** Branch and brand campaign effects × (0.5 + 0.5 k′) (CONTENT §9, Marketing). */
export function campaignMult(state: GameState): number {
  return HQ_EFFECTS.campaignBase + (1 - HQ_EFFECTS.campaignBase) * cov(state, 'marketing');
}

/** Treasury penalty on funding spreads: (1 − k′) × 0.50% (§13.6). */
export function treasuryPenalty(state: GameState): number {
  return shortfall(state, 'treasury') * TREASURY_PENALTY;
}

/** Weeks of statements shown as Delayed (CONTENT §9, Finance); a seated CFO halves it (§17.2). */
export function statementDelayWeeks(state: GameState): number {
  const k = cov(state, 'finance');
  const delay =
    k < HQ_EFFECTS.financeDelayFrom
      ? Math.ceil((HQ_EFFECTS.financeDelayFrom - k) * HQ_EFFECTS.financeDelayScale)
      : 0;
  return seated(state, 'cfo') ? Math.ceil(delay * EXEC_DELEGATION.cfoDelayFactor) : delay;
}

// ─── Benefits (§16.5, CONTENT §10) ────────────────────────────────────────────

export interface StaffMods {
  /** Morale points added to every morale target (branches and HQ). */
  morale: number;
  /** Extra morale for HQ staff only. */
  hqMorale: number;
  /** Multiplier on quits. */
  quitMult: number;
  /** Multiplier on hires per week (HR coverage). */
  hireMult: number;
  /** Extra hires per week from a university graduate program (DESIGN §5.8.10). */
  hireBonus: number;
  /** Multiplier on weekly skill growth. */
  skillRiseMult: number;
  /** Added to the attraction ratio. */
  attraction: number;
  /** Branch rating added at every branch. */
  reputation: number;
}

/** A stated effect at `ref`, linear below it, half slope above, capped (CONTENT §10). */
export function scaledEffect(value: number, ref: number, effect: number): number {
  if (value <= 0 || ref <= 0) return 0;
  if (value <= ref) return (effect * value) / ref;
  return effect * Math.min(BENEFIT_CAP, 1 + (BENEFIT_FLATTEN * (value - ref)) / ref);
}

export function staffMods(
  state: GameState,
  benefits: Record<string, number> = state.people.benefits,
): StaffMods {
  const b = benefits;
  const mods: StaffMods = {
    morale: 0,
    hqMorale: 0,
    quitMult: 1,
    hireMult: Math.min(1, cov(state, 'hr')),
    hireBonus: state.company.gradProgram ? GRAD_PROGRAM.hireBonus : 0,
    skillRiseMult: 1,
    attraction: 0,
    reputation: 0,
  };
  for (const spec of Object.values(BENEFITS)) {
    const v = b[spec.id] ?? 0;
    if (v <= 0 || (spec.publicOnly && state.stock.status !== 'public')) continue;
    const e = spec.effects;
    const moraleGain = scaledEffect(v, spec.ref, e.morale ?? 0);
    if (spec.hqOnly) mods.hqMorale += moraleGain;
    else mods.morale += moraleGain;
    mods.attraction += scaledEffect(v, spec.ref, e.attraction ?? 0) / 100;
    mods.reputation += scaledEffect(v, spec.ref, e.reputation ?? 0);
    const retention = scaledEffect(v, spec.ref, e.retention ?? 0);
    mods.quitMult *= 1 - Math.min(1, retention);
  }
  // Explicit rules.
  const R = BENEFIT_RULES;
  const tuition = b.tuition ?? 0;
  mods.skillRiseMult += Math.min(R.tuitionSkillMax, (R.tuitionSkillPer1k * tuition) / 1000);
  if (tuition >= R.tuitionAttractionAt) mods.attraction += R.tuitionAttraction / 100;
  const pensionPts = (b.pension ?? 0) * 100;
  mods.quitMult *= 1 - Math.min(R.pensionRetentionMax, R.pensionRetentionPerPt * pensionPts);
  mods.morale += (pensionPts / 2) * R.pensionMoralePer2Pts;
  // HR shortfall drags morale everywhere.
  mods.morale -= shortfall(state, 'hr') * HQ_EFFECTS.hrMoralePenalty;
  return mods;
}

/** Estimated weekly cost of one benefit at a control value (shown on its card). */
export function benefitWeeklyCost(state: GameState, id: string, value: number): number {
  const spec = BENEFITS[id];
  if (!spec || value <= 0) return 0;
  const emp = spec.hqOnly ? hqStaff(state) : employeeCount(state);
  switch (spec.control) {
    case 'perYear':
      return (value * emp) / WEEKS_PER_YEAR;
    case 'perWeek':
      return value * emp;
    case 'pctSalary':
      return (value * annualPayroll(state)) / WEEKS_PER_YEAR;
    case 'discount':
      if (id === 'mortgage_disc') {
        return (
          (emp * BENEFIT_RULES.mortgageShare * BENEFIT_RULES.mortgageTicket * value) /
          WEEKS_PER_YEAR
        );
      }
      // Employee Stock Plan, public only: 0.5 × discount × payroll a year (CONTENT §10).
      if (id === 'espp' && state.stock.status === 'public') {
        return (BENEFIT_RULES.esppPayrollCost * value * annualPayroll(state)) / WEEKS_PER_YEAR;
      }
      return 0;
    case 'toggle':
      return 0;
  }
}

export function benefitsWeeklyCost(state: GameState): number {
  return Object.entries(state.people.benefits).reduce(
    (sum, [id, v]) => sum + benefitWeeklyCost(state, id, v),
    0,
  );
}

// ─── Department staff (§16.2, like §6.2–6.3) ──────────────────────────────────

function updateDepartment(state: GameState, d: Department, mods: StaffMods): void {
  const ratio = d.salary / deptMarketSalary(state, d.id);
  const moraleTarget = clamp(
    MORALE.base +
      MORALE.wageSwing * dtanh(MORALE.wageSteep * (ratio - 1)) +
      mods.morale +
      mods.hqMorale,
    0,
    100,
  );
  d.morale = ema(d.morale, moraleTarget, MORALE.ema);

  const sTarget =
    DEPT_SKILL.base +
    DEPT_SKILL.wageSwing * clamp((ratio - SKILL.wageFloor) / SKILL.wageRange, 0, 1);
  d.skill =
    d.skill < sTarget
      ? Math.min(sTarget, d.skill + SKILL.riseWeekly * mods.skillRiseMult)
      : Math.max(sTarget, d.skill - SKILL.fallWeekly);

  d.quitAccumulator += d.staff * QUIT_BASE * dpow(2 - d.morale / 100, 2) * mods.quitMult;
  const quits = Math.min(d.staff, Math.floor(d.quitAccumulator));
  d.quitAccumulator -= quits;
  d.staff -= quits;

  const target = Math.min(d.target, deptDesks(state, d.id));
  if (d.staff > target) d.staff = target;
  else if (d.staff < target) {
    const hires = Math.min(target - d.staff, hiresPerWeek(ratio, mods));
    d.skill = (d.skill * d.staff + SKILL.newHireFrac * sTarget * hires) / (d.staff + hires);
    d.staff += hires;
  }
}

/** Hires per week (§6.3): 1 + floor(2 × hrCoverage′ × attraction), attraction with benefits. */
export function hiresPerWeek(payRatio: number, mods: StaffMods): number {
  const attraction = clamp(payRatio + mods.attraction, ...ATTRACTION_RANGE);
  return HIRE_BASE + Math.floor(2 * mods.hireMult * attraction) + mods.hireBonus;
}

/** Tick step 7: department staffing and payroll, benefits, then coverage. */
export function runHq(state: GameState): void {
  const mods = staffMods(state);
  let payroll = 0;
  for (const d of Object.values(state.departments)) {
    // The Executive suite has no hired team: executives are paid in executives.ts.
    if (!d || d.id === 'executive') continue;
    updateDepartment(state, d, mods);
    payroll += (d.staff * d.salary) / WEEKS_PER_YEAR;
  }
  spend(state, 'hqStaff', payroll);
  for (const o of Object.values(state.offices)) spend(state, 'rent', o.weeklyRent);
  spend(state, 'benefits', benefitsWeeklyCost(state));
  updateCoverage(state);
}

/** A fresh department for a new floor, starting with a target that covers its requirement. */
export function newDepartment(state: GameState, id: DeptId): Department {
  const desks = deptDesks(state, id);
  const required = (HQ_DEPTS as readonly string[]).includes(id)
    ? requiredStaff(state, id as HqDeptId)
    : 0;
  return {
    id,
    staff: 0,
    // The Executive suite's desks are you and the seven executive seats, not hired staff.
    target:
      id === 'executive' ? 0 : Math.min(desks, Math.max(1, Math.ceil(required / DEPT_DEFAULT_EFF))),
    salary: Math.round(deptMarketSalary(state, id) / 1000) * 1000,
    skill: DEPT_SKILL.base,
    morale: START_STAFF_MORALE,
    quitAccumulator: 0,
  };
}
