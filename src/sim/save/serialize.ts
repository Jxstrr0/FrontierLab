// Save serialization (DATA_MODEL §10): plain JSON in and out, migrations on
// load, a required-keys check, a checksum for corruption, and export codes of
// the form "FL{version}:{lz-string}" for moving a game between devices.
// Vault Street codes ("VS…") are turned away: the two games' saves don't mix.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SCHEMA_VERSION, type GameState } from '../state';
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
  'treasury',
  'ledger',
  'history',
];

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
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
  const state = migrate(raw as Record<string, unknown> & { schemaVersion: number });
  for (const key of REQUIRED_KEYS) {
    if (!(key in state)) throw new Error(`The save is missing "${key}".`);
  }
  return state as unknown as GameState;
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

export function importCode(code: string): GameState {
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
  const json = decompressFromEncodedURIComponent(match[2]!);
  if (!json) throw new Error('That save code is incomplete or damaged.');
  return deserialize(json);
}
