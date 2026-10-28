// Portrait face features (ART_DIRECTION §4): eyes with iris and lids, brows
// drawn as hair strokes, a nose with wings and nostrils, lips with a bow and a
// shaded lower lip, age lines, ears and glasses, all on the 100 × 125 plate in
// head space (before the figure scale). Returns SVG markup strings for
// src/art/portraits.ts. `fine` is false for the coarse plate at tiny sizes,
// which drops the details that would turn to mud below 44 px.
import { hatch, poly, type Pt } from './engrave';
import type { HeadGeom } from './portraitParts';

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const fill = (pts: readonly Pt[], cls: string, extra = '') => path(poly(pts), cls, extra);
const f1 = (n: number) => Math.round(n * 10) / 10;

/** Where the features sit on a head: eye line, eye spacing, nose tip and mouth. */
export interface FaceGeom {
  ey: number;
  ex: number;
  noseY: number;
  mouthY: number;
}

export function faceGeom(h: HeadGeom): FaceGeom {
  return {
    ey: h.cy - 1,
    ex: h.rx * 0.4,
    noseY: h.cy + h.ry * 0.33,
    mouthY: h.cy + h.ry * 0.55,
  };
}

/** Points along a quadratic curve. */
function quad(p0: Pt, c: Pt, p1: Pt, steps = 8): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [
      u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
      u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
    ] as Pt;
  });
}

/** Upper and lower lid control heights per eye shape: almond, round, hooded, upturned. */
const EYE_SHAPES = [
  { up: 2.4, lo: 1.5, iris: 1.6, lift: 0, fold: false },
  { up: 2.9, lo: 2.2, iris: 1.9, lift: 0, fold: false },
  { up: 2.0, lo: 1.3, iris: 1.5, lift: 0, fold: true },
  { up: 2.3, lo: 1.4, iris: 1.6, lift: 1.0, fold: false },
] as const;

/**
 * Both eyes: paper whites, an iris ring with a pupil and a catchlight, a
 * heavier upper lid with a lash flick, a faint lower lid and the socket
 * shadow under the brow on the shadow (right) side.
 */
export function eyes(
  h: HeadGeom,
  g: FaceGeom,
  kind: number,
  sp: number,
  fine: boolean,
  soft = false,
): string {
  const s = EYE_SHAPES[kind] ?? EYE_SHAPES[0];
  const out: string[] = [];
  for (const side of [-1, 1]) {
    const x = h.cx + side * g.ex;
    const inner: Pt = [x - side * 3, g.ey + s.lift * 0.3];
    const outer: Pt = [x + side * 3.1, g.ey - s.lift * 0.9];
    const upper = quad(inner, [x, g.ey - s.up - s.lift * 0.3], outer);
    const lower = quad(outer, [x, g.ey + s.lo], inner);
    const shape = [...upper, ...lower.slice(1, -1)];
    out.push(fill(shape, 'pt-white'));
    // Iris and pupil, clipped by the lids drawn over them.
    const iy = g.ey - 0.2 - s.lift * 0.2;
    out.push(`<circle cx="${f1(x)}" cy="${f1(iy)}" r="${s.iris}" class="pt-iris"/>`);
    out.push(`<circle cx="${f1(x)}" cy="${f1(iy)}" r="${f1(s.iris * 0.52)}" class="pt-solid"/>`);
    if (fine) {
      out.push(
        `<circle cx="${f1(x - 0.55)}" cy="${f1(iy - 0.55)}" r="0.38" class="pt-paper"/>`,
        path(poly(lower, false), 'pt-line pt-fine'),
        path(
          `M${f1(x - side * 2.4)} ${f1(g.ey + s.lo + 0.7)}Q${f1(x)} ${f1(g.ey + s.lo + 1.3)} ${f1(x + side * 2.6)} ${f1(g.ey + s.lo + 0.4 - s.lift * 0.5)}`,
          'pt-soft',
        ),
      );
    } else {
      out.push(fill(shape, 'pt-line pt-fine'));
    }
    out.push(path(poly(upper, false), 'pt-line pt-lid'));
    // Lash flick at the outer corner.
    out.push(
      path(
        `M${f1(outer[0])} ${f1(outer[1])}l${f1(side * 1.1)} ${f1(-0.6 - s.lift * 0.3)}`,
        'pt-line pt-lid',
      ),
    );
    if (soft) {
      // Soft features: a fan of lashes along the outer half of the upper lid.
      const lashes = [0.55, 0.75, 0.92]
        .map((t) => {
          const p = upper[Math.round(t * (upper.length - 1))]!;
          return `M${f1(p[0])} ${f1(p[1])}l${f1(side * (0.5 + t * 0.6))} ${f1(-0.9 - t * 0.3)}`;
        })
        .join('');
      out.push(path(lashes, fine ? 'pt-line pt-fine' : 'pt-line pt-lid'));
    }
    if (s.fold && fine) {
      out.push(
        path(
          `M${f1(x - side * 3.4)} ${f1(g.ey - 1.4)}Q${f1(x)} ${f1(g.ey - s.up - 1.4)} ${f1(x + side * 3.6)} ${f1(g.ey - 1.8)}`,
          'pt-soft',
        ),
      );
    }
    if (side === 1 && fine) {
      const socket: Pt[] = [
        [x - 3.2, g.ey - 3.2],
        [x + 3.6, g.ey - 3.6],
        [x + 3.6, g.ey - 2.2],
        [x - 3.2, g.ey - 1.6],
      ];
      out.push(path(hatch(socket, sp * 0.9, 45), 'pt-hatch'));
    }
  }
  return out.join('');
}

