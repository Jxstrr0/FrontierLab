// Face detail (ART_DIRECTION §4, DATA_MODEL §12): every portrait carries eyes,
// brows, mouth and age; new faces derive them from their other parts.
import { describe, expect, it } from 'vitest';
import { PART_COUNTS } from '../../src/art/portraits';
import { newGame } from '../../src/sim/newGame';
import { faceDetail, randomAvatar, SOFT_LOOK } from '../../src/sim/people';
import { stream } from '../../src/sim/rng';
import { type AvatarSpec } from '../../src/sim/state';

const FACE_KEYS = ['eyes', 'brows', 'mouth', 'age'] as const;

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
    // A strong face whose hair wasn't swapped to suit its look keeps its drawn parts.
    const rng = stream(s, 'people');
    let a = randomAvatar(rng);
    while (a.look !== 0 || [0, 11, 12].includes(a.hair)) a = randomAvatar(rng);
    const { eyes, brows, mouth, age, head, hair, facial, glasses, attire, tone, shade } = a;
    const base = { head, hair, facial, glasses, attire, tone, shade };
    expect(faceDetail(base)).toEqual({ eyes, brows, mouth, age });
    expect(faceDetail({ ...base, hair: (base.hair + 1) % 15 })).not.toEqual(faceDetail(base));
  });

  it('never gives a soft-featured person facial hair', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const rng = stream(s, 'people');
    const people = Array.from({ length: 300 }, () => randomAvatar(rng));
    const soft = people.filter((a) => a.look === SOFT_LOOK);
    expect(soft.length).toBeGreaterThan(80);
    expect(soft.every((a) => a.facial === 0)).toBe(true);
    expect(people.some((a) => a.look === 0 && a.facial > 0)).toBe(true);
    for (const a of people) {
      expect(a.hairTone).toBeLessThan(PART_COUNTS.hairTone);
      expect(a.outfit).toBeLessThan(PART_COUNTS.outfit);
    }
  });

  it('varies across people', () => {
    const s = newGame({ seed: 11, cityId: 'cal' });
    const all = faces(s);
    for (const k of FACE_KEYS) {
      expect(new Set(all.map((a) => a[k])).size).toBeGreaterThan(1);
    }
  });
});
