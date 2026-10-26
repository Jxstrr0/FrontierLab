// Portrait generator (ART_DIRECTION §4): banknote-style engraved portraits in
// an oval guilloche frame, built from parts (portraitParts, portraitFace,
// portraitTrim, portraitAttire) and fully determined by an AvatarSpec. Returns
// the SVG markup for a 100 × 125 plate; "__ID__" marks ids the caller replaces
// per instance. Skin tone is a tinted fill under the hatching (never line
// density alone); shading density (spec.shade) sets how close the hatching
// sits. Pure and memoised.
import type { AvatarSpec } from '../sim/state';
import { ellipsePts, hatch, poly, stipple, waveOval, type Pt } from './engrave';
import { attire, neckline } from './portraitAttire';
import { ageLines, brows, eyes, faceGeom, lipLine, mouth, nose } from './portraitFace';
import { arc, facialParts, hairParts, headArc, headGeom, type HeadGeom } from './portraitParts';
import { ears, glasses } from './portraitTrim';
import { hashString, artRng } from './prng';

export const PORTRAIT_W = 100;
export const PORTRAIT_H = 125;
const CX = 50;
const CY = 62.5;
/** Frame: guilloche band between the outer and inner oval, paper inside. */
const FRAME = { rx: 48, ry: 60.5, inner: 4.2 } as const;

/** Six skin tones: muted, ink-tinted fills (light to deep). */
export const SKIN_TONES = ['#F2DEC8', '#E3C1A1', '#C99E7A', '#A57A58', '#7D5940', '#57402F'];

/** Hatch spacing per shading density (0 light … 2 dense), and the coarse multiplier for tiny sizes. */
const SHADE_SPACING = [2.7, 2.1, 1.6];
const COARSE = 1.6;
/** The figure is drawn at this scale so the head fills the oval like a banknote portrait. */
const FIGURE_SCALE = 1.3;
const FIGURE = `matrix(${FIGURE_SCALE} 0 0 ${FIGURE_SCALE} ${50 - 50 * FIGURE_SCALE} ${52 - 56 * FIGURE_SCALE})`;
/** Background: fine ruled lines everywhere, denser in a band at the rim (a vignette fade). */
const GROUND = { spacing: 2.4, rimSpacing: 1.2, rimInner: 0.8 } as const;
/** Veteran hair is silver: a fainter fill and wider hatching. */
const GREY_SPACING = 1.6;
const VETERAN = 2;

/** Part counts (ART_DIRECTION §4), matching src/data/avatarParts.ts. */
export const PART_COUNTS = {
  head: 4,
  hair: 12,
  facial: 4,
  glasses: 4,
  attire: 4,
  tone: 6,
  shade: 3,
  eyes: 4,
  brows: 3,
  mouth: 3,
  age: 3,
};

const PI = Math.PI;
const cache = new Map<string, string>();

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const fill = (pts: readonly Pt[], cls: string, extra = '') => path(poly(pts), cls, extra);

function clampSpec(a: AvatarSpec): AvatarSpec {
  const m = (v: number | undefined, n: number) => (((Math.round(v ?? 0) || 0) % n) + n) % n;
  return {
    head: m(a.head, PART_COUNTS.head),
    hair: m(a.hair, PART_COUNTS.hair),
    facial: m(a.facial, PART_COUNTS.facial),
    glasses: m(a.glasses, PART_COUNTS.glasses),
    attire: m(a.attire, PART_COUNTS.attire),
    tone: m(a.tone, PART_COUNTS.tone),
    shade: m(a.shade ?? 1, PART_COUNTS.shade),
    eyes: m(a.eyes, PART_COUNTS.eyes),
    brows: m(a.brows, PART_COUNTS.brows),
    mouth: m(a.mouth, PART_COUNTS.mouth),
    age: m(a.age, PART_COUNTS.age),
  };
}

