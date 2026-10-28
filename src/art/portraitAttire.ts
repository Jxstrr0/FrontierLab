// Portrait attire (ART_DIRECTION §4): suit, blouse, sweater, turtleneck,
// hoodie and blazer with a tee, hatched over the shoulders of the 100 × 125
// portrait plate in the outfit colour, plus the neckline drawn over the neck.
// Coordinates are drawn `lift` units low; src/art/portraits.ts raises the whole
// group so the neck stays short. Light falls from the upper left, so the right
// shoulder carries an extra layer of shade. Returns SVG markup; `fine` is false
// on the coarse plate at tiny sizes.
import { hatch, poly, type Pt } from './engrave';
import { BODY, type HeadGeom } from './portraitParts';

const path = (d: string, cls: string, extra = '') =>
  d ? `<path d="${d}" class="${cls}"${extra}/>` : '';
const fill = (pts: readonly Pt[], cls: string, extra = '') => path(poly(pts), cls, extra);
const tinted = (pts: readonly Pt[], cloth: string) =>
  fill(pts, 'pt-cloth', ` style="fill:${cloth}"`);

/** The shadow side of the shoulders (right of the neck). */
const SHOULDER_SHADE: Pt[] = [
  [60, 92],
  [67, 93.5],
  [85, 100],
  [93, 109],
  [96, 125],
  [66, 125],
];
/** Seams where the sleeves meet the body. */
const SEAMS = 'M15 100Q13 112 12 125M85 100Q87 112 88 125';

/** Lapels and an open front, shared by the suit and the blazer. */
function jacket(sp: number, fine: boolean, under: string): string {
  const parts: string[] = [];
  const front: Pt[] = [
    [41, 90.5],
    [59, 90.5],
    [50, 114],
  ];
  parts.push(fill(front, 'pt-paper'), under, fill(front, 'pt-line pt-fine'));
  const lapelR: Pt[] = [
    [59, 90.5],
    [63, 106],
    [50, 118],
    [51.6, 97.4],
  ];
  parts.push(path(hatch(lapelR, sp * 0.55, 62), 'pt-hatch'));
  parts.push(path('M41 90.5L37 106L50 118M59 90.5L63 106L50 118', 'pt-line pt-fine'));
  if (fine) {
    parts.push(path('M37 106l-1.6 3.4M63 106l1.6 3.4', 'pt-soft'));
    parts.push(`<circle cx="51.2" cy="121" r="0.9" class="pt-line pt-fine"/>`);
    parts.push(path(SEAMS, 'pt-soft'));
  }
  return parts.join('');
}

function suit(sp: number, fine: boolean): string {
  const knot: Pt[] = [
    [48, 94.2],
    [52, 94.2],
    [52.4, 97.4],
    [47.6, 97.4],
  ];
  const tie: Pt[] = [
    [48.2, 97.4],
    [51.8, 97.4],
    [53.2, 110],
    [50, 114.5],
    [46.8, 110],
  ];
  const under = [
    fill(tie, 'pt-tie'),
    path(hatch(tie, sp * 0.7, -45), 'pt-hatch'),
    fine ? path(hatch(tie, sp * 1.4, 45), 'pt-hatch') : '',
    fill(tie, 'pt-line pt-fine'),
    fill(knot, 'pt-tie'),
    path(hatch(knot, sp * 0.5, 45), 'pt-hatch'),
    fill(knot, 'pt-line pt-fine'),
    path('M44 91l4.4 4M56 91l-4.4 4', 'pt-line pt-fine'),
  ].join('');
  let out = jacket(sp, fine, under);
  if (fine) {
    const square: Pt[] = [
      [23.5, 105.5],
      [31, 104],
      [30.4, 107.2],
      [24.4, 108.4],
    ];
    out += fill(square, 'pt-paper') + fill(square, 'pt-line pt-fine');
    out += path('M23 108.6l8-1.8M24.4 105.3l1.4-2.2l1.6 1.8l1.6-2.4l1.4 1.8', 'pt-soft');
  }
  return out;
}

