// Portrait generator (ART_DIRECTION §4): banknote-style engraved portraits in
// an oval guilloche frame, built from parts (src/art/portraitParts.ts) and
// fully determined by an AvatarSpec. Returns the SVG markup for a 100 × 125
// plate; "__ID__" marks ids the caller replaces per instance. Skin tone is a
// tinted fill under the hatching (never line density alone); shading density
// (spec.shade) sets how close the hatching sits. Pure and memoised.
import type { AvatarSpec } from '../sim/state';
import { ellipsePts, hatch, poly, stipple, waveOval, type Pt } from './engrave';
import { attire, neckline } from './portraitAttire';
import { arc, facialParts, hairParts, headArc, headGeom, type HeadGeom } from './portraitParts';
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

/** Part counts (ART_DIRECTION §4), matching src/data/avatarParts.ts. */
export const PART_COUNTS = {
  head: 4,
  hair: 12,
  facial: 4,
  glasses: 3,
  attire: 4,
  tone: 6,
  shade: 3,
};

const PI = Math.PI;
const cache = new Map<string, string>();

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const fill = (pts: readonly Pt[], cls: string, extra = '') => path(poly(pts), cls, extra);

function clampSpec(a: AvatarSpec): AvatarSpec {
  const m = (v: number, n: number) => (((Math.round(v) || 0) % n) + n) % n;
  return {
    head: m(a.head, PART_COUNTS.head),
    hair: m(a.hair, PART_COUNTS.hair),
    facial: m(a.facial, PART_COUNTS.facial),
    glasses: m(a.glasses, PART_COUNTS.glasses),
    attire: m(a.attire, PART_COUNTS.attire),
    tone: m(a.tone, PART_COUNTS.tone),
    shade: m(a.shade ?? 1, PART_COUNTS.shade),
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

function head(h: HeadGeom, skin: string, sp: number): string {
  const pts = headArc(h, 0, 2 * PI, 48);
  const out: string[] = [];
  // Ears, then the head over them.
  for (const side of [-1, 1]) {
    const ear = ellipsePts(h.cx + side * (h.rx - 0.5), h.cy + 2, 3, 5, 16);
    out.push(fill(ear, 'pt-skin', ` style="fill:${skin}"`), fill(ear, 'pt-line pt-fine'));
  }
  out.push(fill(pts, 'pt-skin', ` style="fill:${skin}"`));
  // Light from the upper left: a crescent of hatching on the right cheek and jaw.
  const shadow: Pt[] = [
    ...headArc(h, -1.0, 1.9, 20),
    ...arc(h.cx - h.rx * 0.05, h.cy + 1, h.rx * 0.78, h.ry * 0.95, 1.75, -0.95, 20),
  ];
  out.push(path(hatch(shadow, sp, 45), 'pt-hatch'));
  out.push(fill(pts, 'pt-line'));
  return out.join('');
}

function features(h: HeadGeom, sp: number): { svg: string; mouthY: number } {
  const { cx, cy, rx, ry } = h;
  const ey = cy - 1;
  const ex = rx * 0.4;
  const mouthY = cy + ry * 0.55;
  const eyes = [-1, 1]
    .map((s) => {
      const x = cx + s * ex;
      return `M${x - 3} ${ey}Q${x} ${ey - 2.2} ${x + 3} ${ey}Q${x} ${ey + 1.4} ${x - 3} ${ey}Z`;
    })
    .join('');
  const pupils = [-1, 1]
    .map((s) => `<circle cx="${cx + s * ex}" cy="${ey - 0.2}" r="0.95" class="pt-solid"/>`)
    .join('');
  const brows = [-1, 1]
    .map((s) => {
      const x = cx + s * ex;
      return `M${x - 3.4} ${ey - 3.6}Q${x} ${ey - 5.4} ${x + 3.4} ${ey - 3.8}`;
    })
    .join('');
  const nose = `M${cx - 0.6} ${ey + 1.5}L${cx - 2.2} ${cy + ry * 0.33}Q${cx} ${cy + ry * 0.4} ${cx + 2.4} ${cy + ry * 0.33}`;
  const noseShade: Pt[] = [
    [cx + 0.2, ey + 2],
    [cx + 2.4, cy + ry * 0.33],
    [cx + 0.4, cy + ry * 0.36],
  ];
  const mouth = `M${cx - 4.2} ${mouthY}Q${cx} ${mouthY + 1.8} ${cx + 4.2} ${mouthY}`;
  return {
    mouthY,
    svg:
      path(eyes, 'pt-line pt-fine') +
      pupils +
      path(brows, 'pt-line pt-brow') +
      path(hatch(noseShade, sp * 0.8, 45), 'pt-hatch') +
      path(nose, 'pt-line pt-fine') +
      path(mouth, 'pt-line pt-fine'),
  };
}

function hairShape(pts: readonly Pt[], angle: number, sp: number, stippled: boolean): string {
  const ys = pts.map((p) => p[1]);
  const xs = pts.map((p) => p[0]);
  const texture = stippled
    ? path(
        stipple(
          Math.min(...xs),
          Math.min(...ys),
          Math.max(...xs) - Math.min(...xs),
          Math.max(...ys) - Math.min(...ys),
          70,
          7,
        ),
        'pt-dots',
      )
    : path(hatch(pts, sp * 0.75, angle), 'pt-hatch');
  return fill(pts, 'pt-hair') + texture + fill(pts, 'pt-line pt-fine');
}

function glasses(kind: number, h: HeadGeom): string {
  if (kind === 0) return '';
  const ey = h.cy - 1;
  const ex = h.rx * 0.4;
  const lens = [-1, 1]
    .map((s) => {
      const x = h.cx + s * ex;
      return kind === 1
        ? `M${x + 4.3} ${ey}a4.3 4.3 0 1 0 -8.6 0a4.3 4.3 0 1 0 8.6 0Z`
        : `M${x - 4.6} ${ey - 3.2}h9.2v6.6h-9.2Z`;
    })
    .join('');
  const bridge = `M${h.cx - ex + 4.3} ${ey - 0.6}Q${h.cx} ${ey - 2.4} ${h.cx + ex - 4.3} ${ey - 0.6}`;
  const temples = `M${h.cx - ex - 4.4} ${ey - 0.8}L${h.cx - h.rx + 0.5} ${ey - 1.2}M${h.cx + ex + 4.4} ${ey - 0.8}L${h.cx + h.rx - 0.5} ${ey - 1.2}`;
  return path(lens + bridge + temples, 'pt-line pt-glass');
}

/**
 * Markup for one portrait. `coarse` draws a simpler plate for tiny sizes
 * (advisor bar, review cards): wider hatching and a plain double ring.
 */
export function portraitMarkup(spec: AvatarSpec, coarse = false): string {
  const a = clampSpec(spec);
  const key = `${a.head}.${a.hair}.${a.facial}.${a.glasses}.${a.attire}.${a.tone}.${a.shade}.${coarse ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const h = headGeom(a.head);
  const sp = (SHADE_SPACING[a.shade]! * (coarse ? COARSE : 1)) / FIGURE_SCALE;
  const skin = SKIN_TONES[a.tone]!;
  const hair = hairParts(a.hair, h);
  const face = features(h, sp);
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
  const { rx, ry, inner } = FRAME;
  const clip = `<clipPath id="__ID__"><ellipse cx="${CX}" cy="${CY}" rx="${rx - inner}" ry="${ry - inner}"/></clipPath>`;
  const ground = coarse
    ? ''
    : path(hatch(ellipsePts(CX, CY, rx - inner, ry - inner, 40), 2.4, 0), 'pt-ground');
  const beard = facialParts(a.facial, h, face.mouthY)
    .map((pts) => hairShape(pts, 75, sp, false))
    .join('');
  const lips =
    a.facial === 3
      ? `<ellipse cx="${h.cx}" cy="${face.mouthY + 0.5}" rx="4.6" ry="1.9" class="pt-skin" style="fill:${skin}"/>` +
        path(
          `M${h.cx - 4.2} ${face.mouthY}Q${h.cx} ${face.mouthY + 1.8} ${h.cx + 4.2} ${face.mouthY}`,
          'pt-line pt-fine',
        )
      : '';

  const svg = [
    `<defs>${clip}</defs>`,
    `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" class="pt-paper"/>`,
    `<g clip-path="url(#__ID__)">`,
    ground,
    `<g transform="${FIGURE}">`,
    hair.back.map((pts) => hairShape(pts, hair.angle, sp, false)).join(''),
    fill(neck, 'pt-skin', ` style="fill:${skin}"`),
    path(hatch(neckShade, sp * 0.8, 45), 'pt-hatch'),
    fill(neck, 'pt-line pt-fine'),
    attire(a.attire, h, sp),
    neckline(a.attire),
    head(h, skin, sp),
    face.svg,
    beard,
    lips,
    hair.front.map((pts) => hairShape(pts, hair.angle, sp, !!hair.stipple)).join(''),
    glasses(a.glasses, h),
    `</g></g>`,
    frame(coarse),
  ].join('');
  cache.set(key, svg);
  return svg;
}