/** A deterministic avatar from any seed (review cards, advisors without a person). */
export function avatarFromSeed(seed: number | string): AvatarSpec {
  const rng = artRng(typeof seed === 'number' ? seed >>> 0 : hashString(seed));
  return {
    head: rng.int(0, PART_COUNTS.head - 1),
    hair: rng.int(0, PART_COUNTS.hair - 1),
    facial: rng.chance(0.6) ? 0 : rng.int(1, PART_COUNTS.facial - 1),
    glasses: rng.chance(0.65) ? 0 : rng.int(1, PART_COUNTS.glasses - 1),
    attire: rng.int(0, PART_COUNTS.attire - 1),
    tone: rng.int(0, PART_COUNTS.tone - 1),
    shade: rng.int(0, PART_COUNTS.shade - 1),
    eyes: rng.int(0, PART_COUNTS.eyes - 1),
    brows: rng.int(0, PART_COUNTS.brows - 1),
    mouth: rng.int(0, PART_COUNTS.mouth - 1),
    age: rng.int(0, PART_COUNTS.age - 1),
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
  grey: boolean,
  fine: boolean,
): string {
  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const space = sp * 0.75 * (grey ? GREY_SPACING : 1);
  const texture = stippled
    ? path(
        stipple(
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
          grey ? 40 : 70,
          7,
        ),
        'pt-dots',
      )
    : path(hatch(pts, space, angle), 'pt-hatch');
  const strands = fine && !stippled ? path(hatch(pts, space * 3.2, angle + 9), 'pt-strand') : '';
  return (
    fill(pts, grey ? 'pt-hair pt-grey' : 'pt-hair') +
    texture +
    strands +
    fill(pts, 'pt-line pt-fine')
  );
}

/**
 * Markup for one portrait. `coarse` draws a simpler plate for tiny sizes
 * (advisor bar, review cards): wider hatching, a plain double ring and none of
 * the fine detail.
 */
export function portraitMarkup(spec: AvatarSpec, coarse = false): string {
  const a = clampSpec(spec);
  const key = `${a.head}.${a.hair}.${a.facial}.${a.glasses}.${a.attire}.${a.tone}.${a.shade}.${a.eyes}.${a.brows}.${a.mouth}.${a.age}.${coarse ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const fine = !coarse;
  const h = headGeom(a.head);
  const g = faceGeom(h);
  const sp = (SHADE_SPACING[a.shade]! * (coarse ? COARSE : 1)) / FIGURE_SCALE;
  const skin = SKIN_TONES[a.tone]!;
  const grey = a.age === VETERAN;
  const hair = hairParts(a.hair, h);
  const neck: Pt[] = [
    [h.cx - 7, h.cy + h.ry - 8],
    [h.cx + 7, h.cy + h.ry - 8],
    [h.cx + 8, 96],
    [h.cx - 8, 96],
  ];
  const neckShade: Pt[] = [
    [h.cx - 7, h.cy + h.ry - 6],
    [h.cx + 7, h.cy + h.ry - 6],
    [h.cx + 8, h.cy + h.ry + 1],
    [h.cx - 8, h.cy + h.ry + 1],
  ];
  const neckLines = fine
    ? path(
        `M${h.cx + 3.4} ${h.cy + h.ry + 1}Q${h.cx + 4.6} ${h.cy + h.ry + 5} ${h.cx + 5.2} ${h.cy + h.ry + 9}` +
          (grey
            ? `M${h.cx - 4} ${h.cy + h.ry + 3}q4 1.2 8 0M${h.cx - 3.4} ${h.cy + h.ry + 5.4}q3.4 1 6.8 0`
            : ''),
        'pt-wrinkle',
      )
    : '';
  const { rx, ry, inner } = FRAME;
  const clip = `<clipPath id="__ID__"><ellipse cx="${CX}" cy="${CY}" rx="${rx - inner}" ry="${ry - inner}"/></clipPath>`;
  const beard = facialParts(a.facial, h, g.mouthY)
    .map((pts) => hairShape(pts, 75, sp, false, grey, fine))
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
    hair.back.map((pts) => hairShape(pts, hair.angle, sp, false, grey, fine)).join(''),
    fill(neck, 'pt-skin', ` style="fill:${skin}"`),
    path(hatch(neckShade, sp * 0.8, 45), 'pt-hatch'),
    fill(neck, 'pt-line pt-fine'),
    neckLines,
    attire(a.attire, h, sp, fine),
    neckline(a.attire, fine),
    head(h, skin, sp, fine),
    ageLines(h, g, a.age, sp, fine),
    eyes(h, g, a.eyes, sp, fine),
    brows(h, g, a.brows, sp, fine),
    nose(h, g, sp, fine),
    mouth(h, g, a.mouth, sp, fine),
    beard,
    lips,
    hair.front.map((pts) => hairShape(pts, hair.angle, sp, !!hair.stipple, grey, fine)).join(''),
    glasses(a.glasses, h, g, fine),
    `</g></g>`,
    frame(coarse),
  ].join('');
  cache.set(key, svg);
  return svg;
}
