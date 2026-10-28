// Save migration v28 → v29 (portrait rework): every portrait gains a look
// (strong or soft features), a hair colour and an outfit colour. Generated
// people take them from styleDetail, the same hash new people use, and a soft
// face loses any facial hair so no one keeps an odd mix. The founder's parts
// were chosen by the player, so the founder keeps their hair and facial hair:
// facial hair or a short style means strong features, and a veteran's hair
// turns silver (old veteran plates were drawn grey).
import { fitLook, SOFT_LOOK, styleDetail } from '../people';
import type { AvatarSpec, GameState } from '../state';

/** Hair styles that read as soft on a founder with no facial hair: bob, long, bun, ponytail, wavy. */
const SOFT_STYLES = new Set([6, 7, 8, 9, 10]);
const SILVER = 6;
const DARK_BROWN = 1;

function isAvatar(o: Record<string, unknown>): boolean {
  return 'head' in o && 'hair' in o && 'tone' in o && 'eyes' in o;
}

/** Every portrait in the save, wherever it sits (managers, executives, candidates, CEOs …). */
function eachAvatar(node: unknown, visit: (a: AvatarSpec) => void): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) eachAvatar(n, visit);
    return;
  }
  const o = node as Record<string, unknown>;
  if (isAvatar(o)) {
    visit(o as unknown as AvatarSpec);
    return;
  }
  for (const v of Object.values(o)) eachAvatar(v, visit);
}

export function migrateAvatars(state: GameState): void {
  const founder = state.meta.founderAvatar;
  eachAvatar(state, (a) => {
    if (a === founder || a.look !== undefined) return;
    Object.assign(a, styleDetail(a, a.age));
    fitLook(a);
  });
  founder.look = founder.facial === 0 && SOFT_STYLES.has(founder.hair) ? SOFT_LOOK : 0;
  founder.hairTone = founder.age === 2 ? SILVER : DARK_BROWN;
  founder.outfit = 0;
}
