// Signature skyscrapers (ART_DIRECTION §2.1): the stepped art-deco tower with
// its sunburst crown and needle spire, the black tower of bundled tubes with
// two rooftop masts, three slab towers joined by a deck on top, and the
// angular tower braced with stacked triangles. Local coords run 0..s across
// the block; heights in world px.
import type { Engraver, Vec3 } from './engraver';
import { bands, onFace, ribs, type Face } from './faceMarks';
import { tree } from './flora';
import { artRng } from './prng';
import type { Rect } from './roofs';
import { frustum, mast } from './signatureKit';
import { box, castShadow } from './solids';

/** A stone tier with piers and a cornice band. */
function tier(e: Engraver, r: Rect, z0: number, z1: number, piers: number): void {
  box(e, r[0], r[1], r[2], r[3], z0, z1, { left: 'light', right: 'medium', top: 'roof' });
  ribs(e, 'left', r, z0, z1, piers);
  ribs(e, 'right', r, z0, z1, piers);
  if (e.lod > 0) {
    bands(e, 'left', r, [z1 - 2], e.inks.outline);
    bands(e, 'right', r, [z1 - 2], e.inks.outline);
  }
}

export function decoSpire(e: Engraver, s: number): void {
  const c = s / 2;
  castShadow(e, 0.45, 0.45, 2.55, 2.55, 220);
  const piers = [4, 7, 9][e.lod]!;
  const tiers: [number, number, number][] = [
    [1.05, 0, 72],
    [0.82, 72, 128],
    [0.62, 128, 166],
    [0.44, 166, 186],
  ];
  for (const [h, z0, z1] of tiers) tier(e, [c - h, c - h, c + h, c + h], z0, z1, piers);
  // Crown: three stacked sunburst arches on each face, shrinking upward.
  const arches: [number, number, number][] = [
    [0.36, 186, 200],
    [0.27, 200, 212],
    [0.18, 212, 222],
  ];
  for (const [h, z0, z1] of arches) {
    const r: Rect = [c - h, c - h, c + h, c + h];
    box(e, ...r, z0, z1, { left: 'paper', right: 'light', top: 'roof' });
    for (const face of ['left', 'right'] as const) archFace(e, face, r, z0, z1);
  }
  frustum(e, c, c, 222, 246, 0.06, 0.012, 'light', null);
  mast(e, c, c, 246, 254, 0);
}

/** A pointed arch with sunburst rays on a crown face. */
function archFace(e: Engraver, face: Face, r: Rect, z0: number, z1: number): void {
  const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
  const pts: Vec3[] = [p(0.08, z0 + 1)];
  for (let k = 0; k <= 6; k++) {
    const t = (k / 6) * Math.PI;
    pts.push(p(0.5 - Math.cos(t) * 0.42, z0 + 1 + (z1 - z0 - 2) * Math.sin(t) ** 0.6));
  }
  pts.push(p(0.92, z0 + 1));
  e.poly(pts, face === 'left' ? 'paper' : 'light', e.inks.detail);
  if (e.lod === 0) return;
  const rays: [Vec3, Vec3][] = [0.25, 0.4, 0.5, 0.6, 0.75].map((u) => [
    p(0.5, z0 + 1),
    p(u, z1 - 2),
  ]);
  e.segments(rays, e.inks.detail * 0.8, 0.8);
}

export function twinAntenna(e: Engraver, _s: number): void {
  castShadow(e, 0.55, 0.55, 2.45, 2.45, 240);
  // Bundled tubes stopping at different heights, in dark hatched glass.
  const parts: [Rect, number, number][] = [
    [[0.55, 0.55, 2.45, 2.45], 0, 112],
    [[0.55, 0.55, 2.45, 1.82], 112, 166],
    [[1.18, 0.55, 2.45, 1.82], 166, 204],
  ];
  for (const [r, z0, z1] of parts) {
    box(e, r[0], r[1], r[2], r[3], z0, z1, { left: 'dense', right: 'dense', top: 'medium' });
    paperRibs(e, 'left', r, z0, z1, [3, 6, 9][e.lod]!);
    paperRibs(e, 'right', r, z0, z1, [3, 6, 9][e.lod]!);
    if (e.lod > 0) {
      bands(e, 'left', r, [z1 - 3], e.inks.outline * 1.4);
      bands(e, 'right', r, [z1 - 3], e.inks.outline * 1.4);
    }
  }
  // The two white masts.
  for (const [a, b, top] of [
    [1.5, 0.95, 256],
    [2.15, 1.5, 248],
  ] as const) {
    frustum(e, a, b, 204, top - 14, 0.1, 0.045, 'paper', null);
    if (e.lod > 0) bandsAt(e, a, b, [216, 228, 240]);
    mast(e, a, b, top - 14, top, 0);
  }
}

/** Small dark rings round a mast. */
function bandsAt(e: Engraver, a: number, b: number, zs: number[]): void {
  e.segments(
    zs.map((z): [Vec3, Vec3] => [
      [a - 0.06, b + 0.06, z],
      [a + 0.06, b - 0.06, z],
    ]),
    e.inks.outline * 1.4,
  );
}

