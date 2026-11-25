// Adapted from lz-string 1.5.0 libs/lz-string.js (MIT, pieroxy) (2026-11-25)
//
// Unpacks a save code's text the way lz-string's decompressFromEncodedURIComponent
// does, with one difference: it stops as soon as the unpacked text passes a
// limit. A short code can be written to unpack to hundreds of megabytes; the
// library builds all of it before anyone can look at its size, which can freeze
// or close the page on a phone. Only pasted codes and backup files come through
// here (DATA_MODEL §10). Saving, and the game's own slots, still use the library.

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
/** Each character of a code carries six bits; the reader starts at the top one. */
const TOP_BIT = 32;
/** The three marks the packed text uses: a one-byte character, a two-byte character, the end. */
const CHAR_8 = 0;
const CHAR_16 = 1;
const END = 2;
/** Entry numbers are read as whole-number bits; a real code never gets near this many (it would hold a billion entries). */
const MAX_CODE_BITS = 30;

const VALUE_OF = new Map<string, number>([...ALPHABET].map((ch, i) => [ch, i]));

/** Thrown when a code would unpack to more than the limit. */
export class SaveTooBig extends Error {
  constructor() {
    super('too big');
    this.name = 'SaveTooBig';
  }
}

/**
 * The text a save code's packed part unpacks to, or null when it is damaged.
 * Throws SaveTooBig once the text would pass `maxChars`.
 */
export function decompressBounded(packed: string, maxChars: number): string | null {
  if (packed === '') return null;
  const input = packed.replace(/ /g, '+');
  const length = input.length;
  const valueAt = (i: number) => VALUE_OF.get(input.charAt(i)) ?? 0;

  let val = valueAt(0);
  let position = TOP_BIT;
  let index = 1;
  /** Reads `count` bits, lowest first, as the library does. */
  const read = (count: number): number => {
    let bits = 0;
    for (let i = 0; i < count; i++) {
      const on = (val & position) > 0;
      position >>= 1;
      if (position === 0) {
        position = TOP_BIT;
        val = valueAt(index++);
      }
      if (on) bits |= 1 << i;
    }
    return bits;
  };

  // Entries 0 to 2 are the three marks; real entries start at 3.
  const dictionary: string[] = ['', '', ''];
  let enlargeIn = 4;
  let numBits = 3;

  const first = read(2);
  if (first === END) return '';
  if (first !== CHAR_8 && first !== CHAR_16) return null;
  let w = String.fromCharCode(read(first === CHAR_8 ? 8 : 16));
  dictionary.push(w);
  const result: string[] = [w];
  let size = w.length;

  for (;;) {
    if (index > length) return '';
    let c = read(numBits);
    if (c === END) return result.join('');
    if (c === CHAR_8 || c === CHAR_16) {
      dictionary.push(String.fromCharCode(read(c === CHAR_8 ? 8 : 16)));
      c = dictionary.length - 1;
      enlargeIn--;
    }
    if (enlargeIn === 0) {
      enlargeIn = 1 << numBits;
      numBits++;
      if (numBits > MAX_CODE_BITS) return null;
    }

    let entry: string;
    if (c < dictionary.length && c > END) entry = dictionary[c]!;
    else if (c === dictionary.length) entry = w + w.charAt(0);
    else return null;

    size += entry.length;
    if (size > maxChars) throw new SaveTooBig();
    result.push(entry);

    dictionary.push(w + entry.charAt(0));
    enlargeIn--;
    w = entry;

    if (enlargeIn === 0) {
      enlargeIn = 1 << numBits;
      numBits++;
      if (numBits > MAX_CODE_BITS) return null;
    }
  }
}
