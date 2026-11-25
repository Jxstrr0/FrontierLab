// The stricter check for a save that comes from outside the game: a pasted save
// code or a backup file (DATA_MODEL §10). The plain check in serialize.ts only
// looks for the top-level names, so a code with a part emptied, or a number
// swapped for text, used to load and then leave a blank page.
//
// It works by example. A fresh game made by this version of the code is the
// pattern: wherever the pattern has a number, the save must have a real number;
// where it has a list, a list; where it has a part with names, that part with
// the same names. Nothing here lists the save's fields, so it needs no upkeep
// when the state grows. Where the pattern has nothing (null, an empty list or
// table), the save is not checked: the check can turn away a broken save, but
// it never asks for something a fresh game does not have.
//
// Only imports go through it. The game's own slots load as before, so a save the
// game wrote itself is never refused by a rule here.

type Kind = 'null' | 'array' | 'object' | 'number' | 'string' | 'boolean';

function kindOf(v: unknown): Kind {
  if (v === null || v === undefined) return 'null';
  if (Array.isArray(v)) return 'array';
  const t = typeof v;
  return t === 'object' || t === 'number' || t === 'string' || t === 'boolean' ? t : 'null';
}

type Obj = Record<string, unknown>;

/**
 * One pattern from several examples (the entries of a list or a table): what
 * they all agree on. Where they disagree the pattern says nothing (null).
 */
function common(samples: unknown[]): unknown {
  if (!samples.length) return null;
  const kind = kindOf(samples[0]);
  if (kind === 'null' || samples.some((s) => kindOf(s) !== kind)) return null;
  if (kind === 'array') return [common((samples as unknown[][]).flat())];
  if (kind !== 'object') return samples[0];
  const out: Obj = {};
  for (const key of Object.keys(samples[0] as Obj)) {
    if ((samples as Obj[]).every((s) => key in s))
      out[key] = common((samples as Obj[]).map((s) => s[key]));
  }
  return out;
}

/**
 * A table keyed by id (offices, rivals, lots, listed companies…) and not a part
 * with fixed names. A table's entries are checked against what they have in
 * common, and no particular entry has to be there.
 */
function isTable(pattern: Obj, other: Obj | undefined): boolean {
  const keys = Object.keys(pattern);
  if (!keys.length) return true;
  // The second fresh game is in another city with another seed: a table's ids differ, a part's names don't.
  if (other && (Object.keys(other).length !== keys.length || keys.some((k) => !(k in other))))
    return true;
  // Ids are written with a separator (lot_cal_0001, sites5:cal) or start with a digit.
  if (keys.some((k) => /[_:-]|^\d/.test(k))) return true;
  // Entries that all carry the same names are rows of a table (listed companies by ticker).
  if (keys.length < 2) return false;
  const names = (v: unknown) =>
    kindOf(v) === 'object'
      ? Object.keys(v as Obj)
          .sort()
          .join()
      : null;
  const first = names(pattern[keys[0]!]);
  return !!first && keys.every((k) => names(pattern[k]) === first);
}

export interface ShapeOptions {
  /** Paths (dotted, `*` for a table's or list's entries) that may be empty in a real save. */
  mayBeNull?: ReadonlySet<string>;
  /** A name the pattern has may be absent (a save an older version wrote, brought forward by migrations). */
  allowMissing?: boolean;
  /** Collect up to this many problems (the default stops at the first). */
  limit?: number;
}

/**
 * Checks `save` against two fresh games. Returns what is wrong, in plain words
 * with the place in the save, or an empty list.
 */
export function shapeProblems(
  save: unknown,
  a: unknown,
  b: unknown,
  opts: ShapeOptions = {},
): string[] {
  const found: string[] = [];
  const limit = opts.limit ?? 1;
  const nullable = opts.mayBeNull ?? new Set<string>();

  const walk = (
    pattern: unknown,
    other: unknown,
    value: unknown,
    path: string,
    generic: string,
  ): void => {
    if (found.length >= limit) return;
    const want = kindOf(pattern);
    if (want === 'null') return;
    const got = kindOf(value);
    if (got !== want) {
      // Inside a table or a list an entry may leave a field empty (a rival with no model yet).
      if (got === 'null' && (generic.includes('*') || nullable.has(generic))) return;
      found.push(`${path || 'the save'} should be ${WORDS[want]}`);
      return;
    }
    if (want === 'number') {
      if (!Number.isFinite(value as number)) found.push(`${path} is not a real number`);
      return;
    }
    if (want === 'array') {
      const entry = common(pattern as unknown[]);
      if (entry === null) return;
      (value as unknown[]).forEach((v, i) =>
        walk(entry, undefined, v, `${path}[${i}]`, `${generic}.*`),
      );
      return;
    }
    if (want !== 'object') return;
    const p = pattern as Obj;
    const v = value as Obj;
    const o = kindOf(other) === 'object' ? (other as Obj) : undefined;
    if (isTable(p, o)) {
      const entry = common([...Object.values(p), ...(o ? Object.values(o) : [])]);
      if (entry === null) return;
      for (const key of Object.keys(v))
        walk(entry, undefined, v[key], `${path}.${key}`, `${generic}.*`);
      return;
    }
    for (const key of Object.keys(p)) {
      const at = path ? `${path}.${key}` : key;
      const g = generic ? `${generic}.${key}` : key;
      if (!(key in v)) {
        // Only a fixed part must carry every name; an entry of a table or a list may leave one out.
        if (kindOf(p[key]) !== 'null' && !opts.allowMissing && !g.includes('*') && !nullable.has(g))
          found.push(`${at} is missing`);
        if (found.length >= limit) return;
        continue;
      }
      walk(p[key], o?.[key], v[key], at, g);
    }
  };

  walk(a, b, save, '', '');
  return found;
}

const WORDS: Record<Kind, string> = {
  null: 'empty',
  array: 'a list',
  object: 'a part with names',
  number: 'a number',
  string: 'text',
  boolean: 'yes or no',
};
