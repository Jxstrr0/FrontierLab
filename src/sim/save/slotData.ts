// Where the save slots' game data lives (SCREENS §26). IndexedDB, whose quota
// is a share of the device's free space, instead of localStorage, whose ~5 MB
// is shared by every page on the site and fills after two big games. The slot
// cards stay in localStorage (storage.ts) so menus can read them at once.
// localStorage holds the data only where IndexedDB is missing or won't open.
// Saves written by older versions to localStorage move across on first use,
// and are still read from there until they do. Every slot operation runs in
// order through one queue, so a slow write never lands after a newer one.
// Only src/sim/save may touch browser storage (CLAUDE.md).

const PREFIX = 'vaultstreet.';
/** The localStorage key of a slot's data (older versions, and the fallback). */
export const dataKey = (slot: string) => `${PREFIX}save.${slot}`;

const DB_NAME = 'vaultstreet';
const DB_STORE = 'saves';
const DB_VERSION = 1;

/** A slot's compressed game, keyed by slot id. */
export interface SlotDataStore {
  kind: 'indexeddb' | 'localStorage';
  get(slot: string): Promise<string | null>;
  /** Rejects when the data can't be stored (usually: storage full). */
  put(slot: string, data: string): Promise<void>;
  remove(slot: string): Promise<void>;
}

export function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function fromLocalStorage(ls: Storage): SlotDataStore {
  return {
    kind: 'localStorage',
    get: async (slot) => ls.getItem(dataKey(slot)),
    put: async (slot, data) => ls.setItem(dataKey(slot), data),
    remove: async (slot) => ls.removeItem(dataKey(slot)),
  };
}

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/** Runs one request in its own transaction and waits until it is committed. */
function inTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode);
    const r = run(tx.objectStore(DB_STORE));
    tx.oncomplete = () => resolve(r.result);
    tx.onerror = () => reject(tx.error ?? r.error);
    tx.onabort = () => reject(tx.error ?? r.error);
  });
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let r: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      r = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    r.onupgradeneeded = () => r.result.createObjectStore(DB_STORE);
    request(r).then(resolve, () => resolve(null));
  });
}

/** Asks the browser not to clear the saves when space runs low (best effort). */
function keepSaves(): void {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    // Not supported here; the saves are kept on a best-effort basis.
  }
}

function fromIndexedDb(db: IDBDatabase): SlotDataStore {
  let askedToKeep = false;
  const legacy = (slot: string) => localStore()?.getItem(dataKey(slot)) ?? null;
  return {
    kind: 'indexeddb',
    async get(slot) {
      const v = await inTransaction(db, 'readonly', (s) => s.get(slot) as IDBRequest<unknown>);
      return typeof v === 'string' ? v : legacy(slot);
    },
    async put(slot, data) {
      await inTransaction(db, 'readwrite', (s) => s.put(data, slot));
      // The copy in IndexedDB is committed; free the old localStorage space.
      localStore()?.removeItem(dataKey(slot));
      if (!askedToKeep) keepSaves();
      askedToKeep = true;
    },
    async remove(slot) {
      await inTransaction(db, 'readwrite', (s) => s.delete(slot));
      localStore()?.removeItem(dataKey(slot));
    },
  };
}

/** Moves saves older versions kept in localStorage into IndexedDB. */
async function moveLegacySaves(store: SlotDataStore, slots: readonly string[]): Promise<void> {
  for (const slot of slots) {
    const old = localStore()?.getItem(dataKey(slot));
    if (!old) continue;
    try {
      await store.put(slot, old);
    } catch {
      // Left in localStorage, where get() still finds it.
    }
  }
}

let opening: Promise<SlotDataStore | null> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** The slot data store, opened (and older saves moved into it) on first use. */
function slotStore(slots: readonly string[]): Promise<SlotDataStore | null> {
  opening ??= openDb().then(async (db) => {
    if (db) {
      const store = fromIndexedDb(db);
      await moveLegacySaves(store, slots);
      return store;
    }
    const ls = localStore();
    return ls ? fromLocalStorage(ls) : null;
  });
  return opening;
}

/**
 * Runs `task` with the store after every slot operation queued before it.
 * `store` is null when this browser can't save at all.
 */
export function withSlotStore<T>(
  slots: readonly string[],
  task: (store: SlotDataStore | null) => Promise<T>,
): Promise<T> {
  const run = queue.then(() => slotStore(slots)).then(task);
  queue = run.catch(() => undefined);
  return run;
}

/** Forgets the opened store, so tests can start each case from scratch. */
export function resetSlotStore(): void {
  opening = null;
  queue = Promise.resolve();
}