/** Brow outlines: soft arch, straight, bold. Each is a tapered strip of hair strokes. */
export function brows(
  h: HeadGeom,
  g: FaceGeom,
  kind: number,
  sp: number,
  fine: boolean,
  soft = false,
  tint = '',
): string {
  const out: string[] = [];
  for (const side of [-1, 1]) {
    const x = h.cx + side * g.ex;
    const inner: Pt = [x - side * 3.6, g.ey - 3.6];
    const outer: Pt = [x + side * 3.9, g.ey - 4.0];
    let top: Pt[];
    let thick: number;
    if (kind === 1) {
      top = quad(inner, [x, g.ey - 4.4], [outer[0], g.ey - 4.3]);
      thick = 1.0;
    } else if (kind === 2) {
      top = quad([inner[0], g.ey - 3.3], [x - side * 0.5, g.ey - 6.0], outer);
      thick = 1.7;
    } else {
      top = quad(inner, [x - side * 0.4, g.ey - 5.5], outer);
      thick = 1.0;
    }
    // The strip tapers toward the outer end; soft features draw it finer.
    const t = thick * (soft ? 0.7 : 1.15);
    const bottom = top.map(
      ([px, py], i) => [px, py + t * (1 - (i / (top.length - 1)) * 0.6)] as Pt,
    );
    const strip = [...top, ...bottom.reverse()];
    out.push(fill(strip, 'pt-hair', tint ? ` style="fill:${tint}"` : ''));
    if (fine) out.push(path(hatch(strip, Math.max(0.5, sp * 0.3), side * 70), 'pt-brow-hair'));
    out.push(path(poly(top, false), 'pt-line pt-brow'));
  }
  return out.join('');
}

/** Nose: bridge shadow, wings and nostrils, with the tip line on the lit side. */
export function nose(h: HeadGeom, g: FaceGeom, sp: number, fine: boolean): string {
  const { cx } = h;
  const { ey, noseY } = g;
  const shade: Pt[] = [
    [cx + 0.3, ey + 1.6],
    [cx + 2.0, noseY - 1.5],
    [cx + 2.8, noseY + 0.4],
    [cx + 0.6, noseY + 0.6],
  ];
  const bridge = `M${f1(cx + 0.5)} ${f1(ey + 1.4)}Q${f1(cx + 1.6)} ${f1(noseY - 2.6)} ${f1(cx + 2.4)} ${f1(noseY - 0.6)}`;
  const tip = `M${f1(cx - 2.7)} ${f1(noseY - 0.8)}Q${f1(cx - 3.4)} ${f1(noseY + 0.6)} ${f1(cx - 1.9)} ${f1(noseY + 1.1)}Q${f1(cx)} ${f1(noseY + 1.9)} ${f1(cx + 1.9)} ${f1(noseY + 1.1)}Q${f1(cx + 3.4)} ${f1(noseY + 0.6)} ${f1(cx + 2.7)} ${f1(noseY - 0.8)}`;
  const nostrils = `M${f1(cx - 1.9)} ${f1(noseY + 0.5)}q0.5 0.7 1.3 0.4M${f1(cx + 1.9)} ${f1(noseY + 0.5)}q-0.5 0.7 -1.3 0.4`;
  return (
    path(hatch(shade, sp * 0.8, 45), 'pt-hatch') +
    path(bridge, 'pt-line pt-fine') +
    path(tip, 'pt-line pt-fine') +
    (fine ? path(nostrils, 'pt-line pt-fine') : '')
  );
}

