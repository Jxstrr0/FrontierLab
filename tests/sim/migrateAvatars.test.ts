// Save migration 28 → 29 (src/sim/save/migrateAvatars.ts): every portrait
// gains a look, a hair colour and an outfit colour; generated soft faces lose
// facial hair; the founder keeps the parts the player chose.
import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { AvatarSpec, GameState } from '../../src/sim/state';

const NEW_KEYS = ['look', 'hairTone', 'outfit'] as const;

function portraits(node: unknown, out: AvatarSpec[] = []): AvatarSpec[] {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => portraits(n, out));
    return out;
  }
  const o = node as Record<string, unknown>;
  if ('head' in o && 'hair' in o && 'eyes' in o) {
    out.push(o as unknown as AvatarSpec);
    return out;
  }
  Object.values(o).forEach((v) => portraits(v, out));
  return out;
}

/** A schema-28 save: every portrait without the new fields, some with beards. */
function oldSave(founder: Partial<AvatarSpec>): GameState {
  const s = newGame({ seed: 7, cityId: 'cal' });
  for (const a of portraits(s)) {
    for (const k of NEW_KEYS) delete (a as Partial<AvatarSpec>)[k];
    a.facial = 3;
  }
  Object.assign(s.meta.founderAvatar, founder);
  s.schemaVersion = 28;
  return s;
}

describe('migration 28 → 29: portrait rework', () => {
  it('fills the new fields everywhere and leaves no soft face with a beard', () => {
    const s = migrations[28]!(oldSave({}) as never) as unknown as GameState;
    const all = portraits(s);
    expect(all.length).toBeGreaterThan(5);
    for (const a of all) {
      for (const k of NEW_KEYS) expect(a[k]).toBeGreaterThanOrEqual(0);
      if (a !== s.meta.founderAvatar && a.look === 1) expect(a.facial).toBe(0);
    }
  });

  it('keeps the founder as chosen, silver-haired if a veteran', () => {
    const bearded = migrations[28]!(
      oldSave({ facial: 3, hair: 7, age: 2 }) as never,
    ) as unknown as GameState;
    expect(bearded.meta.founderAvatar).toMatchObject({ facial: 3, hair: 7, look: 0, hairTone: 6 });
    const bob = migrations[28]!(
      oldSave({ facial: 0, hair: 6, age: 0 }) as never,
    ) as unknown as GameState;
    expect(bob.meta.founderAvatar).toMatchObject({ facial: 0, hair: 6, look: 1, hairTone: 1 });
  });
});
