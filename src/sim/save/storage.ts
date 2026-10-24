// Save slots in localStorage (SCREENS §26): one autosave plus three manual
// slots. Each slot keeps the serialized game (lz-string compressed) and a small
// metadata record for the slot cards. Storage can be missing or full (private
// windows, quotas), so every access is guarded and reports failure.
// This is the only module allowed to touch browser storage (CLAUDE.md); the
// simulation itself never calls it.
import { compressToUTF16, decompressFromUTF16 } from 'lz-string';
import { dateOf } from '../calendar';
import type { GameState, Settings } from '../state';
import { deserialize, serialize } from './serialize';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const gameDate = (startDate: string, day: number) => {
  const d = dateOf(startDate, day);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export type SlotId = 'auto' | '1' | '2' | '3';
export const SLOTS: SlotId[] = ['auto', '1', '2', '3'];

export interface SaveMeta {
  slot: SlotId;
  bankName: string;
  monogram: string;
  brandInk: string;
  date: string;
  day: number;
  cash: number;
  savedAt: number;
}

const PREFIX = 'vaultstreet.';
const dataKey = (slot: SlotId) => `${PREFIX}save.${slot}`;
const metaKey = (slot: SlotId) => `${PREFIX}meta.${slot}`;
const PREFS_KEY = `${PREFIX}prefs`;

function store(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Writes a game to a slot. Returns an error message, or null on success. */
export function saveToSlot(slot: SlotId, state: GameState): string | null {
  return writeSlot(slot, compressToUTF16(serialize(state)), slotMetaFor(slot, state));
}

/** The slot card record for a game as it is now. */
export function slotMetaFor(slot: SlotId, state: GameState): SaveMeta {
  return {
    slot,
    bankName: state.meta.bankName,
    monogram: state.meta.monogram,
    brandInk: state.meta.brandInk,
    date: gameDate(state.meta.startDate, state.clock.day),
    day: state.clock.day,
    cash: state.company.cash,
    savedAt: Date.now(),
  };
}

/**
 * Stores an already compressed save (compressToUTF16 of serialize(state)) and
 * its card. The weekly autosave compresses off the main thread and then calls
 * this (src/app/saves/autosave.ts). Returns an error message, or null.
 */
export function writeSlot(slot: SlotId, compressed: string, meta: SaveMeta): string | null {
  const ls = store();
  if (!ls) return 'Saving is unavailable in this browser.';
  try {
    ls.setItem(dataKey(slot), compressed);
    ls.setItem(metaKey(slot), JSON.stringify(meta));
    return null;
  } catch {
    return 'Not enough storage space to save. Delete a slot and try again.';
  }
}

/** Loads a slot. Throws with a readable message if it's missing or broken. */
export function loadFromSlot(slot: SlotId): GameState {
  const ls = store();
  const raw = ls?.getItem(dataKey(slot));
  if (!raw) throw new Error('That save slot is empty.');
  const json = decompressFromUTF16(raw);
  if (!json) throw new Error('That save is damaged and cannot be loaded.');
  return deserialize(json);
}

export function slotMeta(slot: SlotId): SaveMeta | null {
  try {
    const raw = store()?.getItem(metaKey(slot));
    return raw ? (JSON.parse(raw) as SaveMeta) : null;
  } catch {
    return null;
  }
}

export function allSlotMeta(): Record<SlotId, SaveMeta | null> {
  return { auto: slotMeta('auto'), '1': slotMeta('1'), '2': slotMeta('2'), '3': slotMeta('3') };
}

export function deleteSlot(slot: SlotId): void {
  try {
    store()?.removeItem(dataKey(slot));
    store()?.removeItem(metaKey(slot));
  } catch {
    // Nothing to do: storage is unavailable.
  }
}

/** The most recently written slot, for Continue. */
export function latestSlot(): SaveMeta | null {
  return (
    Object.values(allSlotMeta())
      .filter((m): m is SaveMeta => m !== null)
      .sort((a, b) => b.savedAt - a.savedAt)[0] ?? null
  );
}

/** Player preferences applied to new games (edited from the title's Settings). */
export function loadPrefs(): Partial<Settings> {
  try {
    const raw = store()?.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Settings>) : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Partial<Settings>): void {
  try {
    store()?.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are a convenience; ignore storage failures.
  }
}