/** The lip line alone (drawn again over a full beard). */
export function lipLine(h: HeadGeom, g: FaceGeom, kind: number): string {
  const { cx } = h;
  const y = g.mouthY;
  if (kind === 1)
    return `M${f1(cx - 4)} ${f1(y + 0.3)}Q${f1(cx)} ${f1(y + 1)} ${f1(cx + 4)} ${f1(y + 0.3)}`;
  if (kind === 2)
    return `M${f1(cx - 5)} ${f1(y - 0.3)}Q${f1(cx)} ${f1(y + 0.9)} ${f1(cx + 5)} ${f1(y - 0.3)}`;
  return `M${f1(cx - 4.4)} ${f1(y)}Q${f1(cx)} ${f1(y + 2)} ${f1(cx + 4.4)} ${f1(y)}`;
}

/** Mouth: smile, composed or grin, each with a cupid's bow and a shaded lower lip. */
export function mouth(h: HeadGeom, g: FaceGeom, kind: number, sp: number, fine: boolean): string {
  const { cx } = h;
  const y = g.mouthY;
  const out: string[] = [];
  const w = kind === 2 ? 5 : kind === 1 ? 4 : 4.4;
  const top = kind === 1 ? y + 0.3 : kind === 2 ? y - 0.3 : y;
  const bow = `M${f1(cx - w)} ${f1(top)}Q${f1(cx - 2)} ${f1(top - 1.3)} ${f1(cx - 0.8)} ${f1(top - 0.8)}Q${f1(cx)} ${f1(top - 0.4)} ${f1(cx + 0.8)} ${f1(top - 0.8)}Q${f1(cx + 2)} ${f1(top - 1.3)} ${f1(cx + w)} ${f1(top)}`;
  if (kind === 2) {
    // Open grin: paper teeth under the upper lip, a dark gap below them.
    const upper = quad([cx - w, top], [cx, y + 0.9], [cx + w, top]);
    const lower = quad([cx + w, top], [cx, y + 3.6], [cx - w, top]);
    const inside = [...upper, ...lower.slice(1, -1)];
    out.push(fill(inside, 'pt-paper'));
    const gap = [
      ...quad([cx - w + 1.2, y + 1.2], [cx, y + 2.1], [cx + w - 1.2, y + 1.2]),
      ...lower.slice(2, -2),
    ];
    out.push(path(hatch(gap, sp * 0.6, 0), 'pt-hatch'));
    if (fine) {
      out.push(
        path(
          `M${f1(cx - 1.2)} ${f1(y + 0.5)}v1.4M${f1(cx + 1.2)} ${f1(y + 0.5)}v1.4M${f1(cx)} ${f1(y + 0.6)}v1.6`,
          'pt-soft',
        ),
      );
    }
    out.push(fill(inside, 'pt-line pt-fine'));
  } else {
    out.push(path(lipLine(h, g, kind), 'pt-line pt-fine'));
  }
  if (fine) out.push(path(bow, 'pt-soft'));
  // Lower lip: a crescent of shade under the lip line.
  const lipBottom = kind === 2 ? y + 3.6 : kind === 1 ? y + 2.4 : y + 3.2;
  const lipTop = kind === 2 ? y + 3.0 : kind === 1 ? y + 1.0 : y + 1.9;
  const lower = [
    ...quad([cx - w + 0.8, top + 0.2], [cx, lipTop], [cx + w - 0.8, top + 0.2]),
    ...quad([cx + w - 0.8, top + 0.2], [cx, lipBottom], [cx - w + 0.8, top + 0.2]).slice(1, -1),
  ];
  out.push(path(hatch(lower, sp * 0.75, 45), 'pt-hatch'));
  if (fine) {
    out.push(
      path(
        `M${f1(cx - w + 0.6)} ${f1(top + 0.3)}Q${f1(cx)} ${f1(lipBottom + 0.1)} ${f1(cx + w - 0.6)} ${f1(top + 0.3)}`,
        'pt-soft',
      ),
    );
    // Chin shadow under the lower lip.
    const chin: Pt[] = [
      [cx - 2.6, lipBottom + 0.9],
      [cx + 2.8, lipBottom + 0.9],
      [cx + 1.6, lipBottom + 2.4],
      [cx - 1.4, lipBottom + 2.4],
    ];
    out.push(path(hatch(chin, sp, 45), 'pt-hatch'));
    if (kind === 0) {
      out.push(
        path(
          `M${f1(cx - w - 0.3)} ${f1(top - 0.7)}l-0.4 1.5M${f1(cx + w + 0.3)} ${f1(top - 0.7)}l0.4 1.5`,
          'pt-soft',
        ),
      );
    }
  }
  return out.join('');
}

