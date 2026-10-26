// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
// Frontier Lab's chain starts at schema 1 (stage C0, DESIGN decision A6).
// Vault Street's 37 steps were dropped: its saves live in a separate store
// and its export codes are turned away, so none can reach this chain.
import { SCHEMA_VERSION } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2 (stage C2a): branches become sales offices with a size; every
  // existing one starts at Starter. A second branch in a city keeps running.
  1: (s) => {
    const branches = (s.branches ?? {}) as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) if (b.size === undefined) b.size = 0;
    return s;
  },
};

/** Upgrades a raw save to the current schema, or throws if it can't. */
export function migrate(raw: RawSave): RawSave {
  let s = raw;
  if (s.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      'This save comes from a newer version of Frontier Lab. Update the game to load it.',
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
