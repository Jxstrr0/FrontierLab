// Portrait generator (ART_DIRECTION §4): banknote-style engraved portraits in
// an oval guilloche frame, built from parts (portraitParts, portraitHair,
// portraitFace, portraitTrim, portraitAttire) and fully determined by an
// AvatarSpec. Returns the SVG markup for a 100 × 125 plate; "__ID__" marks ids
// the caller replaces per instance. Skin, hair and outfit colours are tinted
// fills under the hatching, like a hand-coloured engraving; shading density
// (spec.shade) sets how close the hatching sits. The figure is a bust: the
// head fills the upper oval and the shoulders run out past the frame. Pure and
// memoised.
import {
  AVATAR_PARTS,
  HAIR_TONE_LIGHT,
  HAIR_TONES,
  OUTFIT_TONES,
  SKIN_TONES,
} from '../data/avatarParts';
import type { AvatarSpec } from '../sim/state';
import { ellipsePts, hatch, poly, stipple, waveOval, type Pt } from './engrave';
import { attire, neckline } from './portraitAttire';
import { ageLines, brows, eyes, faceGeom, lipLine, mouth, nose } from './portraitFace';
import { hairParts } from './portraitHair';
import { arc, facialParts, headArc, headGeom, type HeadGeom } from './portraitParts';
import { ears, glasses } from './portraitTrim';
import { hashString, artRng } from './prng';

export const PORTRAIT_W = 100;
export const PORTRAIT_H = 125;
const CX = 50;
const CY = 62.5;
/** Frame: guilloche band between the outer and inner oval, paper inside. */
const FRAME = { rx: 48, ry: 60.5, inner: 4.2 } as const;

export { SKIN_TONES };

/** Hatch spacing per shading density (0 light … 2 dense), and the coarse multiplier for tiny sizes. */
const SHADE_SPACING = [2.7, 2.1, 1.6];
const COARSE = 1.6;
/** The figure is drawn at this scale so the head fills the oval like a banknote portrait. */
const FIGURE_SCALE = 1.42;
/** Head space y = 56 (the head's centre) lands here on the plate. */
const FIGURE_Y = 52;
const FIGURE = `matrix(${FIGURE_SCALE} 0 0 ${FIGURE_SCALE} ${50 - 50 * FIGURE_SCALE} ${FIGURE_Y - 56 * FIGURE_SCALE})`;
/** The shoulders sit this much higher than the attire's drawing, for a short neck. */
const SHOULDER_LIFT = 9;
/** Where the neck meets the collar, in head space. */
const NECK_BASE = 92 - SHOULDER_LIFT;
/** Background: fine ruled lines everywhere, denser in a band at the rim (a vignette fade). */
const GROUND = { spacing: 2.4, rimSpacing: 1.2, rimInner: 0.8 } as const;
/** Light hair gets up to this much wider hatching, so blonde and silver read light. */
const LIGHT_SPACING = 0.9;

/** Part counts (ART_DIRECTION §4), from src/data/avatarParts.ts plus shading density. */
export const PART_COUNTS = {
  ...(Object.fromEntries(AVATAR_PARTS.map((p) => [p.part, p.names.length])) as Record<
    (typeof AVATAR_PARTS)[number]['part'],
    number
  >),
  shade: 3,
};
type PartKey = keyof typeof PART_COUNTS;
const PART_KEYS = Object.keys(PART_COUNTS) as PartKey[];
/** Hair styles a soft face never gets from a seed, and ones a strong face never gets. */
const NOT_SOFT = new Set([2, 3]);
const NOT_STRONG = new Set([6, 13, 14]);

const PI = Math.PI;
const cache = new Map<string, string>();

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const fill = (pts: readonly Pt[], cls: string, extra = '') => path(poly(pts), cls, extra);

function clampSpec(a: AvatarSpec): AvatarSpec {
  const m = (v: number | undefined, n: number) => (((Math.round(v ?? 0) || 0) % n) + n) % n;
  const out = {} as AvatarSpec;
  for (const k of PART_KEYS) out[k] = m(k === 'shade' ? (a.shade ?? 1) : a[k], PART_COUNTS[k]);
  return out;
}

/**
 * A deterministic avatar from any seed (review cards, advisors without a
 * person). A soft face never has facial hair, and hair suits the look.
 */
export function avatarFromSeed(seed: number | string): AvatarSpec {
  const rng = artRng(typeof seed === 'number' ? seed >>> 0 : hashString(seed));
  const pick = (k: PartKey) => rng.int(0, PART_COUNTS[k] - 1);
  const look = pick('look');
  const soft = look === 1;
  const age = pick('age');
  let hair = pick('hair');
  while ((soft ? NOT_SOFT : NOT_STRONG).has(hair)) hair = pick('hair');
  const silver = HAIR_TONES.length - 1;
  return {
    look,
    head: pick('head'),
    hair,
    hairTone: age === 2 && rng.chance(0.75) ? silver : rng.int(0, silver - 1),
    facial: soft || rng.chance(0.55) ? 0 : rng.int(1, PART_COUNTS.facial - 1),
    glasses: rng.chance(0.65) ? 0 : rng.int(1, PART_COUNTS.glasses - 1),
    attire: pick('attire'),
    outfit: pick('outfit'),
    tone: pick('tone'),
    shade: pick('shade'),
    eyes: pick('eyes'),
    brows: pick('brows'),
    mouth: pick('mouth'),
    age,
  };
}

