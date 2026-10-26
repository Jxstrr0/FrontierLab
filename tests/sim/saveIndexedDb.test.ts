// Save slots kept in IndexedDB (src/sim/save/slotData.ts): the data leaves
// localStorage, so a save far bigger than localStorage's quota fits; older
// saves move across on first use; writes land in order; a failed card write
// puts the previous save back. fake-indexeddb stands in for the browser's.
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSlotStore } from '../../src/sim/save/slotData';
import {
  deleteSlot,
  loadFromSlot,
  saveToSlot,
  slotMeta,
  slotMetaFor,
  STORAGE_FULL,
  writeSlot,
} from '../../src/sim/save/storage';
import { serialize } from '../../src/sim/save/serialize';
import { compressToUTF16 } from 'lz-string';
import { runScript } from '../helpers/scenario';

/** An in-memory localStorage with a quota in characters. */
function fakeStorage(quota = Infinity) {
  const items = new Map<string, string>();
  const ls = {
    items,
    quota,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const used = [...items].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0);
      if (used + v.length > ls.quota) throw new Error('QuotaExceededError');
      items.set(k, v);
    },
    removeItem: (k: string) => void items.delete(k),
  };
  return ls;
}

const DATA_KEY = (slot: string) => `vaultstreet.save.${slot}`;

describe('save slots in IndexedDB', () => {
  let ls: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    ls = fakeStorage();
    vi.stubGlobal('window', { localStorage: ls });
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetSlotStore();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the game out of localStorage and only the card in it', async () => {
    const s = runScript(20);
    expect(await saveToSlot('1', s)).toBeNull();
    expect(ls.items.has(DATA_KEY('1'))).toBe(false);
    expect(slotMeta('1')?.checksum).toMatch(/^[0-9a-f]{14}$/);
    expect(await loadFromSlot('1')).toEqual(s);
  });

  it("fits a save bigger than localStorage's whole quota", async () => {
    ls.quota = 5000; // room for the cards, nowhere near a game
    expect(await saveToSlot('2', runScript(20))).toBeNull();
    expect(await saveToSlot('3', runScript(20))).toBeNull();
    // The same storage without IndexedDB is full.
    vi.stubGlobal('indexedDB', undefined);
    resetSlotStore();
    expect(await saveToSlot('1', runScript(5))).toBe(STORAGE_FULL);
  });

  it('moves saves an older version kept in localStorage', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const s = runScript(10);
    expect(await saveToSlot('auto', s)).toBeNull();
    expect(ls.items.has(DATA_KEY('auto'))).toBe(true);
    // The next launch has IndexedDB.
    vi.stubGlobal('indexedDB', new IDBFactory());
    resetSlotStore();
    expect(await loadFromSlot('auto')).toEqual(s);
    expect(ls.items.has(DATA_KEY('auto'))).toBe(false);
    resetSlotStore();
    expect(await loadFromSlot('auto')).toEqual(s);
  });

  it('lands writes in order and drops an autosave older than the save in the slot', async () => {
    const newer = runScript(12);
    const older = runScript(6);
    const metaNew = { ...slotMetaFor('auto', newer), savedAt: 200 };
    const metaOld = { ...slotMetaFor('auto', older), savedAt: 100 };
    const a = writeSlot('auto', compressToUTF16(serialize(newer)), metaNew);
    const b = writeSlot(
      'auto',
      compressToUTF16(serialize(older)),
      metaOld,
      (stored) => stored !== null && stored.savedAt > metaOld.savedAt,
    );
    expect(await Promise.all([a, b])).toEqual([null, null]);
    expect(slotMeta('auto')?.savedAt).toBe(200);
    expect(await loadFromSlot('auto')).toEqual(newer);
  });

  it('puts the previous save back when the card cannot be written', async () => {
    const first = runScript(5);
    expect(await saveToSlot('1', first)).toBeNull();
    ls.quota = 0;
    expect(await saveToSlot('1', runScript(15))).toBe(STORAGE_FULL);
    ls.quota = Infinity;
    expect(await loadFromSlot('1')).toEqual(first);
  });

  it('empties a slot', async () => {
    await saveToSlot('3', runScript(5));
    await deleteSlot('3');
    expect(slotMeta('3')).toBeNull();
    await expect(loadFromSlot('3')).rejects.toThrow('That save slot is empty.');
  });
});
