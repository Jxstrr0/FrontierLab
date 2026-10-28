// The little engraved figures of city life (ART_DIRECTION §2.3): cars, buses,
// trucks, people, boats with their wakes, fountain drops, steam puffs and
// birds. Drawn straight onto the life canvas in world px (the caller sets the
// camera transform), in the city's ink on its paper, with flat tones in place
// of hatching because they are only a few pixels big.
import { CARS, CRUISE, PEOPLE } from '../config/cityLife';
import { isoPoint } from './iso';
import type { Pose } from './lifeMovers';
import type { Ctx2D } from './canvasKit';

/** The inks a sprite may use. */
export interface LifeInks {
  ink: string;
  paper: string;
  /** Light and medium shade for the faces of solids. */
  light: string;
  medium: string;
  /** Body colours of cars, by tone. */
  bodies: string[];
  /** Coat colours of people, by tone. */
  coats: string[];
  /** Line width in world px. */
  line: number;
}

type Pt = { x: number; y: number };

/**
 * A box along its heading: `len` × `width` tiles, centred on (x, y) shifted
 * `back` tiles behind, from z0 to z1. Only the faces a viewer sees are drawn.
 */
function orientedBox(
  c: Ctx2D,
  tiles: number,
  p: Pose,
  len: number,
  width: number,
  back: number,
  z0: number,
  z1: number,
  top: string,
  inks: LifeInks,
): void {
  const alongX = Math.abs(p.dx) >= Math.abs(p.dy);
  const cx = alongX ? p.x - Math.sign(p.dx) * back : p.x;
  const cy = alongX ? p.y : p.y - Math.sign(p.dy) * back;
  const ha = (alongX ? len : width) / 2;
  const hb = (alongX ? width : len) / 2;
  const [a0, a1, b0, b1] = [cx - ha, cx + ha, cy - hb, cy + hb];
  const P = (a: number, b: number, z: number) => isoPoint(tiles, a, b, z);
  const face = (pts: Pt[], fill: string) => {
    c.beginPath();
    c.moveTo(pts[0]!.x, pts[0]!.y);
    for (let k = 1; k < pts.length; k++) c.lineTo(pts[k]!.x, pts[k]!.y);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.stroke();
  };
  face([P(a0, b1, z0), P(a1, b1, z0), P(a1, b1, z1), P(a0, b1, z1)], inks.light);
  face([P(a1, b1, z0), P(a1, b0, z0), P(a1, b0, z1), P(a1, b1, z1)], inks.medium);
  face([P(a0, b0, z1), P(a1, b0, z1), P(a1, b1, z1), P(a0, b1, z1)], top);
}

export function car(c: Ctx2D, tiles: number, p: Pose, tone: number, inks: LifeInks): void {
  const body = inks.bodies[tone % inks.bodies.length]!;
  orientedBox(c, tiles, p, CARS.len, CARS.width, 0, 0, CARS.bodyPx, body, inks);
  const z = CARS.bodyPx;
  orientedBox(
    c,
    tiles,
    p,
    CARS.len * 0.5,
    CARS.width * 0.8,
    CARS.len * 0.08,
    z,
    z + CARS.cabinPx,
    inks.paper,
    inks,
  );
}

export function bus(c: Ctx2D, tiles: number, p: Pose, inks: LifeInks): void {
  const h = CARS.bodyPx + CARS.cabinPx * 1.3;
  orientedBox(c, tiles, p, CARS.busLen, CARS.width * 1.1, 0, 0, h, inks.bodies[2]!, inks);
  // A band of windows along the visible side.
  const alongX = Math.abs(p.dx) >= Math.abs(p.dy);
  const half = CARS.busLen / 2 - 0.03;
  const side = (CARS.width * 1.1) / 2;
  const z = h * 0.68;
  const q0 = alongX
    ? isoPoint(tiles, p.x - half, p.y + side, z)
    : isoPoint(tiles, p.x + side, p.y - half, z);
  const q1 = alongX
    ? isoPoint(tiles, p.x + half, p.y + side, z)
    : isoPoint(tiles, p.x + side, p.y + half, z);
  c.beginPath();
  c.moveTo(q0.x, q0.y);
  c.lineTo(q1.x, q1.y);
  c.stroke();
}

/** Your delivery truck: a paper box body and a cab in the brand ink. */
export function truck(c: Ctx2D, tiles: number, p: Pose, ink: string, inks: LifeInks): void {
  const len = CARS.busLen * 0.85;
  const h = CARS.bodyPx + CARS.cabinPx * 1.4;
  const body = () =>
    orientedBox(c, tiles, p, len * 0.66, CARS.width * 1.15, len * 0.17, 0, h, inks.paper, inks);
  const cab = () =>
    orientedBox(c, tiles, p, len * 0.28, CARS.width, -len * 0.33, 0, h * 0.75, ink, inks);
  // Draw back to front: heading toward +x/+y puts the cab nearer the viewer.
  if (p.dx + p.dy > 0) {
    body();
    cab();
  } else {
    cab();
    body();
  }
}