export function attire(
  kind: number,
  h: HeadGeom,
  sp: number,
  fine: boolean,
  cloth: string,
  lift: number,
): string {
  const body = BODY;
  const neckTop = h.cy + h.ry - 6 + lift;
  const parts: string[] = [tinted(body, cloth)];
  if (kind === 3) {
    // Turtleneck: dark knit body and a folded collar up to the chin.
    parts.push(path(hatch(body, sp * 0.9, 90), 'pt-hatch'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.1, -45), 'pt-hatch'));
    const tube: Pt[] = [
      [h.cx - 8.5, neckTop + 3],
      [h.cx + 8.5, neckTop + 3],
      [h.cx + 10.5, 96],
      [h.cx - 10.5, 96],
    ];
    // The collar casts a band of shade on the chest beneath it.
    const under: Pt[] = [
      [h.cx - 11, 95],
      [h.cx + 11, 95],
      [h.cx + 12, 99.5],
      [h.cx - 12, 99.5],
    ];
    parts.push(path(hatch(under, sp * 0.6, 90), 'pt-hatch'));
    parts.push(tinted(tube, cloth), path(hatch(tube, sp * 0.7, 90), 'pt-hatch'));
    if (fine) {
      parts.push(
        path(`M${h.cx - 9.2} ${neckTop + 7}h18.4M${h.cx - 9.6} ${neckTop + 8.6}h19.2`, 'pt-soft'),
      );
      parts.push(path(SEAMS, 'pt-soft'));
    }
    parts.push(fill(tube, 'pt-line'));
    parts.push(fill(body, 'pt-line'));
    return parts.join('');
  }
  if (kind === 0) {
    // Suit: dense jacket, lapels, white shirt, a tie with a knot, buttons and a pocket square.
    parts.push(path(hatch(body, sp * 0.85, 62), 'pt-hatch'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.0, -45), 'pt-hatch'));
    parts.push(suit(sp, fine));
  } else if (kind === 1) {
    // Blouse: light fabric, a scooped neckline, soft shoulder folds and a pendant.
    parts.push(path(hatch(body, sp * 1.7, 70), 'pt-hatch'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.9, -45), 'pt-hatch'));
    parts.push(path('M30 125c2-12 4-20 7-28M70 125c-2-12-4-20-7-28', 'pt-line pt-fine'));
    if (fine) {
      parts.push(
        path('M20 104q-3 10 -4 21M80 104q3 10 4 21M36 101q1 10 0 24M64 101q-1 10 0 24', 'pt-soft'),
      );
      parts.push(path('M43 95q7 12 14 0', 'pt-line pt-fine'));
      parts.push(`<circle cx="50" cy="104.2" r="1.3" class="pt-line pt-fine"/>`);
      parts.push(`<circle cx="50" cy="104.2" r="0.45" class="pt-solid"/>`);
    }
  } else if (kind === 4) {
    // Hoodie: soft knit, the hood folded behind the neck, drawstrings and a centre seam.
    parts.push(path(hatch(body, sp * 1.3, 80), 'pt-hatch'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.3, -45), 'pt-hatch'));
    const hood: Pt[] = [
      [36, 92],
      [38, 88],
      [44, 86.5],
      [56, 86.5],
      [62, 88],
      [64, 92],
      [59, 96],
      [50, 97.5],
      [41, 96],
    ];
    parts.push(tinted(hood, cloth), path(hatch(hood, sp * 0.8, 20), 'pt-hatch'));
    parts.push(fill(hood, 'pt-line pt-fine'));
    parts.push(path('M46.5 96.5l-1 13M53.5 96.5l1 13', 'pt-line pt-fine'));
    parts.push(
      `<rect x="44.6" y="109.4" width="1.8" height="2.6" rx="0.6" class="pt-paper pt-line pt-fine"/>` +
        `<rect x="53.6" y="109.4" width="1.8" height="2.6" rx="0.6" class="pt-paper pt-line pt-fine"/>`,
    );
    if (fine) parts.push(path(SEAMS, 'pt-soft'), path('M50 98v27', 'pt-soft'));
  } else if (kind === 5) {
    // Blazer over a plain crew-neck tee.
    parts.push(path(hatch(body, sp * 1.0, 62), 'pt-hatch'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.1, -45), 'pt-hatch'));
    const tee = path('M43.5 91.5q6.5 6 13 0', 'pt-line pt-fine');
    parts.push(jacket(sp, fine, tee));
  } else {
    // Sweater: ribbed knit with a cross-knit texture, a crew band and a shirt collar underneath.
    parts.push(path(hatch(body, sp * 1.15, 90), 'pt-hatch'));
    if (fine) parts.push(path(hatch(body, sp * 2.6, 0), 'pt-strand'));
    parts.push(path(hatch(SHOULDER_SHADE, sp * 1.2, -45), 'pt-hatch'));
    parts.push(path('M4 119h92M5 122h90', 'pt-line pt-fine'));
    if (fine) parts.push(path(SEAMS, 'pt-soft'));
  }
  parts.push(fill(body, 'pt-line'));
  return parts.join('');
}

/** The neckline sits over the neck for the blouse and sweater. */
export function neckline(kind: number, fine: boolean): string {
  if (kind === 1) {
    return (
      path('M41 91c2 8 16 8 18 0', 'pt-line') +
      path('M41 91c-4 3-5 6-3 8l7-3M59 91c4 3 5 6 3 8l-7-3', 'pt-line pt-fine')
    );
  }
  if (kind === 2) {
    const collar = fine ? path('M43.5 91.5l3.5 5.5l3-3l3 3l3.5-5.5', 'pt-line pt-fine') : '';
    return path('M41 90.5c3 6 15 6 18 0M39.5 92c4 8 17 8 21 0', 'pt-line pt-fine') + collar;
  }
  return '';
}
