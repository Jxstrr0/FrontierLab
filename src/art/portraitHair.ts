// Portrait hair (ART_DIRECTION §4): the 15 hair styles as polygons in head
// space on the 100 × 125 plate, in three layers. `back` sits behind the neck
// and shoulders, `mid` over the shoulders but behind the face (long locks,
// braids, a bob's sides) and `front` over the skull. src/art/portraits.ts
// tints and engraves them.
import { ellipsePts, type Pt } from './engrave';
import { arc, type HeadGeom } from './portraitParts';

const PI = Math.PI;

export interface HairParts {
  back: Pt[][];
  mid: Pt[][];
  front: Pt[][];
  /** Hatch angle for the hair's engraving. */
  angle: number;
  /** Close-cropped hair is stippled instead of hatched. */
  stipple?: boolean;
}

/** The forehead hairline from the right temple to the left (closing a cap). */
function hairline(h: HeadGeom, height = 0.62, shift = 0): Pt[] {
  return arc(h.cx + shift, h.cy - h.ry * 0.08, h.rx * 0.99, h.ry * height, 2 * PI - 0.2, PI + 0.2);
}

/** A cap of hair over the skull: outer edge over the top, closed along the hairline. */
function cap(h: HeadGeom, vol: number, drop: number, ripple = 0, waves = 0, height = 0.62): Pt[] {
  return [
    ...arc(h.cx, h.cy - 1, h.rx + vol, h.ry + vol, PI - drop, 2 * PI + drop, 28, ripple, waves),
    ...hairline(h, height),
  ];
}

/** A lock of hair from the temple down over the shoulder, on one side (-1 left, 1 right). */
function lock(h: HeadGeom, side: number, end: number, width: number, flare: number): Pt[] {
  const x = h.cx + side * (h.rx - 1);
  const y0 = h.cy - h.ry * 0.35;
  return [
    [x - side * 1.5, y0],
    [x + side * (width * 0.6), y0 - 2],
    [x + side * (width + flare * 0.5), h.cy + h.ry * 0.6],
    [x + side * (width + flare), end - 3],
    [x + side * (width * 0.5 + flare), end],
    [x + side * (flare * 0.6), end - 2],
    [x - side * 0.5, h.cy + h.ry * 0.5],
  ];
}

/** A braid falling over one shoulder: a chain of overlapping plaits. */
function braid(h: HeadGeom, side: number, count: number): Pt[][] {
  const x0 = h.cx + side * (h.rx - 0.5);
  const y0 = h.cy + h.ry * 0.25;
  return Array.from({ length: count }, (_, i) =>
    ellipsePts(x0 + side * (1.6 + i * 0.7), y0 + i * 3.6, 2.4 - i * 0.12, 2.3, 14),
  );
}

/** One loc: a rope that sways gently on its way down, thinning at the end. */
function rope(x: number, y0: number, end: number, side: number): Pt[] {
  const steps = 8;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (end - y0) * t;
    const cxl = x + side * t * 2.4 + Math.sin(t * 7) * 0.5;
    const w = 1.25 - t * 0.35;
    left.push([cxl - w, y]);
    right.push([cxl + w, y]);
  }
  return [...left, ...right.reverse()];
}

