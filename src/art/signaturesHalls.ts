// Signature landmarks that are great buildings (ART_DIRECTION §2.1): the
// turreted château hotel with its copper roof, the domed basilica on its
// terraced hill, the old town hall row of stepped gables, the long station
// hall with twin clock towers and the minster with two spires. Local coords
// run 0..s across the block; heights in world px. Drawn back to front.
import type { Engraver, Vec3 } from './engraver';
import { arcade, timberFrame } from './facades';
import { bands, ribs, windowSlits } from './faceMarks';
import { stipple } from './flora';
import { artRng } from './prng';
import { gableEnd } from './gables';
import { gableRoof, hipRoof, walls, type Rect } from './roofs';
import { cone, plaza } from './signatureKit';
import { box, castShadow, cylinder, dome } from './solids';

/** A round turret with a pointed cone roof. */
function turret(e: Engraver, a: number, b: number, r: number, h: number, roof: number): void {
  cylinder(e, a, b, r, 0, h, 'light');
  if (e.lod > 0) bandsRound(e, a, b, r, [h - 6]);
  cone(e, a, b, h, r * 1.15, roof, 'roofMedium');
}

function bandsRound(e: Engraver, a: number, b: number, r: number, zs: number[]): void {
  const c = e.ctx;
  const rx = r * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
  c.beginPath();
  for (const z of zs) {
    const p = e.pt(a, b, z);
    c.moveTo(p.x + rx, p.y);
    c.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI, false);
  }
  c.lineWidth = e.inks.detail;
  c.strokeStyle = e.inks.ink;
  c.stroke();
}

export function chateauHotel(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  const r: Rect = [0.5, 0.7, 2.5, 2.05];
  const wall = 46;
  castShadow(e, ...r, wall + 34);
  stipple(e, [0.2, 2.2, 2.8, 2.85], rng, 1.5);
  walls(e, r, wall);
  if (e.lod > 0) {
    windowSlits(e, 'left', r, 6, wall - 2, 9, 9, 0.6);
    windowSlits(e, 'right', r, 6, wall - 2, 6, 9, 0.6);
  }
  bands(e, 'left', r, [wall - 1.5], e.inks.outline);
  hipRoof(e, r, wall, 36, true);
  // Dormers along the copper roof.
  if (e.lod > 0) {
    for (let k = 0; k < 5; k++) {
      const a = 0.85 + k * 0.32;
      if (a > 1.2 && a < 1.8) continue;
      box(e, a - 0.06, 1.85, a + 0.06, 1.95, wall + 4, wall + 12, { left: 'paper', top: 'none' });
      cone(e, a, 1.9, wall + 12, 0.08, 6, 'roofMedium');
    }
  }
  turret(e, 2.5, 0.7, 0.17, wall + 8, 28);
  // The central pavilion with its tall pyramid roof.
  const p: Rect = [1.22, 1.45, 1.78, 2.15];
  box(e, ...p, 0, wall + 12, { top: 'none' });
  if (e.lod > 0) windowSlits(e, 'left', p, 6, wall + 8, 3, 9, 0.6);
  const apex: Vec3 = [1.5, 1.8, wall + 12 + 36];
  e.poly([[p[0], p[3], wall + 12], [p[2], p[3], wall + 12], apex], 'roofLight');
  e.poly([[p[2], p[3], wall + 12], [p[2], p[1], wall + 12], apex], 'roofMedium');
  e.segments([[apex, [1.5, 1.8, wall + 58]]], e.inks.outline);
  turret(e, 0.5, 2.05, 0.18, wall + 8, 30);
  turret(e, 2.5, 2.05, 0.18, wall + 8, 30);
}

