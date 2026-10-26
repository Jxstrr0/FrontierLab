// Face detail (ART_DIRECTION §4, DATA_MODEL §12): every portrait carries eyes,
// brows, mouth and age; new faces derive them from their other parts, and v22
// saves gain the same values on load while the founder keeps the look they chose.
import { describe, expect, it } from 'vitest';
import { PART_COUNTS } from '../../src/art/portraits';
import { newGame } from '../../src/sim/newGame';
import { faceDetail, randomAvatar } from '../../src/sim/people';
import { stream } from '../../src/sim/rng';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type AvatarSpec, type GameState } from '../../src/sim/state';

const FACE_KEYS = ['eyes', 'brows', 'mouth', 'age'] as const;

function stripFaces(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(stripFaces);
  const o = node as Record<string, unknown>;
  if ('head' in o && 'hair' in o && 'eyes' in o) {
    for (const k of FACE_KEYS) delete o[k];
    return;
  }
  Object.values(o).forEach(stripFaces);
}

function faces(node: unknown, out: AvatarSpec[] = []): AvatarSpec[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => faces(n, out));
    return out;
  }
  const o = node as Record<string, unknown>;
  if ('head' in o && 'hair' in o && 'tone' in o) {
    out.push(o as unknown as AvatarSpec);
    return out;
  }
  Object.values(o).forEach((v) => faces(v, out));
  return out;
}

describe('face detail', () => {
  it('gives every generated person eyes, brows, mouth and age in range', () => {
    const s = newGame({ seed: 11, cityId: 'cal' });
    const all = faces(s);
    expect(all.length).toBeGreaterThan(5);
    for (const a of all) {
      for (const k of FACE_KEYS) {
        expect(a[k]).toBeGreaterThanOrEqual(0);
        expect(a[k]).toBeLessThan(PART_COUNTS[k]);
      }
    }
  });

  it('derives the detail from the other parts, the same every time', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const a = randomAvatar(stream(s, 'people'));
    const { eyes, brows, mouth, age, ...base } = a;
    expect(faceDetail(base)).toEqual({ eyes, brows, mouth, age });
    expect(faceDetail({ ...base, hair: (base.hair + 1) % 12 })).not.toEqual(faceDetail(base));
  });

  it('varies across people', () => {
    const s = newGame({ seed: 11, cityId: 'cal' });
    const all = faces(s);
    for (const k of FACE_KEYS) {
      expect(new Set(all.map((a) => a[k])).size).toBeGreaterThan(1);
    }
  });

  it('upgrades v22 saves: founder unchanged, everyone else gets their face', () => {
    const s = newGame({ seed: 7, cityId: 'cal', founderAvatar: { ...s0Avatar(), hair: 5 } });
    const raw = JSON.parse(JSON.stringify(s)) as Record<string, unknown> & {
      schemaVersion: number;
    };
    stripFaces(raw);
    raw.schemaVersion = 22;
    expect(faces(raw).every((a) => a.eyes === undefined)).toBe(true);
    const up = migrate(raw) as unknown as GameState;
    expect(up.schemaVersion).toBe(SCHEMA_VERSION);
    expect(up.meta.founderAvatar).toMatchObject({ hair: 5, eyes: 0, brows: 0, mouth: 0, age: 0 });
    const before = faces(s).filter((a) => a !== s.meta.founderAvatar);
    const after = faces(up).filter((a) => a !== up.meta.founderAvatar);
    expect(after.length).toBe(before.length);
    after.forEach((a, i) => expect(a).toEqual(before[i]));
  });
});

function s0Avatar(): AvatarSpec {
  return {
    head: 0,
    hair: 0,
    facial: 0,
    glasses: 0,
    attire: 0,
    tone: 0,
    shade: 1,
    eyes: 0,
    brows: 0,
    mouth: 0,
    age: 0,
  };
}
