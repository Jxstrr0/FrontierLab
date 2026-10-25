// Portrait parts (ART_DIRECTION §4): head shapes 4, hair 12, facial hair 4,
// glasses 3 and attire 4, as polygons and path data on the 100 × 125 portrait
// plate. src/art/portraits.ts assembles them into a banknote-style engraving.
import { ellipsePts, type Pt } from './engrave';

export interface HeadGeom {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Superellipse exponent: 2 is an ellipse, higher is squarer. */
  n: number;
  /** How much the jaw narrows toward the chin. */
  taper: number;
}

/** Head shapes: oval, round, square, narrow (CONTENT avatar parts). */
const HEADS: readonly Omit<HeadGeom, 'cx' | 'cy'>[] = [
  { rx: 15.5, ry: 20, n: 2, taper: 0.12 },
  { rx: 17.5, ry: 18.5, n: 2, taper: 0.05 },
  { rx: 16.5, ry: 19, n: 2.9, taper: 0.04 },
  { rx: 13.6, ry: 20.5, n: 2, taper: 0.14 },
];
export const HEAD_CX = 50;
export const HEAD_CY = 56;

export function headGeom(index: number): HeadGeom {
  return { cx: HEAD_CX, cy: HEAD_CY, ...(HEADS[index] ?? HEADS[0]!) };
}

/** A point on the head outline at angle t (0 = right, π/2 = chin). */
export function headPoint(h: HeadGeom, t: number, grow = 0): Pt {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const e = 2 / h.n;
  let x = (h.rx + grow) * Math.sign(c) * Math.abs(c) ** e;
  const y = (h.ry + grow) * Math.sign(s) * Math.abs(s) ** e;
  if (s > 0) x *= 1 - h.taper * s * s;
  return [h.cx + x, h.cy + y];
}

/** Points along the head outline from angle a0 to a1. */
export function headArc(h: HeadGeom, a0: number, a1: number, steps = 24, grow = 0): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) =>
    headPoint(h, a0 + ((a1 - a0) * i) / steps, grow),
  );
}

/** Points along an ellipse from angle a0 to a1 (optionally rippled). */
export function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  a0: number,
  a1: number,
  steps = 24,
  ripple = 0,
  waves = 0,
): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / steps;
    const d = ripple * Math.abs(Math.sin(waves * t));
    return [cx + (rx + d) * Math.cos(t), cy + (ry + d) * Math.sin(t)] as Pt;
  });
}

const PI = Math.PI;

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

export interface HairParts {
  /** Drawn behind the head and neck (long hair, afro, ponytail). */
  back: Pt[][];
  /** Drawn over the head. */
  front: Pt[][];
  /** Hatch angle for the hair's engraving. */
  angle: number;
  /** Close-cropped hair is stippled instead of hatched. */
  stipple?: boolean;
}

