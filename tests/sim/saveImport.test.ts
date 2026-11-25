// Save codes from outside (DATA_MODEL §10): the size limits, the bounded
// unpacker and the check against a fresh game. The rule that matters most is
// the first one: a save the game really wrote is never refused.
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { describe, expect, it } from 'vitest';
import { STRATEGIES } from '../../scripts/strategies';
import { SAVE_CODE_MAX_CHARS, SAVE_JSON_MAX_CHARS } from '../../src/config/saveLimits';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { SaveTooBig, decompressBounded } from '../../src/sim/save/boundedLz';
import { importProblem } from '../../src/sim/save/importCheck';
import { SAVE_TOO_BIG, exportCode, importCode, serialize } from '../../src/sim/save/serialize';
import { SCHEMA_VERSION, type GameState } from '../../src/sim/state';
import { runScript } from '../helpers/scenario';

const pack = (text: string) => compressToEncodedURIComponent(text);
/** A save code holding `state` after `edit` has changed it, as someone editing a save by hand would make. */
type Part = Record<string, unknown>;
/** One named part of a save, to change something inside it. */
const part = (save: Part, name: string) => save[name] as Part;

function edited(state: GameState, edit: (save: Part) => void): string {
  const copy = JSON.parse(serialize(state)) as Part;
  edit(copy);
  return `FL${SCHEMA_VERSION}:${pack(JSON.stringify(copy))}`;
}

/**
 * A short code that unpacks to a very long run of spaces, written bit by bit. (Packing that much
 * text with the library takes minutes.) Each step names the entry the unpacker is about to add,
 * which it reads as "the last piece plus its first letter", so every piece is one longer than the last.
 */
function bomb(steps: number): { packed: string; chars: number } {
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = 0; i < count; i++) bits.push((value >> i) & 1);
  };
  push(0, 2); // a one-byte character follows
  push(32, 8); // a space
  let entries = 4;
  let enlargeIn = 4;
  let numBits = 3;
  let chars = 1;
  for (let step = 1; step <= steps; step++) {
    push(entries, numBits);
    chars += step + 1;
    entries++;
    if (--enlargeIn === 0) {
      enlargeIn = 2 ** numBits;
      numBits++;
    }
  }
  push(2, numBits); // the end mark
  let packed = '';
  for (let i = 0; i < bits.length; i += 6) {
    let value = 0;
    for (let j = 0; j < 6; j++) value = value * 2 + (bits[i + j] ?? 0);
    packed += ALPHABET[value];
  }
  return { packed: `${packed}A`, chars };
}

describe('bounded unpacking', () => {
  it('gives the same text as lz-string for real saves and odd text', () => {
    const texts = [
      serialize(runScript(30)),
      'a',
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'Zażółć gęślą jaźń · 日本語 · 🚀 · \u0000￿',
      JSON.stringify({
        list: Array.from({ length: 500 }, (_, i) => ({ i, name: `row ${i % 7}` })),
      }),
    ];
    for (const text of texts) {
      const packed = pack(text);
      expect(decompressBounded(packed, SAVE_JSON_MAX_CHARS)).toBe(text);
      expect(decompressFromEncodedURIComponent(packed)).toBe(text);
    }
  });

  it('stops as soon as the text passes the limit', () => {
    const packed = pack('x'.repeat(200_000));
    expect(packed.length).toBeLessThan(2000); // a short code, a lot of text
    expect(() => decompressBounded(packed, 10_000)).toThrow(SaveTooBig);
    expect(decompressBounded(packed, 200_000)).toHaveLength(200_000);
  });

  it('reads a damaged code as damaged, never as a crash', () => {
    const packed = pack(serialize(runScript(1)));
    for (const bad of [
      '',
      '$$$$',
      packed.slice(0, 40),
      packed.slice(0, packed.length >> 1),
      `%%%${packed}`,
    ]) {
      const out = decompressBounded(bad, SAVE_JSON_MAX_CHARS);
      expect(out === null || typeof out === 'string').toBe(true);
    }
  });
});

describe('importing a save code', () => {
  it('never refuses a save the game wrote: six ways of playing, two years each', () => {
    for (const [name, strategy] of Object.entries(STRATEGIES)) {
      const s = newGame({ seed: 42, cityId: 'cal' });
      strategy.setup?.(s);
      expect(
        importProblem(JSON.parse(serialize(s)), SCHEMA_VERSION),
        `${name} at the start`,
      ).toBeNull();
      for (let week = 1; week <= 104; week++) {
        advanceWeeks(s, 1);
        strategy.weekly?.(s);
        if (week % 26 === 0) {
          expect(
            importProblem(JSON.parse(serialize(s)), SCHEMA_VERSION),
            `${name}, week ${week}`,
          ).toBeNull();
        }
      }
      expect(importCode(exportCode(s)), name).toEqual(s);
    }
  });

  it('refuses a save with a part emptied, missing or of the wrong kind, and says where', () => {
    const s = runScript(8);
    const breaks: [string, (save: Part) => void, RegExp][] = [
      [
        'cash as words',
        (c) => (part(c, 'company').cash = 'lots'),
        /company\.cash should be a number/,
      ],
      ['the clock emptied', (c) => (c.clock = {}), /clock\.\w+ is missing/],
      ['the clock as nothing', (c) => (c.clock = null), /clock should be a part with names/],
      ['the world as a list', (c) => (c.world = []), /world should be a part with names/],
      ['the settings as text', (c) => (c.settings = 'default'), /settings should be/],
      [
        'a week that is not a number',
        (c) => (part(c, 'clock').week = null),
        /clock\.week should be a number/,
      ],
      ['history as a number', (c) => (c.history = 7), /history should be/],
    ];
    for (const [what, edit, says] of breaks)
      expect(() => importCode(edited(s, edit)), what).toThrow(says);
  });

  it('refuses a code that is too long, or that unpacks to too much, before reading it', () => {
    expect(() => importCode(`FL${SCHEMA_VERSION}:${'A'.repeat(SAVE_CODE_MAX_CHARS)}`)).toThrow(
      SAVE_TOO_BIG,
    );
    // The hand-written code is a real one: the library unpacks a small one to the same spaces.
    const small = bomb(60);
    expect(decompressFromEncodedURIComponent(small.packed)).toBe(' '.repeat(small.chars));
    expect(decompressBounded(small.packed, SAVE_JSON_MAX_CHARS)).toBe(' '.repeat(small.chars));
    const big = bomb(8200);
    expect(big.chars).toBeGreaterThan(SAVE_JSON_MAX_CHARS);
    expect(big.packed.length).toBeLessThan(20_000); // under 20 KB of code for over 32 million characters
    expect(() => importCode(`FL${SCHEMA_VERSION}:${big.packed}`)).toThrow(SAVE_TOO_BIG);
  });

  it('gives a plain message when an old save trips a migration', () => {
    const code = `FL1:${pack(JSON.stringify({ schemaVersion: 1 }))}`;
    expect(() => importCode(code)).toThrow(/can't be brought up to this version|missing/);
  });
});
