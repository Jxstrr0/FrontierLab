// Engraved solids in tile space (ART_DIRECTION §2): boxes, gabled and sawtooth
// roofs, cylinders, domes, cast shadows and window marks. Light comes from the
// back-left (−a), so left faces (b = b1) take the light hatch, right faces
// (a = a1) the medium hatch, openings the dense hatch, and shadows fall along +a.
import { shadowTiles } from './drawList';
import type { Engraver, Fill } from './engraver';

export { bands, onFace, ribs, windowSlits, type Face } from './faceMarks';

export interface BoxFills {
  left?: Fill;
  right?: Fill;
  top?: Fill;
}

/** A box over local footprint a0..a1 × b0..b1, from z0 up to z1 (world px). */
export function box(
  e: Engraver,
  a0: number,
  b0: number,
  a1: number,
  b1: number,
  z0: number,
  z1: number,
  fills: BoxFills = {},
): void {
  e.poly(
    [
      [a0, b1, z0],
      [a1, b1, z0],
      [a1, b1, z1],
      [a0, b1, z1],
    ],
    fills.left ?? 'light',
  );
  e.poly(
    [
      [a1, b1, z0],
      [a1, b0, z0],
      [a1, b0, z1],
      [a1, b1, z1],
    ],
    fills.right ?? 'medium',
  );
  if (fills.top !== 'none') {
    e.poly(
      [
        [a0, b0, z1],
        [a1, b0, z1],
        [a1, b1, z1],
        [a0, b1, z1],
      ],
      fills.top ?? 'paper',
    );
  }
}

/** The ground shadow of a footprint of the given height, cast along +a. */
export function castShadow(
  e: Engraver,
  _a0: number,
  b0: number,
  a1: number,
  b1: number,
  heightPx: number,
): void {
  const len = shadowTiles(heightPx);
  if (len <= 0) return;
  e.poly(
    [
      [a1, b0, 0],
      [a1 + len, b0, 0],
      [a1 + len, b1, 0],
      [a1, b1, 0],
    ],
    'shadow',
    null,
  );
}

/** A gabled roof on walls a0..a1 × b0..b1 of height z1, ridge rising rh above. */
export function gable(
  e: Engraver,
  a0: number,
  b0: number,
  a1: number,
  b1: number,
  z1: number,
  rh: number,
  ridgeAlongA: boolean,
): void {
  const zr = z1 + rh;
  if (ridgeAlongA) {
    const bm = (b0 + b1) / 2;
    box(e, a0, b0, a1, b1, 0, z1, { top: 'none' });
    e.poly(
      [
        [a1, b0, z1],
        [a1, bm, zr],
        [a1, b1, z1],
      ],
      'medium',
    );
    e.poly(
      [
        [a0, bm, zr],
        [a1, bm, zr],
        [a1, b1, z1],
        [a0, b1, z1],
      ],
      'roofMedium',
    );
  } else {
    const am = (a0 + a1) / 2;
    box(e, a0, b0, a1, b1, 0, z1, { top: 'none' });
    e.poly(
      [
        [am, b0, zr],
        [am, b1, zr],
        [a1, b1, z1],
        [a1, b0, z1],
      ],
      'roofMedium',
    );
    e.poly(
      [
        [a0, b1, z1],
        [am, b1, zr],
        [a1, b1, z1],
      ],
      'light',
    );
  }
}

/** Sawtooth roof teeth along a over walls of height z1; glazing faces +a. */
export function sawtooth(
  e: Engraver,
  a0: number,
  b0: number,
  a1: number,
  b1: number,
  z1: number,
  teeth: number,
  th: number,
): void {
  const w = (a1 - a0) / teeth;
  for (let t = 0; t < teeth; t++) {
    const as = a0 + t * w;
    const ae = as + w;
    e.poly(
      [
        [as, b0, z1],
        [ae, b0, z1 + th],
        [ae, b1, z1 + th],
        [as, b1, z1],
      ],
      'paper',
    );
    e.poly(
      [
        [ae, b1, z1],
        [ae, b0, z1],
        [ae, b0, z1 + th],
        [ae, b1, z1 + th],
      ],
      'dense',
    );
    e.poly(
      [
        [as, b1, z1],
        [ae, b1, z1],
        [ae, b1, z1 + th],
      ],
      'light',
    );
  }
}

/** A vertical cylinder of radius r (tiles) at (a, b) from z0 to z1. */
export function cylinder(
  e: Engraver,
  a: number,
  b: number,
  r: number,
  z0: number,
  z1: number,
  side: Fill = 'medium',
): void {
  const c = e.ctx;
  const p0 = e.pt(a, b, z0);
  const p1 = e.pt(a, b, z1);
  const rx = r * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
  const ry = rx / 2;
  c.beginPath();
  c.moveTo(p1.x - rx, p1.y);
  c.lineTo(p0.x - rx, p0.y);
  c.ellipse(p0.x, p0.y, rx, ry, 0, Math.PI, 0, true);
  c.lineTo(p1.x + rx, p1.y);
  c.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI, false);
  c.closePath();
  if (e.setFill(side)) c.fill();
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  e.flatCircle(a, b, z1, r, 'paper', true);
}

/** A dome of radius r (tiles) at (a, b) on a base at z, rising dh world px. */
export function dome(e: Engraver, a: number, b: number, r: number, z: number, dh: number): void {
  const c = e.ctx;
  const p = e.pt(a, b, z);
  const rx = r * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
  c.beginPath();
  c.ellipse(p.x, p.y, rx, dh, 0, Math.PI, 0, false);
  c.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI, false);
  c.closePath();
  e.setFill('light');
  c.fill();
  c.lineWidth = e.inks.outline;
  c.strokeStyle = e.inks.ink;
  c.stroke();
  if (e.lod === 0) return;
  // Meridians: narrower half-ellipses from the base to the crown.
  c.beginPath();
  for (const f of [0.35, 0.7]) {
    c.moveTo(p.x, p.y - dh);
    c.ellipse(p.x, p.y, rx * f, dh, 0, -Math.PI / 2, Math.PI / 2 - 0.25, false);
    c.moveTo(p.x, p.y - dh);
    c.ellipse(p.x, p.y, rx * f, dh, 0, -Math.PI / 2, -Math.PI * 1.5 + 0.25, true);
  }
  c.lineWidth = e.inks.detail;
  c.stroke();
}
