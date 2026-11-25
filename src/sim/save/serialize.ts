// Save serialization (DATA_MODEL §10): plain JSON in and out, migrations on
// load, a required-keys check, a checksum for corruption, and export codes of
// the form "FL{version}:{lz-string}" for moving a game between devices.
// Vault Street codes ("VS…") are turned away: the two games' saves don't mix.
//
// A save code can come from anyone, so importCode trusts nothing in one: the
// code and what it unpacks to have size limits (boundedLz.ts), and the save is
// compared with a fresh game before it is handed back (importCheck.ts). The
// game's own slots (storage.ts) use deserialize directly and are not refused
// by those rules.
import { compressToEncodedURIComponent } from 'lz-string';
import { SAVE_CODE_MAX_CHARS, SAVE_JSON_MAX_CHARS } from '../../config/saveLimits';
import { SCHEMA_VERSION, type GameState } from '../state';
import { SaveTooBig, decompressBounded } from './boundedLz';
import { importProblem } from './importCheck';
import { migrate } from './migrations';

const REQUIRED_KEYS: (keyof GameState)[] = [
  'schemaVersion',
  'meta',
  'clock',
  'rng',
  'settings',
  'world',
  'company',
  'branches',
  'ledger',
  'history',
];

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

/** Parses and migrates a save; `fromVersion` is the schema version the save itself says it was written at. */
function readSave(json: string): { state: GameState; fromVersion: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("That save can't be read.");
  }
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof (raw as { schemaVersion?: unknown }).schemaVersion !== 'number'
  ) {
    throw new Error("That doesn't look like a Frontier Lab save.");
  }
  const fromVersion = (raw as { schemaVersion: number }).schemaVersion;
  const state = migrate(raw as Record<string, unknown> & { schemaVersion: number });
  for (const key of REQUIRED_KEYS) {
    if (!(key in state)) throw new Error(`The save is missing "${key}".`);
  }
  return { state: state as unknown as GameState, fromVersion };
}

export function deserialize(json: string): GameState {
  return readSave(json).state;
}

/** cyrb53: a fast 53-bit string hash for save checksums and determinism snapshots. */
export function checksum(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

export function exportCode(state: GameState): string {
  return `FL${SCHEMA_VERSION}:${compressToEncodedURIComponent(serialize(state))}`;
}

/** What the player reads when a code or file is far too big to be a save. */
export const SAVE_TOO_BIG = 'That is far too big to be a Frontier Lab save, so it was not read.';

export function importCode(code: string): GameState {
  if (code.length > SAVE_CODE_MAX_CHARS) throw new Error(SAVE_TOO_BIG);
  const trimmed = code.trim();
  if (/^VS\d+:/.test(trimmed)) {
    throw new Error('That is a Vault Street save code. Frontier Lab can only load its own saves.');
  }
  const match = /^FL(\d+):(.+)$/s.exec(trimmed);
  if (!match) throw new Error('Save codes start with "FL" and a version number.');
  const version = Number(match[1]);
  if (version > SCHEMA_VERSION) {
    throw new Error(
      'This save code comes from a newer version of Frontier Lab. Update the game to load it.',
    );
  }
  let json: string | null;
  try {
    json = decompressBounded(match[2]!, SAVE_JSON_MAX_CHARS);
  } catch (e) {
    if (e instanceof SaveTooBig) throw new Error(SAVE_TOO_BIG, { cause: e });
    throw e;
  }
  if (!json) throw new Error('That save code is incomplete or damaged.');
  let read: ReturnType<typeof readSave>;
  try {
    read = readSave(json);
  } catch (e) {
    // readSave's own messages are written for the player. A TypeError and its kind is a migration
    // tripping over something in the save that it took for granted.
    if (e instanceof TypeError || e instanceof RangeError || e instanceof ReferenceError) {
      throw new Error("That save can't be brought up to this version of the game.", { cause: e });
    }
    throw e;
  }
  const { state, fromVersion } = read;
  // The save's own version decides how strict the check is, not the label on the code.
  const problem = importProblem(state, fromVersion);
  if (problem) throw new Error(`That save code can't be used: ${problem}.`);
  return state;
}
