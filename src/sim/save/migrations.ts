// Save migrations (CLAUDE.md non-negotiable 7). Whenever GameState changes
// shape, bump SCHEMA_VERSION in state.ts and add `migrations[oldVersion]`,
// which upgrades a save from oldVersion to oldVersion + 1.
// Frontier Lab's chain starts at schema 1 (stage C0, DESIGN decision A6).
// Vault Street's 37 steps were dropped: its saves live in a separate store
// and its export codes are turned away, so none can reach this chain.
import { foldRivalCity } from '../rivalOffices';
import { migrateCatalog } from './migrateCatalog';
import { migrateBankCleanup } from './migrateBankCleanup';
import { migrateCompute } from './migrateCompute';
import { migrateGpuLots } from './migrateGpuLots';
import { migrateBusinesses } from './migrateBusinesses';
import { migrateSpotLimits } from './migrateSpotLimits';
import { migrateMoney } from './migrateMoney';
import { SCHEMA_VERSION, type GameState } from '../state';

type RawSave = Record<string, unknown> & { schemaVersion: number };

/** 2 → 3: a rival's branches in one city fold into one office sized for them. */
function foldRivalCities(s: RawSave): RawSave {
  // Schema 2 rivals have GameState's shape less `size`, which counts as Starter.
  const state = s as unknown as GameState;
  for (const bank of Object.values(state.rivals ?? {})) {
    for (const b of bank.branches) b.size ??= 0;
    for (const cityId of new Set(bank.branches.map((b) => b.cityId))) {
      foldRivalCity(state, bank, cityId);
    }
  }
  return s;
}

export const migrations: Record<number, (s: RawSave) => RawSave> = {
  // 1 → 2 (stage C2a): branches become sales offices with a size; every
  // existing one starts at Starter. A second branch in a city keeps running.
  1: (s) => {
    const branches = (s.branches ?? {}) as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) if (b.size === undefined) b.size = 0;
    return s;
  },
  // 2 → 3 (stage C2b): rival labs hold one sales office per city, with a size.
  2: foldRivalCities,
  // 3 → 4 (stage C2c): data centers, none yet.
  3: (s) => {
    s.dataCenters ??= {};
    return s;
  },
  // 4 → 5 (stage C2d2): every sales office follows HQ prices until told otherwise.
  4: (s) => {
    const branches = (s.branches ?? {}) as Record<string, Record<string, unknown>>;
    for (const b of Object.values(branches)) b.ownPrices ??= false;
    return s;
  },
  // 5 → 6 (stage C3a): the AI catalog; bank books settle, customers go to the Free Tier.
  5: (s) => {
    migrateCatalog(s as unknown as GameState);
    return s;
  },
  // 6 → 7 (stage C3b): compute and AI P&L lines; the Loan Desk lends company cash.
  6: (s) => {
    migrateMoney(s as unknown as GameState);
    return s;
  },
  // 7 → 8 (stage C3c): REO sold into cash, bonds into reserves, covered bonds gone.
  7: (s) => {
    migrateBankCleanup(s as unknown as GameState);
    return s;
  },
  // 8 → 9 (stage C4a): the compute pool and the chip cycle.
  8: (s) => {
    migrateCompute(s as unknown as GameState);
    return s;
  },
  // 9 → 10 (stage C4b): GPU lots and the GPU market on the Compute floor.
  9: (s) => {
    migrateGpuLots(s as unknown as GameState);
    return s;
  },
  // 10 → 11 (stage C4c): spot limits, emergency burst, capacity crunch and outages.
  10: (s) => {
    migrateSpotLimits(s as unknown as GameState);
    return s;
  },
  // 11 → 12 (stage C5a): customer businesses on spare storefronts and anchor employers.
  11: (s) => {
    migrateBusinesses(s as unknown as GameState);
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