/** The guilloche frame: two interlaced rippled ovals in a brass band. */
function frame(coarse: boolean): string {
  const { rx, ry, inner } = FRAME;
  const out = [
    `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" class="pt-frame"/>`,
    `<ellipse cx="${CX}" cy="${CY}" rx="${rx - inner}" ry="${ry - inner}" class="pt-frame-in"/>`,
  ];
  if (!coarse) {
    const mid = inner / 2;
    out.push(path(waveOval(CX, CY, rx - mid, ry - mid, 36, 1.3), 'pt-guil'));
    out.push(path(waveOval(CX, CY, rx - mid, ry - mid, 36, 1.3, PI), 'pt-guil'));
  }
  return out.join('');
}

/** Ruled paper behind the figure, with a denser band toward the rim. */
function ground(): string {
  const { rx, ry, inner } = FRAME;
  const outer = ellipsePts(CX, CY, rx - inner, ry - inner, 48);
  const hole = ellipsePts(
    CX,
    CY,
    (rx - inner) * GROUND.rimInner,
    (ry - inner) * GROUND.rimInner,
    48,
  );
  // Outer loop then the inner loop reversed: even-odd hatching leaves the middle clear.
  const ring = [...outer, ...hole.reverse()];
  return (
    path(hatch(outer, GROUND.spacing, 0), 'pt-ground') +
    path(hatch(ring, GROUND.rimSpacing, 0), 'pt-ground')
  );
}

function head(h: HeadGeom, skin: string, sp: number, fine: boolean): string {
  const pts = headArc(h, 0, 2 * PI, 48);
  const out: string[] = [ears(h, skin, sp, fine)];
  out.push(fill(pts, 'pt-skin', ` style="fill:${skin}"`));
  // Light from the upper left: a crescent of hatching on the right cheek and jaw.
  const shadow: Pt[] = [
    ...headArc(h, -1.0, 1.9, 20),
    ...arc(h.cx - h.rx * 0.05, h.cy + 1, h.rx * 0.78, h.ry * 0.95, 1.75, -0.95, 20),
  ];
  out.push(path(hatch(shadow, sp, 45), 'pt-hatch'));
  if (fine) {
    // The jaw's underside and the temple on the shadow side, a touch denser.
    const jaw: Pt[] = [
      ...headArc(h, 0.55, 1.45, 12),
      ...arc(h.cx, h.cy, h.rx * 0.82, h.ry * 0.86, 1.4, 0.6, 12),
    ];
    out.push(path(hatch(jaw, sp * 0.7, 45), 'pt-hatch'));
    const temple: Pt[] = [
      ...headArc(h, -0.9, -0.3, 8),
      ...arc(h.cx, h.cy, h.rx * 0.8, h.ry * 0.8, -0.3, -0.9, 8),
    ];
    out.push(path(hatch(temple, sp * 0.8, 45), 'pt-hatch'));
  }
  out.push(fill(pts, 'pt-line'));
  return out.join('');
}

/** A hair region: tinted fill, engraved texture, strand lines and an outline. */
function hairShape(
  pts: readonly Pt[],
  angle: number,
  sp: number,
  stippled: boolean,
  hairTone: number,
  fine: boolean,
): string {
  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const light = HAIR_TONE_LIGHT[hairTone] ?? 0;
  const space = sp * 0.75 * (1 + light * LIGHT_SPACING);
  const texture = stippled
    ? path(
        stipple(
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
          Math.round(70 - light * 30),
          7,
        ),
        'pt-dots',
      )
    : path(hatch(pts, space, angle), 'pt-hatch');
  const strands = fine && !stippled ? path(hatch(pts, space * 3.2, angle + 9), 'pt-strand') : '';
  return (
    fill(pts, 'pt-hair', ` style="fill:${HAIR_TONES[hairTone]}"`) +
    texture +
    strands +
    fill(pts, 'pt-line pt-fine')
  );
}

/** A soft face's lips carry a rosy tint over the skin. */
function lipTint(h: HeadGeom, mouthY: number, kind: number): string {
  const w = kind === 2 ? 4.6 : kind === 1 ? 3.7 : 4.1;
  const top = kind === 1 ? mouthY + 0.3 : kind === 2 ? mouthY - 0.3 : mouthY;
  const bottom = kind === 2 ? mouthY + 3.6 : kind === 1 ? mouthY + 2.6 : mouthY + 3.2;
  const d =
    `M${h.cx - w} ${top}Q${h.cx - 2} ${top - 1.6} ${h.cx} ${top - 0.6}` +
    `Q${h.cx + 2} ${top - 1.6} ${h.cx + w} ${top}Q${h.cx} ${bottom + 0.6} ${h.cx - w} ${top}Z`;
  return path(d, 'pt-lips');
}

