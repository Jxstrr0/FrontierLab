import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadFromSlot,
  SAVE_DAMAGED,
  saveToSlot,
  slotMeta,
  STORAGE_FULL,
} from '../../src/sim/save/storage';
import { runScript } from '../helpers/scenario';

/** A tiny in-memory localStorage that can be told to run out of space. */
function fakeStorage(quota = Infinity) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => {
      const used = [...items].reduce((n, [key, val]) => n + (key === k ? 0 : val.length), 0);
      if (used + v.length > quota) throw new Error('QuotaExceededError');
      items.set(k, v);
    },
    removeItem: (k: string) => void items.delete(k),
  };
}

describe('save slots', () => {
  let ls: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    ls = fakeStorage();
    vi.stubGlobal('window', { localStorage: ls });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores a checksum and loads the game back', () => {
    const s = runScript(20);
    expect(saveToSlot('1', s)).toBeNull();
    expect(slotMeta('1')?.checksum).toMatch(/^[0-9a-f]{14}$/);
    expect(loadFromSlot('1')).toEqual(s);
  });

  it('refuses a slot whose data no longer matches its checksum', () => {
    saveToSlot('1', runScript(5));
    const key = 'vaultstreet.save.1';
    ls.items.set(key, ls.items.get(key)!.slice(0, -3) + 'abc');
    expect(() => loadFromSlot('1')).toThrow(SAVE_DAMAGED);
  });

  it('still loads older slots written without a checksum', () => {
    saveToSlot('2', runScript(5));
    const meta = JSON.parse(ls.items.get('vaultstreet.meta.2')!);
    delete meta.checksum;
    ls.items.set('vaultstreet.meta.2', JSON.stringify(meta));
    expect(() => loadFromSlot('2')).not.toThrow();
  });

  it('asks the player to export when storage is full', () => {
    vi.stubGlobal('window', { localStorage: fakeStorage(10) });
    expect(saveToSlot('3', runScript(5))).toBe(STORAGE_FULL);
    expect(STORAGE_FULL).toMatch(/^Storage full — export your save/);
  });
});
