// Portrait parts (ART_DIRECTION §4): head shapes 4, facial hair 4 and the
// shoulders, as polygons on the 100 × 125 portrait plate (hair lives in
// portraitHair.ts). src/art/portraits.ts assembles them into a banknote-style
// engraving.
import type { Pt } from './engrave';

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

/** A soft face narrows toward a finer chin; a strong one keeps a squarer jaw. */
const SOFT_HEAD = { rx: 0.95, taper: 0.07 };
const STRONG_HEAD = { n: 0.25 };

export function headGeom(index: number, soft = false): HeadGeom {
  const base = HEADS[index] ?? HEADS[0]!;
  const shaped = soft
    ? { ...base, rx: base.rx * SOFT_HEAD.rx, taper: base.taper + SOFT_HEAD.taper }
    : { ...base, n: base.n + STRONG_HEAD.n };
  return { cx: HEAD_CX, cy: HEAD_CY, ...shaped };
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
        ...headArc(h, 0.4, PI - 0.4),
        ...arc(cx, cy + ry * 0.12, rx * 0.74, ry * 0.62, PI - 0.45, 0.45),
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
