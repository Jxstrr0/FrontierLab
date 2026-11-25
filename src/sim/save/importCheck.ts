// The check a save from outside goes through before the game opens it
// (DATA_MODEL §10): a pasted save code or a backup file. It compares the save,
// after migrations, with two fresh games made by this version (shapeCheck.ts)
// and says in plain words what is wrong, or nothing.
//
// The game's own slots do not come through here.
import { CITIES } from '../../data/cities';
import { newGame } from '../newGame';
import { SCHEMA_VERSION } from '../state';
import { shapeProblems } from './shapeCheck';

/** Two different seeds, so id-keyed tables show up as tables (their ids differ between the two). */
const PATTERN_SEEDS = [1, 2] as const;

/** A fresh game as plain data, the way a save holds it. */
function pattern(seed: number, cityId: string): unknown {
  return JSON.parse(JSON.stringify(newGame({ seed, cityId })));
}

/**
 * What is wrong with an imported save, or null. `fromVersion` is the version the
 * code was written by: a part an older version's save lacks is left to the
 * migrations, so only a code from this version must carry every name.
 */
export function importProblem(state: unknown, fromVersion: number): string | null {
  const cities = Object.keys(CITIES);
  const a = pattern(PATTERN_SEEDS[0], cities[0]!);
  const b = pattern(PATTERN_SEEDS[1], cities[1]!);
  const [found] = shapeProblems(state, a, b, { allowMissing: fromVersion < SCHEMA_VERSION });
  return found ?? null;
}