/** The 12 hair styles. */
export function hairParts(style: number, h: HeadGeom): HairParts {
  const { cx, cy, rx, ry } = h;
  const top = cy - ry;
  switch (style % 12) {
    case 0: // Short crop
      return { back: [], front: [cap(h, 1.6, 0.15)], angle: 60 };
    case 1: // Side part with a swoop
      return {
        back: [],
        front: [
          [
            ...arc(cx, cy - 1, rx + 2.6, ry + 2.6, PI - 0.15, 2 * PI + 0.15, 28),
            ...arc(cx + 4, cy - ry * 0.12, rx * 0.95, ry * 0.6, 2 * PI - 0.2, PI + 0.6),
            [cx - rx * 0.55, top + 6],
          ],
        ],
        angle: 25,
      };
    case 2: // Buzz cut
      return { back: [], front: [cap(h, 0.7, 0.1, 0, 0, 0.7)], angle: 60, stipple: true };
    case 3: // Bald crown, short at the sides
      return {
        back: [],
        front: [
          [
            [cx - rx - 1, cy - 7],
            [cx - rx + 3, cy - 11],
            [cx - rx + 3.5, cy + 1],
            [cx - rx + 0.5, cy + 3],
          ],
          [
            [cx + rx + 1, cy - 7],
            [cx + rx - 3, cy - 11],
            [cx + rx - 3.5, cy + 1],
            [cx + rx - 0.5, cy + 3],
          ],
        ],
        angle: 80,
      };
    case 4: // Curly top
      return { back: [], front: [cap(h, 3.2, 0.2, 1.6, 7)], angle: 35 };
    case 5: // Afro
      return {
        back: [arc(cx, cy - 6, rx + 11, ry + 8, 0, 2 * PI, 48, 1.4, 9)],
        front: [cap(h, 2, 0.3, 1, 9, 0.7)],
        angle: 35,
      };
    case 6: // Bob with a fringe
      return {
        back: [
          [
            ...arc(cx, cy - 1, rx + 4, ry + 3, PI - 1.0, 2 * PI + 1.0, 28),
            [cx + rx + 3, cy + ry * 0.62],
            [cx + rx - 3, cy + ry * 0.62],
            [cx - rx + 3, cy + ry * 0.62],
            [cx - rx - 3, cy + ry * 0.62],
          ],
        ],
        front: [
          [
            ...arc(cx, cy - 1, rx + 3, ry + 3, PI - 0.25, 2 * PI + 0.25, 28),
            [cx + rx * 0.9, cy - ry * 0.32],
            [cx - rx * 0.9, cy - ry * 0.32],
          ],
        ],
        angle: 85,
      };
    case 7: // Long, centre part
      return {
        back: [
          [
            ...arc(cx, cy - 1, rx + 4, ry + 3, PI - 0.1, 2 * PI + 0.1, 28),
            [cx + rx + 7, 100],
            [cx - rx - 7, 100],
          ],
        ],
        front: [
          [
            ...arc(cx, cy - 1, rx + 3, ry + 3, PI - 0.5, 2 * PI + 0.5, 28),
            [cx + rx * 0.8, cy - ry * 0.2],
            [cx + 1, top + 3],
            [cx - 1, top + 3],
            [cx - rx * 0.8, cy - ry * 0.2],
          ],
        ],
        angle: 80,
      };
    case 8: // Bun
      return {
        back: [ellipsePts(cx, top - 4, 7, 6, 24)],
        front: [cap(h, 1.4, 0.15, 0, 0, 0.66)],
        angle: 70,
      };
    case 9: // Pulled back with a ponytail
      return {
        back: [
          [
            [cx + rx - 2, cy - ry * 0.55],
            [cx + rx + 4, cy - ry * 0.25],
            [cx + rx + 5.5, cy + 6],
            [cx + rx + 3, cy + 19],
            [cx + rx + 0.5, cy + 8],
            [cx + rx - 1, cy - 4],
          ],
        ],
        front: [cap(h, 1.2, 0.1, 0, 0, 0.68)],
        angle: 70,
      };
    case 10: // Wavy, to the ears
      return { back: [], front: [cap(h, 3, 0.55, 1.4, 8, 0.6)], angle: 50 };
    default: // Locs
      return {
        back: [-1, 1].flatMap((side) =>
          [0, 1, 2, 3].map((k) => {
            const x = cx + side * (rx - 1 + k * 2.2);
            const end = 96 - (k % 2) * 6 - k * 2;
            return [
              [x - 1, cy - 10],
              [x + 1, cy - 10],
              [x + side * 2 + 0.8, end],
              [x + side * 2 - 0.8, end],
            ] as Pt[];
          }),
        ),
        front: [cap(h, 2.4, 0.4, 0.8, 10, 0.64)],
        angle: 88,
      };
  }
}

/** Moustache and beard regions for facial hair 1–3 (0 is none). */
export function facialParts(kind: number, h: HeadGeom, mouthY: number): Pt[][] {
  const { cx, cy, rx, ry } = h;
  const moustache: Pt[] = [
    [cx - 5.5, mouthY - 1],
    [cx - 2, mouthY - 3.6],
    [cx, mouthY - 3],
    [cx + 2, mouthY - 3.6],
    [cx + 5.5, mouthY - 1],
    [cx + 4.5, mouthY + 0.4],
    [cx, mouthY - 1.4],
    [cx - 4.5, mouthY + 0.4],
  ];
  if (kind === 1) return [moustache];
  if (kind === 2) {
    return [
      [
        ...headArc(h, 0.15, PI - 0.15),
        ...arc(cx, cy + ry * 0.04, rx * 0.74, ry * 0.7, PI - 0.2, 0.2),
      ],
    ];
  }
  if (kind === 3) {
    return [
      [
        ...headArc(h, -0.05, PI + 0.05, 24, 1.2),
        ...arc(cx, mouthY - 3, rx * 0.72, ry * 0.18, PI, 0),
      ],
      moustache,
    ];
  }
  return [];
}

/** Shoulders: the attire's outline. */
export const BODY: Pt[] = [
  [4, 125],
  [7, 109],
  [15, 100],
  [33, 93.5],
  [42, 91],
  [58, 91],
  [67, 93.5],
  [85, 100],
  [93, 109],
  [96, 125],
];