/** The 15 hair styles, in the order of HAIR_STYLE_NAMES (src/data/avatarParts.ts). */
export function hairParts(style: number, h: HeadGeom): HairParts {
  const { cx, cy, rx, ry } = h;
  const top = cy - ry;
  const none: Pt[][] = [];
  switch (style % 15) {
    case 0: // Short crop, with short sideburns
      return {
        back: none,
        mid: none,
        front: [
          cap(h, 1.8, 0.2),
          ...[-1, 1].map(
            (s) =>
              [
                [cx + s * (rx + 0.6), cy - 6],
                [cx + s * (rx - 2.2), cy - 6],
                [cx + s * (rx - 1.6), cy + 1.5],
                [cx + s * (rx + 0.2), cy + 1.5],
              ] as Pt[],
          ),
        ],
        angle: 60,
      };
    case 1: // Side part with a swoop
      return {
        back: none,
        mid: none,
        front: [
          [
            ...arc(cx, cy - 1, rx + 2.6, ry + 2.6, PI - 0.25, 2 * PI + 0.25, 28),
            ...arc(cx + 4, cy - ry * 0.12, rx * 0.95, ry * 0.6, 2 * PI - 0.2, PI + 0.6),
            [cx - rx * 0.55, top + 6],
          ],
        ],
        angle: 25,
      };
    case 2: // Buzz cut
      return {
        back: none,
        mid: none,
        front: [cap(h, 0.7, 0.1, 0, 0, 0.7)],
        angle: 60,
        stipple: true,
      };
    case 3: // Bald crown, short at the sides
      return {
        back: none,
        mid: none,
        front: [-1, 1].map((s) => [
          [cx + s * (rx + 1), cy - 7],
          [cx + s * (rx - 3), cy - 11],
          [cx + s * (rx - 3.5), cy + 1],
          [cx + s * (rx - 0.5), cy + 3],
        ]),
        angle: 80,
      };
    case 4: // Curly top
      return { back: none, mid: none, front: [cap(h, 3.4, 0.25, 1.7, 7)], angle: 35 };
    case 5: // Afro
      return {
        back: [arc(cx, cy - 5, rx + 11, ry + 8, 0, 2 * PI, 48, 1.4, 9)],
        mid: none,
        front: [cap(h, 2, 0.3, 1, 9, 0.7)],
        angle: 35,
      };
    case 6: // Bob with a fringe, to the jaw
      return {
        back: [
          [
            ...arc(cx, cy - 1, rx + 4.5, ry + 3.5, PI - 0.3, 2 * PI + 0.3, 28),
            [cx + rx + 4.5, cy + ry * 0.66],
            [cx + rx - 2, cy + ry * 0.7],
            [cx - rx + 2, cy + ry * 0.7],
            [cx - rx - 4.5, cy + ry * 0.66],
          ],
        ],
        mid: [-1, 1].map((s) => [
          [cx + s * (rx - 1.5), cy - ry * 0.4],
          [cx + s * (rx + 4.2), cy - ry * 0.2],
          [cx + s * (rx + 4.5), cy + ry * 0.66],
          [cx + s * (rx - 2.5), cy + ry * 0.7],
          [cx + s * (rx - 2.8), cy + ry * 0.1],
        ]),
        front: [
          [
            ...arc(cx, cy - 1, rx + 3.5, ry + 3.5, PI - 0.3, 2 * PI + 0.3, 28),
            [cx + rx * 0.9, cy - ry * 0.3],
            [cx + 2, cy - ry * 0.38],
            [cx - rx * 0.9, cy - ry * 0.3],
          ],
        ],
        angle: 85,
      };
    case 7: // Long, centre part, over the shoulders
      return {
        back: [
          [
            ...arc(cx, cy - 1, rx + 4.5, ry + 3.5, PI - 0.1, 2 * PI + 0.1, 28),
            [cx + rx + 8, 104],
            [cx - rx - 8, 104],
          ],
        ],
        mid: [-1, 1].map((s) => lock(h, s, 104, 5.5, 3)),
        front: [
          [
            ...arc(cx, cy - 1, rx + 3.2, ry + 3.2, PI - 0.5, 2 * PI + 0.5, 28),
            [cx + rx * 0.8, cy - ry * 0.2],
            [cx + 1, top + 3],
            [cx - 1, top + 3],
            [cx - rx * 0.8, cy - ry * 0.2],
          ],
        ],
        angle: 80,
      };
    case 8: // Bun on top
      return {
        back: [ellipsePts(cx, top - 4.5, 7.5, 6.5, 24)],
        mid: none,
        front: [cap(h, 1.6, 0.18, 0, 0, 0.66)],
        angle: 70,
      };
    case 9: // Pulled back with a ponytail
      return {
        back: [
          [
            [cx + rx - 2, cy - ry * 0.55],
            [cx + rx + 4.5, cy - ry * 0.25],
            [cx + rx + 6.5, cy + 6],
            [cx + rx + 4.5, cy + 22],
            [cx + rx + 1, cy + 9],
            [cx + rx - 1, cy - 4],
          ],
        ],
        mid: none,
        front: [cap(h, 1.4, 0.12, 0, 0, 0.68)],
        angle: 70,
      };
    case 10: // Wavy, to the jaw
      return {
        back: [
          [
            ...arc(cx, cy - 1, rx + 4, ry + 3.5, PI - 0.35, 2 * PI + 0.35, 28, 1.2, 8),
            [cx + rx + 3.5, cy + ry * 0.72],
            [cx + rx - 2, cy + ry * 0.76],
            [cx - rx + 2, cy + ry * 0.76],
            [cx - rx - 3.5, cy + ry * 0.72],
          ],
        ],
        mid: none,
        front: [cap(h, 3.2, 0.6, 1.4, 8, 0.6)],
        angle: 50,
      };
    case 11: // Locs: rope strands behind and over the shoulders
      return {
        back: [-1, 1].flatMap((side) =>
          [0, 1, 2].map((k) =>
            rope(cx + side * (rx + 0.5 + k * 3), cy - 10, 100 - (k % 2) * 6, side),
          ),
        ),
        mid: [-1, 1].flatMap((side) =>
          [0, 1].map((k) => rope(cx + side * (rx - 2.5 + k * 2.8), cy - 4, 106 - k * 5, side)),
        ),
        front: [cap(h, 2.6, 0.45, 0.8, 10, 0.64)],
        angle: 15,
      };
    case 12: // Quiff: short sides, volume swept up at the front
      return {
        back: none,
        mid: none,
        front: [
          [
            ...arc(cx, cy - 1, rx + 1.4, ry + 1.4, PI - 0.15, 1.25 * PI, 10),
            [cx - rx * 0.62, top - 1.5],
            [cx - rx * 0.35, top - 4.5],
            [cx, top - 6.2],
            [cx + rx * 0.4, top - 6.4],
            [cx + rx * 0.72, top - 5],
            [cx + rx * 0.82, top - 2.6],
            ...arc(cx, cy - 1, rx + 1.4, ry + 1.4, 1.72 * PI, 2 * PI + 0.15, 8),
            ...hairline(h, 0.66),
          ],
        ],
        angle: 30,
      };
    case 13: // Pixie: cropped, a side-swept fringe, short at the ears
      return {
        back: none,
        mid: none,
        front: [
          [
            ...arc(cx, cy - 1, rx + 2.2, ry + 2.2, PI - 0.4, 2 * PI + 0.35, 28),
            [cx + rx * 0.85, cy - ry * 0.32],
            [cx + rx * 0.2, cy - ry * 0.42],
            [cx - rx * 0.55, cy - ry * 0.18],
            [cx - rx * 0.85, cy - ry * 0.1],
          ],
        ],
        angle: 40,
      };
    default: // Braids: two plaits over the shoulders
      return {
        back: none,
        mid: [...braid(h, -1, 9), ...braid(h, 1, 9)],
        front: [cap(h, 1.3, 0.35, 0, 0, 0.64)],
        angle: 75,
      };
  }
}
