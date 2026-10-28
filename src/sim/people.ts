// Branch manager candidates and portraits (SIMULATION §6.5). Pools are per city
// and refresh every 4 weeks; skills come from the `people` stream.
import {
  MANAGER_POOL_REFRESH_WEEKS,
  MANAGER_POOL_SIZE,
  MANAGER_SALARY_SPREAD,
  MANAGER_SKILL,
} from '../config/balance';
import { FIRST_NAMES, LAST_NAMES } from '../data/names';
import { newId } from './ids';
import { clamp } from './math';
import { gradSkillBonus } from './partnerships';
import { stream, type Rng } from './rng';
import { managerBaseSalary } from './payReviews';
import type { AvatarSpec, GameState, Manager } from './state';

/** Portrait part counts (ART_DIRECTION §4). */
const PORTRAIT_PARTS = { head: 4, hair: 15, facial: 4, glasses: 4, attire: 6, tone: 6, shade: 3 };
/** Hair colours and outfit colours (CONTENT avatar parts). */
const STYLE_DETAIL = { hairTones: 7, outfits: 6, silver: 6 };
/** Strong (0) or soft (1) features: a soft face never has facial hair. */
export const SOFT_LOOK = 1;
/** Hair styles that swap on a face of the other look (CONTENT avatar parts). */
const SOFT_HAIR_SWAP: Record<number, number> = { 2: 13, 3: 6 };
const STRONG_HAIR_SWAP: Record<number, number> = { 6: 0, 13: 12, 14: 11 };
const FACE_DETAIL = { eyes: 4, brows: 3, mouth: 3 };
/** Age by weight: fresh and seasoned faces are common, veterans rarer. */
const AGE_WEIGHTS = [0, 0, 1, 1, 2];

/** The parts a v22 save already had; eyes, brows, mouth and age derive from them. */
export type BaseAvatar = Omit<
  AvatarSpec,
  'eyes' | 'brows' | 'mouth' | 'age' | 'look' | 'hairTone' | 'outfit'
>;

function hashParts(values: readonly number[], salt: number): number {
  let h = 0x811c9dc5 ^ salt;
  for (const v of values) h = Math.imul(h ^ (v + 1), 0x01000193) >>> 0;
  return Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
}

/**
 * Look, hair colour and outfit colour for a generated face, hashed from its
 * other parts like faceDetail (so no people-RNG draws change). Older hair
 * turns silver; deeper skin tones lean to darker hair. Save migration v28 → v29
 * uses the same rule for everyone but the founder.
 */
export function styleDetail(
  a: BaseAvatar,
  age: number,
): Pick<AvatarSpec, 'look' | 'hairTone' | 'outfit'> {
  const h = hashParts([a.head, a.hair, a.facial, a.glasses, a.attire, a.tone, a.shade], 0x2f);
  const silver = age === 2 ? (h >>> 3) % 4 !== 0 : age === 1 && (h >>> 3) % 5 === 0;
  // Light skin tones draw from every colour but silver; deeper ones from the darker three.
  const palette = a.tone >= 3 ? 3 : STYLE_DETAIL.hairTones - 1;
  return {
    look: h % 2,
    hairTone: silver ? STYLE_DETAIL.silver : (h >>> 6) % palette,
    outfit: (h >>> 10) % STYLE_DETAIL.outfits,
  };
}

/** Makes a generated face consistent with its look: soft faces lose facial hair, hair swaps. */
export function fitLook(a: AvatarSpec): AvatarSpec {
  if (a.look === SOFT_LOOK) {
    a.facial = 0;
    a.hair = SOFT_HAIR_SWAP[a.hair] ?? a.hair;
  } else {
    a.hair = STRONG_HAIR_SWAP[a.hair] ?? a.hair;
  }
  return a;
}

/**
 * Eyes, brows, mouth and age for a face, hashed from its other parts so the
 * same person always has the same face without drawing on the people RNG
 * (which keeps every older seed's candidates as they were). Save migration
 * v22 → v23 uses the same rule.
 */
export function faceDetail(a: BaseAvatar): Pick<AvatarSpec, 'eyes' | 'brows' | 'mouth' | 'age'> {
  let h = 0x811c9dc5;
  for (const v of [a.head, a.hair, a.facial, a.glasses, a.attire, a.tone, a.shade]) {
    h = Math.imul(h ^ (v + 1), 0x01000193) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return {
    eyes: h % FACE_DETAIL.eyes,
    brows: (h >>> 4) % FACE_DETAIL.brows,
    mouth: (h >>> 8) % FACE_DETAIL.mouth,
    age: AGE_WEIGHTS[(h >>> 12) % AGE_WEIGHTS.length]!,
  };
}

export function randomAvatar(rng: Rng): AvatarSpec {
  const base: BaseAvatar = {
    head: rng.int(0, PORTRAIT_PARTS.head - 1),
    hair: rng.int(0, PORTRAIT_PARTS.hair - 1),
    facial: rng.int(0, PORTRAIT_PARTS.facial - 1),
    glasses: rng.int(0, PORTRAIT_PARTS.glasses - 1),
    attire: rng.int(0, PORTRAIT_PARTS.attire - 1),
    tone: rng.int(0, PORTRAIT_PARTS.tone - 1),
    shade: rng.int(0, PORTRAIT_PARTS.shade - 1),
  };
  const face = faceDetail(base);
  return fitLook({ ...base, ...face, ...styleDetail(base, face.age) });
}

export function personName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

/** One candidate skill; a university graduate program adds its bonus (§17.2). */
function skill(rng: Rng, bonus: number): number {
  return Math.round(
    clamp(
      rng.normal(MANAGER_SKILL.mean, MANAGER_SKILL.sd) + bonus,
      MANAGER_SKILL.min,
      MANAGER_SKILL.max,
    ),
  );
}

/** A generated manager; draws from the `people` stream unless another is given (M&A uses its own). */
export function generateManager(
  state: GameState,
  cityId: string,
  rng: Rng = stream(state, 'people'),
): Manager {
  const bonus = gradSkillBonus(state);
  const skills = {
    people: skill(rng, bonus),
    product: skill(rng, bonus),
    marketing: skill(rng, bonus),
    ethics: skill(rng, bonus),
  };
  return {
    id: newId(state, 'mgr'),
    name: personName(rng),
    portrait: randomAvatar(rng),
    skills,
    salary: managerAskingSalary(state, cityId, skills),
    sinceWeek: state.clock.week,
  };
}

/** A manager's asking salary in a city: the market rate, scaled by average skill. */
export function managerAskingSalary(
  state: GameState,
  cityId: string,
  skills: Manager['skills'],
): number {
  const avg = (skills.people + skills.product + skills.marketing + skills.ethics) / 4;
  const salary =
    managerBaseSalary(state, cityId) *
    (MANAGER_SALARY_SPREAD.base + (MANAGER_SALARY_SPREAD.slope * avg) / 100);
  return Math.round(salary / 100) * 100;
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
  delete state.people.rerolls[cityId];
}
