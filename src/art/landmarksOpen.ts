// Open-ground landmarks (ART_DIRECTION §2): the stadium's oval bowl and the
// airport block with its runway strip, barrel-vault hangar, terminal and control
// tower. Local coordinates run 0..size across the 3×3 block.
import { STOREY_PX } from '../config/map';
import type { Engraver, Vec3 } from './engraver';
import { stipple } from './flora';
import { artRng } from './prng';
import { box, castShadow, cylinder, windowSlits } from './solids';

/** Visual tuning, in world px and tiles. */
const STADIUM = {
  outerR: 1.38,
  standsR: 1.1,
  fieldR: 0.78,
  wall: 15,
  fieldDrop: 8,
  spokes: [0, 16, 28],
  mast: 34,
} as const;
const AIRPORT = {
  runway: [2.05, 2.65],
  hangarWall: 11,
  hangarVault: 13,
  vaultSteps: 8,
  tower: 52,
  cab: 8,
  terminal: 13,
} as const;

export function stadium(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  const c = s / 2;
  castShadow(e, c - 1, c - 1, c + 1, c + 1, STADIUM.wall);
  // Floodlight masts on the back, left and right corners (a front one would
  // cross the bowl); none overlaps the bowl on screen, so they go first.
  const masts: [number, number][] = [
    [0.25, 0.25],
    [s - 0.25, 0.25],
    [0.25, s - 0.25],
  ];
  const mast = ([a, b]: [number, number]) => {
    e.segments(
      [
        [
          [a, b, 0],
          [a, b, STADIUM.mast],
        ],
      ],
      e.inks.outline,
    );
    e.poly(
      [
        [a - 0.08, b, STADIUM.mast],
        [a + 0.08, b, STADIUM.mast],
        [a + 0.08, b, STADIUM.mast + 4],
        [a - 0.08, b, STADIUM.mast + 4],
      ],
      'dense',
      e.inks.detail,
    );
  };
  masts.forEach(mast);
  cylinder(e, c, c, STADIUM.outerR, 0, STADIUM.wall, 'medium');
  // Stands: shaded ring with radial aisles, then the sunken field.
  e.flatCircle(c, c, STADIUM.wall, STADIUM.standsR, 'light', true);
  const spokes = STADIUM.spokes[e.lod]!;
  if (spokes > 0) {
    const segs: [Vec3, Vec3][] = [];
    for (let k = 0; k < spokes; k++) {
      const t = (k / spokes) * Math.PI * 2;
      const [ca, sb] = [Math.cos(t), Math.sin(t)];
      segs.push([
        [c + ca * STADIUM.standsR, c + sb * STADIUM.standsR, STADIUM.wall],
        [c + ca * STADIUM.outerR, c + sb * STADIUM.outerR, STADIUM.wall],
      ]);
    }
    e.segments(segs, e.inks.detail);
  }
  const zf = STADIUM.wall - STADIUM.fieldDrop;
  e.flatCircle(c, c, zf, STADIUM.fieldR, 'paper', true);
  stipple(e, [c - 0.5, c - 0.5, c + 0.5, c + 0.5], rng, 1.5);
  if (e.lod > 0) {
    // Pitch markings: touchlines, halfway line and centre circle.
    const w = 0.42;
    const l = 0.6;
    e.poly(
      [
        [c - l, c - w, zf],
        [c + l, c - w, zf],
        [c + l, c + w, zf],
        [c - l, c + w, zf],
      ],
      'none',
      e.inks.detail,
    );
    e.segments(
      [
        [
          [c, c - w, zf],
          [c, c + w, zf],
        ],
      ],
      e.inks.detail,
    );
    e.flatCircle(c, c, zf, 0.13, 'none', false);
    e.ctx.lineWidth = e.inks.detail;
    e.ctx.stroke();
  }
}