/** Age lines: none, a few (seasoned) or many (veteran), plus hollowed cheeks. */
export function ageLines(
  h: HeadGeom,
  g: FaceGeom,
  kind: number,
  sp: number,
  fine: boolean,
): string {
  if (kind === 0 || !fine) return '';
  const { cx, cy, ry } = h;
  const { ey, ex, noseY, mouthY } = g;
  const d: string[] = [];
  // Smile lines from the nose wings past the mouth corners.
  for (const s of [-1, 1]) {
    d.push(
      `M${f1(cx + s * 3)} ${f1(noseY + 1)}Q${f1(cx + s * 5.4)} ${f1(mouthY - 1.2)} ${f1(cx + s * 4.9)} ${f1(mouthY + 1.8)}`,
    );
    // Crow's feet at the outer corner of each eye.
    const ox = cx + s * (ex + 3.6);
    d.push(`M${f1(ox)} ${f1(ey - 0.3)}l${f1(s * 1.8)} -0.9`);
    if (kind === 2) {
      d.push(`M${f1(ox)} ${f1(ey + 0.4)}l${f1(s * 1.9)} 0.6`);
      // Pouches under the eyes.
      d.push(
        `M${f1(cx + s * (ex - 2.6))} ${f1(ey + 3)}Q${f1(cx + s * ex)} ${f1(ey + 4)} ${f1(cx + s * (ex + 2.8))} ${f1(ey + 2.8)}`,
      );
    }
  }
  // Forehead lines.
  const fy = cy - ry * 0.52;
  d.push(`M${f1(cx - 5)} ${f1(fy)}Q${f1(cx)} ${f1(fy - 1.2)} ${f1(cx + 5)} ${f1(fy)}`);
  if (kind === 2) {
    d.push(
      `M${f1(cx - 4.2)} ${f1(fy + 2.6)}Q${f1(cx)} ${f1(fy + 1.6)} ${f1(cx + 4.2)} ${f1(fy + 2.6)}`,
    );
    d.push(`M${f1(cx - 1.1)} ${f1(ey - 6)}v2.4M${f1(cx + 1.1)} ${f1(ey - 6)}v2.4`);
  }
  let out = path(d.join(''), 'pt-wrinkle');
  if (kind === 2) {
    // Hollow cheeks on both sides, denser on the shadow side.
    for (const s of [-1, 1]) {
      const hollow: Pt[] = [
        [cx + s * (h.rx - 1.5), cy + 4],
        [cx + s * (h.rx - 6), cy + 7],
        [cx + s * (h.rx - 7), cy + 11],
        [cx + s * (h.rx - 2.5), cy + 11],
      ];
      out += path(hatch(hollow, sp * (s > 0 ? 1.1 : 1.6), 45), 'pt-hatch');
    }
  }
  return out;
}