export function domedBasilica(e: Engraver, s: number): void {
  // The terraced hill with a stair up the middle.
  box(e, 0.12, 0.12, s - 0.12, s - 0.12, 0, 7, { left: 'medium', right: 'dense', top: 'paper' });
  box(e, 0.4, 0.4, s - 0.4, s - 0.4, 7, 13, { left: 'medium', right: 'dense', top: 'paper' });
  if (e.lod > 0) {
    const stairs: [Vec3, Vec3][] = [];
    for (let z = 1; z < 13; z += 2) {
      const b = z < 7 ? s - 0.12 : s - 0.4;
      stairs.push([
        [1.3, b + 0.01, z],
        [1.7, b + 0.01, z],
      ]);
    }
    e.segments(stairs, e.inks.detail);
  }
  const nave: Rect = [0.75, 0.85, 2.25, 2.15];
  const z0 = 13;
  const zw = z0 + 30;
  castShadow(e, ...nave, 120);
  box(e, ...nave, z0, zw, { top: 'roof' });
  ribs(e, 'right', nave, z0, zw, 5);
  // Drum, dome, lantern and cross.
  const [da, db] = [1.5, 1.4];
  cylinder(e, da, db, 0.44, zw, zw + 22, 'light');
  if (e.lod > 0) ribsRound(e, da, db, 0.44, zw + 4, zw + 18, 10);
  dome(e, da, db, 0.46, zw + 22, 36);
  const lantern = zw + 22 + 36;
  cylinder(e, da, db, 0.08, lantern - 3, lantern + 9, 'medium');
  e.segments(
    [
      [
        [da, db, lantern + 9],
        [da, db, lantern + 20],
      ],
      [
        [da - 0.05, db + 0.05, lantern + 16],
        [da + 0.05, db - 0.05, lantern + 16],
      ],
    ],
    e.inks.outline,
  );
  // Bell towers either side of the portico, then the portico and pediment.
  for (const a of [0.88, 2.12]) {
    box(e, a - 0.13, 1.9, a + 0.13, 2.16, z0, zw + 22, { top: 'none' });
    dome(e, a, 2.03, 0.13, zw + 22, 10);
  }
  const front: Rect = [1.05, 1.95, 1.95, 2.3];
  box(e, ...front, z0, zw, { left: 'dense', top: 'none' });
  const cols = [3, 5, 6][e.lod]!;
  for (let k = 0; k < cols; k++) {
    const a = 1.1 + (0.8 * (k + 0.5)) / cols;
    e.poly(
      [
        [a - 0.04, 2.3, z0],
        [a + 0.04, 2.3, z0],
        [a + 0.04, 2.3, zw],
        [a - 0.04, 2.3, zw],
      ],
      'paper',
      e.inks.detail,
    );
  }
  e.poly(
    [
      [1.02, 2.3, zw],
      [1.5, 2.3, zw + 14],
      [1.98, 2.3, zw],
    ],
    'paper',
  );
}

export function steppedGables(e: Engraver, s: number, seed: number): void {
  const rng = artRng(seed);
  plaza(e, 0.15, 1.95, s - 0.15, s - 0.15);
  const houses: [Rect, number][] = [
    [[0.3, 0.3, 1.1, 1.85], 36],
    [[1.1, 0.3, 1.9, 1.85], 42],
    [[1.9, 0.3, 2.7, 1.85], 36],
  ];
  castShadow(e, 0.3, 0.3, 2.7, 1.85, 70);
  for (const [r, h] of houses) {
    const rh = 30;
    walls(e, r, h, 'paper');
    if (h > 32) timberFrame(e, 'left', r, 9, h, 9);
    else if (e.lod > 0) windowSlits(e, 'left', r, 4, h - 2, 3, 9, 0.6);
    if (e.lod > 0) arcade(e, 'left', r, 9, 3);
    gableRoof(e, r, h, rh, false);
    gableEnd(e, 'left', r, h, rh, 'stepped');
  }
  // A small fountain on the square.
  cylinder(e, 1.5, 2.45, 0.14, 0, 3, 'light');
  cylinder(e, 1.5, 2.45, 0.03, 3, 10, 'medium');
  stipple(e, [0.2, 2.6, 0.7, 2.8], rng, 1);
}