export function airport(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  const [r0, r1] = AIRPORT.runway;
  // Runway strip with threshold bars and a dashed centreline.
  e.poly(
    [
      [0.05, r0, 0],
      [s - 0.05, r0, 0],
      [s - 0.05, r1, 0],
      [0.05, r1, 0],
    ],
    'paper',
  );
  const rm = (r0 + r1) / 2;
  const dashes: [Vec3, Vec3][] = [];
  for (let a = 0.4; a < s - 0.4; a += 0.24)
    dashes.push([
      [a, rm, 0],
      [a + 0.12, rm, 0],
    ]);
  const bars: [Vec3, Vec3][] = [];
  for (let k = 1; k < 6; k++) {
    const b = r0 + ((r1 - r0) * k) / 6;
    bars.push([
      [0.1, b, 0],
      [0.28, b, 0],
    ]);
    bars.push([
      [s - 0.28, b, 0],
      [s - 0.1, b, 0],
    ]);
  }
  e.segments(dashes, e.inks.detail, 0.6);
  e.segments(bars, e.inks.detail * 1.5);
  if (e.lod > 0) plane(e, rng.range(0.8, 2.2), rm);
  hangar(e, 0.2, 0.2, 1.6, 1.5);
  // Control tower: shaft, glazed cab, roof and mast.
  const [ta, tb] = [2.5, 0.5];
  castShadow(e, ta - 0.12, tb - 0.12, ta + 0.12, tb + 0.12, AIRPORT.tower);
  cylinder(e, ta, tb, 0.1, 0, AIRPORT.tower, 'medium');
  cylinder(e, ta, tb, 0.22, AIRPORT.tower, AIRPORT.tower + AIRPORT.cab, 'dense');
  cylinder(e, ta, tb, 0.25, AIRPORT.tower + AIRPORT.cab, AIRPORT.tower + AIRPORT.cab + 2, 'paper');
  const top = AIRPORT.tower + AIRPORT.cab + 2;
  e.segments(
    [
      [
        [ta, tb, top],
        [ta, tb, top + 10],
      ],
    ],
    e.inks.detail,
  );
  // Terminal.
  const t: [number, number, number, number] = [1.85, 1.0, 2.85, 1.75];
  castShadow(e, ...t, AIRPORT.terminal);
  box(e, ...t, 0, AIRPORT.terminal, { left: 'paper', right: 'light' });
  if (e.lod > 0) windowSlits(e, 'left', t, 2, AIRPORT.terminal - 2, 8, STOREY_PX, 0.7);
}

/** A barrel-vault hangar: walls, a curved roof in strips and an arched end. */
function hangar(e: Engraver, a0: number, b0: number, a1: number, b1: number): void {
  const wall = AIRPORT.hangarWall;
  const steps = AIRPORT.vaultSteps;
  castShadow(e, a0, b0, a1, b1, wall + AIRPORT.hangarVault);
  box(e, a0, b0, a1, b1, 0, wall, { top: 'none' });
  // Arch profile across b.
  const prof: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI;
    prof.push([
      (b0 + b1) / 2 - (Math.cos(t) * (b1 - b0)) / 2,
      wall + Math.sin(t) * AIRPORT.hangarVault,
    ]);
  }
  for (let k = 0; k < steps; k++) {
    const [ba, za] = prof[k]!;
    const [bb, zb] = prof[k + 1]!;
    e.poly(
      [
        [a0, ba, za],
        [a1, ba, za],
        [a1, bb, zb],
        [a0, bb, zb],
      ],
      k < steps / 2 ? 'paper' : 'light',
      e.inks.detail,
    );
  }
  // Arched end wall with the big door.
  const end: Vec3[] = [[a1, b1, 0], [a1, b0, 0], ...prof.map(([b, z]): Vec3 => [a1, b, z])];
  e.poly(end, 'medium');
  const d0 = b0 + (b1 - b0) * 0.2;
  const d1 = b1 - (b1 - b0) * 0.2;
  e.poly(
    [
      [a1, d1, 0],
      [a1, d0, 0],
      [a1, d0, wall * 0.9],
      [a1, d1, wall * 0.9],
    ],
    'dense',
    e.inks.detail,
  );
}

/** A small parked plane lying on the runway: fuselage, wings and tail. */
function plane(e: Engraver, a: number, b: number): void {
  const z = 1.5;
  e.segments(
    [
      [
        [a - 0.28, b, z],
        [a + 0.28, b, z],
      ],
      [
        [a + 0.02, b - 0.26, z],
        [a + 0.02, b + 0.26, z],
      ],
      [
        [a - 0.25, b - 0.1, z],
        [a - 0.25, b + 0.1, z],
      ],
    ],
    e.inks.outline * 1.6,
  );
}
