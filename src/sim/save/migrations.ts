// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
import { START_CASH } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { SCHEMA_VERSION } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2: New Game options (difficulty, competitor count, starting cash).
  1: (s) => {
    const meta = s.meta as Record<string, unknown>;
    const world = s.world as { currentCityId: string };
    meta.difficulty = 'normal';
    meta.competitors = CITIES[world.currentCityId]?.rivals ?? 3;
    meta.startCash = START_CASH;
    const company = s.company as Record<string, unknown>;
    company.negativeCashWeeks = 0;
    company.lowCapitalWeeks = 0;
    return s;
  },
  // 2 → 3: per-branch Loan Desk tallies for the current week.
  2: (s) => {
    const branches = s.branches as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) {
      b.desk = { week: 0, approved: 0, refused: 0, declined: 0, expired: 0 };
    }
    return s;
  },
};

/** Upgrades a raw save to the current schema, or throws if it can't. */
export function migrate(raw: RawSave): RawSave {
  let s = raw;
  if (s.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This save comes from a newer version of Vault Street. Update the game to load it.',
    );
  }
  while (s.schemaVersion < SCHEMA_VERSION) {
    const step = migrations[s.schemaVersion];
    if (!step) throw new Error(`No migration from save version ${s.schemaVersion}.`);
    s = step(s);
    s.schemaVersion += 1;
  }
  return s;
}