export function grandStation(e: Engraver, _s: number): void {
  // The arched train shed behind the station.
  const shed: Rect = [0.3, 0.25, 2.7, 1.35];
  const wall = 10;
  const vault = 24;
  castShadow(e, 0.2, 0.25, 2.8, 2.2, 90);
  walls(e, shed, wall);
  const steps = e.lod === 0 ? 5 : 9;
  const prof: [number, number][] = [];
  for (let k = 0; k <= steps; k++) {
    const t = (k / steps) * Math.PI;
    prof.push([
      (shed[1] + shed[3]) / 2 - (Math.cos(t) * (shed[3] - shed[1])) / 2,
      wall + Math.sin(t) * vault,
    ]);
  }
  for (let k = 0; k < steps; k++) {
    const [ba, za] = prof[k]!;
    const [bb, zb] = prof[k + 1]!;
    e.poly(
      [
        [shed[0], ba, za],
        [shed[2], ba, za],
        [shed[2], bb, zb],
        [shed[0], bb, zb],
      ],
      k < steps / 2 ? 'roof' : 'roofLight',
      e.inks.detail,
    );
  }
  e.poly(
    [[shed[2], shed[3], 0], [shed[2], shed[1], 0], ...prof.map(([b, z]): Vec3 => [shed[2], b, z])],
    'paper',
  );
  if (e.lod > 0) {
    const fan: [Vec3, Vec3][] = [];
    for (let k = 1; k < steps; k++)
      fan.push([
        [shed[2], (shed[1] + shed[3]) / 2, wall],
        [shed[2], prof[k]![0], prof[k]![1]],
      ]);
    e.segments(fan, e.inks.detail, 0.8);
  }
  // The long front building with arched windows and a ridge roof.
  const front: Rect = [0.2, 1.45, 2.8, 2.15];
  walls(e, front, 30);
  arcade(e, 'left', front, 20, [5, 9, 11][e.lod]!);
  bands(e, 'left', front, [20, 28], e.inks.detail * 1.2);
  gableRoof(e, front, 30, 16, true);
  // Twin clock towers flanking the entrance.
  for (const a of [1.12, 1.88]) {
    const t: Rect = [a - 0.12, 1.98, a + 0.12, 2.22];
    box(e, ...t, 0, 80, { top: 'none' });
    if (e.lod > 0) windowSlits(e, 'left', t, 6, 46, 1, 10, 0.6);
    clockDisc(e, a, 2.22, 68);
    const apex: Vec3 = [a, 2.1, 108];
    e.poly([[t[0], t[3], 80], [t[2], t[3], 80], apex], 'roofLight');
    e.poly([[t[2], t[3], 80], [t[2], t[1], 80], apex], 'roofDense');
  }
}

/** A clock face on a wall facing +b. */
function clockDisc(e: Engraver, a: number, b: number, z: number): void {
  const pts: Vec3[] = [];
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    pts.push([a + Math.cos(t) * 0.07, b, z + Math.sin(t) * 0.07 * 35.78]);
  }
  e.poly(pts, 'paper', e.inks.detail);
}

export function twinSpires(e: Engraver, _s: number): void {
  castShadow(e, 0.15, 0.95, 2.6, 1.95, 150);
  // The west towers come first (they stand behind the nave on screen).
  for (const b0 of [0.95, 1.55]) {
    const t: Rect = [0.15, b0, 0.6, b0 + 0.4];
    box(e, ...t, 0, 92, { top: 'none' });
    if (e.lod > 0) {
      windowSlits(e, 'left', t, 30, 88, 2, 16, 0.7);
      windowSlits(e, 'right', t, 30, 88, 2, 16, 0.7);
    }
    bands(e, 'left', t, [64, 90], e.inks.outline);
    bands(e, 'right', t, [64, 90], e.inks.outline);
    const apex: Vec3 = [0.375, b0 + 0.2, 92 + 62];
    e.poly([[t[0], t[3], 92], [t[2], t[3], 92], apex], 'roofLight');
    e.poly([[t[2], t[3], 92], [t[2], t[1], 92], apex], 'roofDense');
  }
  const nave: Rect = [0.6, 1.02, 2.4, 1.88];
  walls(e, nave, 34);
  ribs(e, 'left', nave, 0, 34, [4, 6, 8][e.lod]!);
  if (e.lod > 0) windowSlits(e, 'left', nave, 8, 30, [4, 6, 8][e.lod]!, 22, 0.75);
  gableRoof(e, nave, 34, 20, true);
  // The rounded apse at the east end.
  cylinder(e, 2.4, 1.45, 0.4, 0, 30, 'light');
  cone(e, 2.4, 1.45, 30, 0.42, 14, 'roofMedium');
}

/** Vertical lines round the front of a drum. */
function ribsRound(
  e: Engraver,
  a: number,
  b: number,
  r: number,
  z0: number,
  z1: number,
  n: number,
): void {
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < n; k++) {
    const t = Math.PI * (k / n - 0.25);
    segs.push([
      [a + Math.cos(t) * r, b + Math.sin(t) * r, z0],
      [a + Math.cos(t) * r, b + Math.sin(t) * r, z1],
    ]);
  }
  e.segments(segs, e.inks.detail * 1.6);
}
