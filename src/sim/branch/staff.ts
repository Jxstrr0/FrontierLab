// Branch staff, morale, skill, quits, hiring and capacity (SIMULATION §6).
import {
  BASE_TELLER_WAGE,
  CAPACITY_MORALE,
  CAPACITY_SKILL,
  HOURS_PER_WEEK,
  MORALE,
  QUIT_BASE,
  SERVICE_VISIT_RATE,
  SEVERANCE_WEEKS,
  SKILL,
  VISIT_APP,
} from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EQUIPMENT } from '../../data/equipment';
import { holdTopStaff } from '../devStaff';
import { hiresPerWeek, staffMods } from '../hq';
import { clamp, ema } from '../math';
import { nominalIndex } from '../nominal';
import type { Branch, GameState } from '../state';
import { dpow, dtanh } from '../detmath';
import { sizeMult } from './officeSize';

/** The market teller wage in a city: base × wageIndex × the nominal index (§6, §4.6). */
export function marketWage(state: GameState, cityId: string): number {
  return BASE_TELLER_WAGE * (CITIES[cityId]?.wageIndex ?? 1) * nominalIndex(state, cityId);
}

export function managerOf(state: GameState, branch: Branch) {
  return branch.managerId ? state.people.managers[branch.managerId] : undefined;
}

/** (Teller stations plus advisor offices) × the office's size (§6.4). */
export function staffNeeded(branch: Branch): number {
  const teller = EQUIPMENT[branch.build.teller];
  const lobby = EQUIPMENT[branch.build.lobby];
  return Math.round(((teller?.stations ?? 0) + (lobby?.advisorOffices ?? 0)) * sizeMult(branch));
}

/** Skill target S* (§6.3). */
export function skillTarget(state: GameState, branch: Branch): number {
  const ratio = branch.staff.wage / marketWage(state, branch.cityId);
  const people = managerOf(state, branch)?.skills.people ?? 0;
  return (
    SKILL.base +
    SKILL.wageSwing * clamp((ratio - SKILL.wageFloor) / SKILL.wageRange, 0, 1) +
    SKILL.managerPeople * people
  );
}

/** Severance for letting `n` office staff go: SEVERANCE_WEEKS of wages each. */
export function staffSeverance(branch: Branch, n: number): number {
  return n * branch.staff.wage * HOURS_PER_WEEK * SEVERANCE_WEEKS;
}

/**
 * Morale, skill, quits and hiring for one branch (§6.2–6.3). Returns the
 * severance owed for staff let go this week (above a lowered target).
 */
export function updateStaff(state: GameState, branch: Branch): number {
  const s = branch.staff;
  const mgr = managerOf(state, branch);
  const ratio = s.wage / marketWage(state, branch.cityId);
  const people = mgr?.skills.people ?? 50;
  const mods = staffMods(state);

  const moraleTarget = clamp(
    MORALE.base +
      MORALE.wageSwing * dtanh(MORALE.wageSteep * (ratio - 1)) +
      MORALE.managerPeople * (people - 50) -
      MORALE.waitPenalty * Math.max(0, branch.waitIndex - 1) -
      (mgr ? 0 : MORALE.noManager) +
      mods.morale,
    0,
    100,
  );
  s.morale = ema(s.morale, moraleTarget, MORALE.ema);

  const sTarget = skillTarget(state, branch);
  s.skill =
    s.skill < sTarget
      ? Math.min(sTarget, s.skill + SKILL.riseWeekly * mods.skillRiseMult)
      : Math.max(sTarget, s.skill - SKILL.fallWeekly);

  // Quits accumulate fractionally; a person leaves when the accumulator reaches 1.
  s.quitAccumulator += s.count * QUIT_BASE * dpow(2 - s.morale / 100, 2) * mods.quitMult;
  const quits = Math.min(s.count, Math.floor(s.quitAccumulator));
  s.quitAccumulator -= quits;
  s.count -= quits;

  let severance = 0;
  if (s.count > s.target) {
    severance = staffSeverance(branch, s.count - s.target);
    s.count = s.target;
  } else if (s.count < s.target) {
    const hires = Math.min(s.target - s.count, hiresPerWeek(ratio, mods, sizeMult(branch)));
    if (hires > 0) {
      s.skill = (s.skill * s.count + SKILL.newHireFrac * sTarget * hires) / (s.count + hires);
      s.count += hires;
    }
  }
  holdTopStaff(state, s);
  return severance;
}

/** Customer interactions per week C (§6.4). */
export function capacity(branch: Branch, campaignCapacity: number): number {
  const teller = EQUIPMENT[branch.build.teller];
  const atm = EQUIPMENT[branch.build.atm];
  const needed = staffNeeded(branch);
  const staffing = needed > 0 ? Math.min(1, branch.staff.count / needed) : 1;
  const base =
    ((teller?.stations ?? 0) * (teller?.perStation ?? 0) * staffing + (atm?.atmProductivity ?? 0)) *
    sizeMult(branch);
  return (
    base *
    (CAPACITY_SKILL.base + (CAPACITY_SKILL.slope * branch.staff.skill) / 100) *
    (CAPACITY_MORALE.base + (CAPACITY_MORALE.slope * branch.staff.morale) / 100) *
    campaignCapacity
  );
}

/** Existing customers' branch visits per week; a better app means fewer (§6.4). */
export function visitRate(appRating: number): number {
  return SERVICE_VISIT_RATE * (VISIT_APP.base - VISIT_APP.slope * appRating);
}
