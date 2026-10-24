// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
import { SCHEMA_VERSION } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2 goes here when the shape first changes.
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
