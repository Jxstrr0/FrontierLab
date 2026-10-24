// Branch manager candidates and portraits (SIMULATION §6.5). Pools are per city
// and refresh every 4 weeks; skills come from the `people` stream.
import {
  MANAGER_BASE_SALARY,
  MANAGER_POOL_REFRESH_WEEKS,
  MANAGER_POOL_SIZE,
  MANAGER_SALARY_SPREAD,
  MANAGER_SKILL,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { newId } from './ids';
import { clamp } from './math';
import { stream, type Rng } from './rng';
import type { AvatarSpec, GameState, Manager } from './state';

/** Portrait part counts (ART_DIRECTION §4). */
const PORTRAIT_PARTS = { head: 4, hair: 12, facial: 4, glasses: 3, attire: 4, tone: 6, shade: 3 };

export function randomAvatar(rng: Rng): AvatarSpec {
  return {
    head: rng.int(0, PORTRAIT_PARTS.head - 1),
    hair: rng.int(0, PORTRAIT_PARTS.hair - 1),
    facial: rng.int(0, PORTRAIT_PARTS.facial - 1),
    glasses: rng.int(0, PORTRAIT_PARTS.glasses - 1),
    attire: rng.int(0, PORTRAIT_PARTS.attire - 1),
    tone: rng.int(0, PORTRAIT_PARTS.tone - 1),
    shade: rng.int(0, PORTRAIT_PARTS.shade - 1),
  };
}

export function personName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function skill(rng: Rng): number {
  return Math.round(
    clamp(rng.normal(MANAGER_SKILL.mean, MANAGER_SKILL.sd), MANAGER_SKILL.min, MANAGER_SKILL.max),
  );
}

export function generateManager(state: GameState, cityId: string): Manager {
  const rng = stream(state, 'people');
  const city = CITIES[cityId];
  const skills = {
    people: skill(rng),
    product: skill(rng),
    marketing: skill(rng),
    ethics: skill(rng),
  };
  const avg = (skills.people + skills.product + skills.marketing + skills.ethics) / 4;
  const salary =
    MANAGER_BASE_SALARY *
    (city?.wageIndex ?? 1) *
    (MANAGER_SALARY_SPREAD.base + (MANAGER_SALARY_SPREAD.slope * avg) / 100);
  return {
    id: newId(state, 'mgr'),
    name: personName(rng),
    portrait: randomAvatar(rng),
    skills,
    salary: Math.round(salary / 100) * 100,
    sinceWeek: state.clock.week,
  };
}

/** Refreshes a city's candidate pool when it's empty or 4 weeks old. */
export function refreshManagerPool(state: GameState, cityId: string, force = false): void {
  const last = state.people.candidatesRefreshWeek[cityId];
  const stale = last === undefined || state.clock.week - last >= MANAGER_POOL_REFRESH_WEEKS;
  if (!force && !stale && state.people.managerCandidates[cityId]) return;
  const pool: Manager[] = [];
  for (let i = 0; i < MANAGER_POOL_SIZE; i++) pool.push(generateManager(state, cityId));
  state.people.managerCandidates[cityId] = pool;
  state.people.candidatesRefreshWeek[cityId] = state.clock.week;
}