/** A person: a coat stroke from the ground up and a round head. */
export function person(c: Ctx2D, tiles: number, p: Pose, tone: number, inks: LifeInks): void {
  const feet = isoPoint(tiles, p.x, p.y, 0);
  const h = PEOPLE.heightPx;
  c.strokeStyle = inks.coats[tone % inks.coats.length]!;
  c.lineWidth = inks.line * 2.2;
  c.beginPath();
  c.moveTo(feet.x, feet.y);
  c.lineTo(feet.x, feet.y - h * 0.72);
  c.stroke();
  c.strokeStyle = inks.ink;
  c.lineWidth = inks.line;
  c.beginPath();
  c.arc(feet.x, feet.y - h, PEOPLE.headPx, 0, Math.PI * 2);
  c.fillStyle = inks.paper;
  c.fill();
  c.stroke();
}

/** A small launch: a pointed hull, a cabin and a fanned wake on the water behind it. */
export function boat(c: Ctx2D, tiles: number, p: Pose, inks: LifeInks): void {
  const alongX = Math.abs(p.dx) >= Math.abs(p.dy);
  const f = alongX ? Math.sign(p.dx) : Math.sign(p.dy);
  // s runs along the heading, t across it.
  const P = (s: number, t: number, z: number) =>
    alongX ? isoPoint(tiles, p.x + f * s, p.y + t, z) : isoPoint(tiles, p.x + t, p.y + f * s, z);
  const half = CRUISE.len / 2;
  const hb = CRUISE.beam / 2;
  const w = CRUISE.wakeTiles;
  c.save();
  c.globalAlpha *= 0.45;
  c.beginPath();
  for (const side of [-1, 1]) {
    const a = P(-half, side * hb * 0.6, 0);
    const b = P(-half - w, side * (hb + w * 0.35), 0);
    c.moveTo(a.x, a.y);
    c.lineTo(b.x, b.y);
  }
  c.stroke();
  c.restore();
  const hull = [
    P(-half, -hb, CRUISE.hullPx),
    P(half * 0.6, -hb, CRUISE.hullPx),
    P(half, 0, CRUISE.hullPx),
    P(half * 0.6, hb, CRUISE.hullPx),
    P(-half, hb, CRUISE.hullPx),
  ];
  const side = [
    P(-half, hb, 0),
    P(half * 0.6, hb, 0),
    P(half, 0, 0),
    P(half, 0, CRUISE.hullPx),
    P(half * 0.6, hb, CRUISE.hullPx),
    P(-half, hb, CRUISE.hullPx),
  ];
  for (const [pts, fill] of [
    [side, inks.medium],
    [hull, inks.paper],
  ] as const) {
    c.beginPath();
    c.moveTo(pts[0]!.x, pts[0]!.y);
    for (const q of pts.slice(1)) c.lineTo(q.x, q.y);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.stroke();
  }
  const cabin: Pose = {
    ...p,
    x: alongX ? p.x - f * half * 0.2 : p.x,
    y: alongX ? p.y : p.y - f * half * 0.2,
  };
  orientedBox(
    c,
    tiles,
    cabin,
    CRUISE.len * 0.35,
    CRUISE.beam * 0.6,
    0,
    CRUISE.hullPx,
    CRUISE.hullPx + CRUISE.cabinPx,
    inks.paper,
    inks,
  );
}

/** A drop of fountain water (world point). */
export function drop(c: Ctx2D, at: Pt, inks: LifeInks): void {
  c.fillStyle = inks.ink;
  c.fillRect(at.x - inks.line * 0.8, at.y - inks.line * 0.8, inks.line * 1.6, inks.line * 1.6);
}

/** A puff of steam, growing and fading as it rises (k from 0 to 1). */
export function puff(c: Ctx2D, at: Pt, k: number, inks: LifeInks): void {
  const r = 1.4 + 4.2 * k;
  c.save();
  c.globalAlpha *= 0.75 * (1 - k);
  c.beginPath();
  c.ellipse(at.x, at.y, r, r * 0.8, 0, 0, Math.PI * 2);
  c.fillStyle = inks.paper;
  c.fill();
  c.stroke();
  c.restore();
}

/** A bird: two wing strokes, raised by `flap` (−1 to 1). */
export function bird(c: Ctx2D, at: Pt, wing: number, flap: number): void {
  c.moveTo(at.x - wing, at.y - wing * 0.5 * flap);
  c.lineTo(at.x, at.y);
  c.lineTo(at.x + wing, at.y - wing * 0.5 * flap);
}