/** Light vertical mullions on a dark face. */
function paperRibs(e: Engraver, face: Face, r: Rect, z0: number, z1: number, n: number): void {
  const c = e.ctx;
  c.beginPath();
  for (let k = 1; k < n; k++) {
    const u = k / n;
    const p = onFace(face, r[0], r[1], r[2], r[3], u, z0);
    const q = onFace(face, r[0], r[1], r[2], r[3], u, z1);
    e.m(p[0], p[1], p[2]);
    e.l(q[0], q[1], q[2]);
  }
  c.lineWidth = e.inks.detail * 1.6;
  c.strokeStyle = e.inks.paper;
  c.stroke();
}

export function skyDeck(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  const top = 186;
  castShadow(e, 0.3, 1.05, 2.7, 1.95, top + 12);
  for (const a of [0.55, 1.5, 2.45]) {
    const r: Rect = [a - 0.24, 1.08, a + 0.24, 1.92];
    box(e, ...r, 0, top, { left: 'paper', right: 'light', top: 'none' });
    ribs(e, 'left', r, 0, top, 3);
    if (e.lod > 0) {
      const zs: number[] = [];
      for (let z = 12; z < top; z += e.lod > 1 ? 9 : 18) zs.push(z);
      bands(e, 'left', r, zs, e.inks.detail * 0.6);
      bands(e, 'right', r, zs, e.inks.detail * 0.6);
    }
  }
  // The deck: a long boat-shaped slab, cantilevered past the last tower.
  const z0 = top;
  const z1 = top + 12;
  const hull: [number, number][] = [
    [0.02, 1.5],
    [0.3, 1.1],
    [2.7, 1.1],
    [3.1, 1.5],
    [2.7, 1.9],
    [0.3, 1.9],
  ];
  e.poly(
    [
      [0.3, 1.9, z0],
      [2.7, 1.9, z0],
      [3.1, 1.5, z0],
      [3.1, 1.5, z1],
      [2.7, 1.9, z1],
      [0.3, 1.9, z1],
      [0.02, 1.5, z1],
      [0.02, 1.5, z0],
    ],
    'dense',
  );
  e.poly(
    hull.map(([a, b]): Vec3 => [a, b, z1]),
    'roof',
  );
  if (e.lod === 0) return;
  for (let k = 0; k < (e.lod > 1 ? 6 : 3); k++) {
    e.ctx.save();
    e.ctx.translate(0, -z1);
    tree(e, 0.6 + k * (2 / (e.lod > 1 ? 6 : 3)), rng.range(1.35, 1.65), 0.4, rng);
    e.ctx.restore();
  }
}

export function prismTower(e: Engraver, _s: number): void {
  const r: Rect = [0.95, 0.95, 2.05, 2.05];
  const [a0, b0, a1, b1] = r;
  castShadow(e, ...r, 225);
  // Three braced sections, then a sloped prism top and a smaller one above.
  const sections = [0, 56, 112, 160];
  for (let k = 0; k < sections.length - 1; k++) {
    const z0 = sections[k]!;
    const z1 = sections[k + 1]!;
    box(e, ...r, z0, z1, { left: 'paper', right: 'light', top: 'none' });
    braces(e, r, z0, z1);
  }
  const hi = 200;
  e.poly(
    [
      [a0, b1, 160],
      [a1, b1, 160],
      [a1, b1, 176],
      [a0, b1, hi],
    ],
    'paper',
  );
  e.poly(
    [
      [a1, b1, 160],
      [a1, b0, 160],
      [a1, b0, hi],
      [a1, b1, 176],
    ],
    'light',
  );
  e.poly(
    [
      [a0, b0, hi],
      [a1, b0, hi],
      [a1, b1, 176],
      [a0, b1, hi],
    ],
    'roofLight',
  );
  if (e.lod > 0) {
    e.segments(
      [
        [
          [a0, b1, 160],
          [a1, b1, 176],
        ],
        [
          [a1, b0, 160],
          [a1, b1, 176],
        ],
      ],
      e.inks.outline * 0.9,
    );
  }
  // The upper prism on the back half.
  const u: Rect = [a0 + 0.15, b0 + 0.1, a1 - 0.25, b0 + 0.55];
  box(e, ...u, hi - 6, hi + 14, { left: 'paper', right: 'light', top: 'none' });
  e.poly(
    [
      [u[0], u[1], hi + 26],
      [u[2], u[1], hi + 26],
      [u[2], u[3], hi + 14],
      [u[0], u[3], hi + 14],
    ],
    'roofLight',
  );
  e.poly(
    [
      [u[2], u[3], hi + 14],
      [u[2], u[1], hi + 26],
      [u[2], u[1], hi + 14],
    ],
    'light',
  );
  mast(e, u[0] + 0.1, u[1] + 0.1, hi + 24, 250, 0);
  mast(e, u[2] - 0.1, u[1] + 0.1, hi + 24, 244, 0);
}

/** X braces across both visible faces of a section: the stacked triangles. */
function braces(e: Engraver, r: Rect, z0: number, z1: number): void {
  const segs: [Vec3, Vec3][] = [];
  for (const face of ['left', 'right'] as const) {
    const p = (u: number, z: number) => onFace(face, r[0], r[1], r[2], r[3], u, z);
    segs.push([p(0, z0), p(1, z1)], [p(1, z0), p(0, z1)], [p(0, z1), p(1, z1)]);
  }
  e.segments(segs, e.inks.outline * 1.1);
  if (e.lod === 0) return;
  ribs(e, 'left', r, z0, z1, 4);
  ribs(e, 'right', r, z0, z1, 4);
}
