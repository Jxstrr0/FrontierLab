// Branch staff, manager, delegation and marketing commands.
import {
  MANAGER_BASE_SALARY,
  MANAGER_POOL_SIZE,
  MANAGER_SALARY_RANGE,
  MAX_STAFF_MULT,
  WAGE_RANGE,
  WAGE_STEP,
} from '../../config/balance';
import { CAMPAIGNS } from '../../data/campaigns';
import { CITIES } from '../../data/cities';
import { marketWage, staffNeeded } from '../branch/staff';
import { roundToStep } from '../math';
import { generateManager } from '../people';
import type { Delegation, GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

export function setStaffTarget(state: GameState, branchId: string, target: number): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  if (branch.delegation.staffing) return fail('Your manager handles staffing here.');
  const max = staffNeeded(branch) * MAX_STAFF_MULT;
  if (!Number.isInteger(target) || target < 0 || target > max)
    return fail(`Staff can be set from 0 to ${max}.`);
  branch.staff.target = target;
  return ok();
}

export function setWage(state: GameState, branchId: string, wage: number): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  if (branch.delegation.staffing) return fail('Your manager handles wages here.');
  const mkt = marketWage(branch.cityId);
  const [lo, hi] = WAGE_RANGE;
  const w = roundToStep(wage, WAGE_STEP);
  if (!(w >= mkt * lo && w <= mkt * hi))
    return fail(
      `Wages can be set from $${(mkt * lo).toFixed(2)} to $${(mkt * hi).toFixed(2)} an hour.`,
    );
  branch.staff.wage = w;
  return ok();
}

export function setCampaignLevel(
  state: GameState,
  branchId: string,
  campaignId: string,
  level: number,
): CommandResult {
  const branch = state.branches[branchId];
  const spec = CAMPAIGNS[campaignId];
  if (!branch) return fail('That branch no longer exists.');
  if (!spec) return fail('Unknown campaign.');
  if (branch.delegation.marketing) return fail('Your manager runs marketing here.');
  if (!Number.isInteger(level) || level < 0 || level > spec.levels.length)
    return fail('Pick a level from the list.');
  branch.campaigns[campaignId] = level;
  return ok();
}

export function hireManager(
  state: GameState,
  branchId: string,
  candidateId: string,
): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  if (branch.managerId) return fail('This branch already has a manager.');
  const pool = state.people.managerCandidates[branch.cityId] ?? [];
  const idx = pool.findIndex((m) => m.id === candidateId);
  if (idx < 0) return fail('That candidate has taken another job.');
  const mgr = pool.splice(idx, 1)[0]!;
  mgr.branchId = branch.id;
  mgr.sinceWeek = state.clock.week;
  state.people.managers[mgr.id] = mgr;
  branch.managerId = mgr.id;
  return ok();
}

/**
 * Deals a fresh set of manager candidates for a city (the hire sheet calls this
 * when it closes, so reopening it shows new faces). Before your first manager
 * is hired, the first candidate is the tutorial guide ("I'm on the list too")
 * and stays on the list.
 */
export function rerollManagerCandidates(state: GameState, cityId: string): CommandResult {
  if (!CITIES[cityId]) return fail('Unknown city.');
  const old = state.people.managerCandidates[cityId] ?? [];
  const keepGuide =
    cityId === state.world.currentCityId &&
    Object.keys(state.people.managers).length === 0 &&
    old.length > 0;
  const pool = keepGuide ? [old[0]!] : [];
  while (pool.length < MANAGER_POOL_SIZE) pool.push(generateManager(state, cityId));
  state.people.managerCandidates[cityId] = pool;
  state.people.candidatesRefreshWeek[cityId] = state.clock.week;
  return ok();
}

export function fireManager(state: GameState, branchId: string): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  if (!branch.managerId) return fail('This branch has no manager.');
  delete state.people.managers[branch.managerId];
  delete branch.managerId;
  branch.delegation = {
    staffing: false,
    products: false,
    marketing: false,
    troubles: false,
    loans: false,
  };
  return ok();
}

export function setManagerSalary(
  state: GameState,
  branchId: string,
  salary: number,
): CommandResult {
  const branch = state.branches[branchId];
  const mgr = branch?.managerId ? state.people.managers[branch.managerId] : undefined;
  if (!branch || !mgr) return fail('This branch has no manager.');
  const ref = (CITIES[branch.cityId]?.wageIndex ?? 1) * MANAGER_BASE_SALARY;
  const [lo, hi] = MANAGER_SALARY_RANGE;
  if (!(salary >= ref * lo && salary <= ref * hi))
    return fail(`Salary can be set from ${money(ref * lo)} to ${money(ref * hi)}.`);
  mgr.salary = Math.round(salary);
  return ok();
}

export function setDelegation(
  state: GameState,
  branchId: string,
  key: keyof Delegation,
  on: boolean,
): CommandResult {
  const branch = state.branches[branchId];
  if (!branch) return fail('That branch no longer exists.');
  if (!branch.managerId) return fail('Hire a manager first.');
  if (!(key in branch.delegation)) return fail('Unknown delegation.');
  branch.delegation[key] = on;
  return ok();
}
