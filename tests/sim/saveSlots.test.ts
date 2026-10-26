import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  allSlotMeta,
  latestSlot,
  loadCoverIndex,
  loadFromSlot,
  SAVE_DAMAGED,
  saveCoverIndex,
  saveToSlot,
  slotMeta,
  slotMetaFor,
  STORAGE_FULL,
} from '../../src/sim/save/storage';
import { resetSlotStore } from '../../src/sim/save/slotData';
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
    resetSlotStore();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stores a checksum and loads the game back', async () => {
    const s = runScript(20);
    expect(await saveToSlot('1', s)).toBeNull();
    expect(slotMeta('1')?.checksum).toMatch(/^[0-9a-f]{14}$/);
    expect(await loadFromSlot('1')).toEqual(s);
  });

  it('refuses a slot whose data no longer matches its checksum', async () => {
    await saveToSlot('1', runScript(5));
    const key = 'vaultstreet.save.1';
    ls.items.set(key, ls.items.get(key)!.slice(0, -3) + 'abc');
    await expect(loadFromSlot('1')).rejects.toThrow(SAVE_DAMAGED);
  });

  it('still loads older slots written without a checksum', async () => {
    await saveToSlot('2', runScript(5));
    const meta = JSON.parse(ls.items.get('vaultstreet.meta.2')!);
    delete meta.checksum;
    ls.items.set('vaultstreet.meta.2', JSON.stringify(meta));
    await expect(loadFromSlot('2')).resolves.toBeDefined();
  });

  it('asks the player to export when storage is full', async () => {
    vi.stubGlobal('window', { localStorage: fakeStorage(10) });
    expect(await saveToSlot('3', runScript(5))).toBe(STORAGE_FULL);
    expect(STORAGE_FULL).toMatch(/^Storage full — export your save/);
  });
});

describe('save cards for the title cover', () => {
  let ls: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    ls = fakeStorage();
    vi.stubGlobal('window', { localStorage: ls });
    resetSlotStore();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('remembers the current city for the skyline', () => {
    const s = runScript(10);
    const meta = slotMetaFor('1', s);
    expect(meta.cover).toMatchObject({
      cityId: s.world.currentCityId,
      seed: s.meta.seed,
      homeCityId: s.meta.homeCityId,
    });
  });

  it('still lists older cards written without a cover', async () => {
    await saveToSlot('2', runScript(5));
    const meta = JSON.parse(ls.items.get('vaultstreet.meta.2')!);
    delete meta.cover;
    ls.items.set('vaultstreet.meta.2', JSON.stringify(meta));
    expect(allSlotMeta()['2']?.bankName).toBe(meta.bankName);
    expect(latestSlot()?.cover).toBeUndefined();
    await expect(loadFromSlot('2')).resolves.toBeDefined();
  });

  it('keeps the rotation index per device, defaulting to 0', () => {
    expect(loadCoverIndex()).toBe(0);
    saveCoverIndex(7);
    expect(loadCoverIndex()).toBe(7);
    ls.items.set('vaultstreet.coverCityIndex', 'nonsense');
    expect(loadCoverIndex()).toBe(0);
    vi.stubGlobal('window', {});
    expect(loadCoverIndex()).toBe(0);
    expect(() => saveCoverIndex(1)).not.toThrow();
  });
});