/**
 * Markup for one portrait. `coarse` draws a simpler plate for tiny sizes
 * (advisor bar, review cards): wider hatching, a plain double ring and none of
 * the fine detail.
 */
export function portraitMarkup(spec: AvatarSpec, coarse = false): string {
  const a = clampSpec(spec);
  const key = PART_KEYS.map((k) => a[k]).join('.') + (coarse ? '.c' : '.f');
  const hit = cache.get(key);
  if (hit) return hit;

  const fine = !coarse;
  const soft = a.look === 1;
  const h = headGeom(a.head, soft);
  const g = faceGeom(h);
  const sp = (SHADE_SPACING[a.shade]! * (coarse ? COARSE : 1)) / FIGURE_SCALE;
  const skin = SKIN_TONES[a.tone]!;
  const cloth = OUTFIT_TONES[a.outfit]!;
  const veteran = a.age === 2;
  const hair = hairParts(a.hair, h);
  const hairOf = (pts: readonly Pt[], stippled = false) =>
    hairShape(pts, hair.angle, sp, stippled, a.hairTone, fine);
  const neckW = soft ? 6 : 7;
  const neck: Pt[] = [
    [h.cx - neckW, h.cy + h.ry - 8],
    [h.cx + neckW, h.cy + h.ry - 8],
    [h.cx + neckW + 1.5, NECK_BASE + 4],
    [h.cx - neckW - 1.5, NECK_BASE + 4],
  ];
  const neckShade: Pt[] = [
    [h.cx - neckW, h.cy + h.ry - 6],
    [h.cx + neckW, h.cy + h.ry - 6],
    [h.cx + neckW + 0.6, h.cy + h.ry + 1.5],
    [h.cx - neckW - 0.6, h.cy + h.ry + 1.5],
  ];
  const neckLines = fine
    ? path(
        `M${h.cx + 3.4} ${h.cy + h.ry + 1}Q${h.cx + 4.4} ${h.cy + h.ry + 4} ${h.cx + 5} ${NECK_BASE + 1}` +
          (veteran
            ? `M${h.cx - 4} ${h.cy + h.ry + 3}q4 1.2 8 0M${h.cx - 3.4} ${h.cy + h.ry + 5.4}q3.4 1 6.8 0`
            : ''),
        'pt-wrinkle',
      )
    : '';
  const { rx, ry, inner } = FRAME;
  const clip = `<clipPath id="__ID__"><ellipse cx="${CX}" cy="${CY}" rx="${rx - inner}" ry="${ry - inner}"/></clipPath>`;
  const beard = facialParts(a.facial, h, g.mouthY)
    .map((pts) => hairShape(pts, 75, sp, false, a.hairTone, fine))
    .join('');
  const lips =
    a.facial === 3
      ? `<ellipse cx="${h.cx}" cy="${g.mouthY + 0.5}" rx="4.6" ry="1.9" class="pt-skin" style="fill:${skin}"/>` +
        path(lipLine(h, g, a.mouth), 'pt-line pt-fine')
      : '';

  const svg = [
    `<defs>${clip}</defs>`,
    `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" class="pt-paper"/>`,
    `<g clip-path="url(#__ID__)">`,
    fine ? ground() : '',
    `<g transform="${FIGURE}">`,
    hair.back.map((pts) => hairOf(pts)).join(''),
    fill(neck, 'pt-skin', ` style="fill:${skin}"`),
    path(hatch(neckShade, sp * 0.8, 45), 'pt-hatch'),
    fill(neck, 'pt-line pt-fine'),
    neckLines,
    `<g transform="translate(0 ${-SHOULDER_LIFT})">`,
    attire(a.attire, h, sp, fine, cloth, SHOULDER_LIFT),
    neckline(a.attire, fine),
    `</g>`,
    hair.mid.map((pts) => hairOf(pts)).join(''),
    head(h, skin, sp, fine),
    ageLines(h, g, a.age, sp, fine),
    eyes(h, g, a.eyes, sp, fine, soft),
    brows(h, g, a.brows, sp, fine, soft, HAIR_TONES[a.hairTone]!),
    nose(h, g, sp, fine),
    soft && a.facial !== 3 ? lipTint(h, g.mouthY, a.mouth) : '',
    mouth(h, g, a.mouth, sp, fine),
    beard,
    lips,
    hair.front.map((pts) => hairOf(pts, !!hair.stipple)).join(''),
    glasses(a.glasses, h, g, fine),
    `</g></g>`,
    frame(coarse),
  ].join('');
  cache.set(key, svg);
  return svg;
}
