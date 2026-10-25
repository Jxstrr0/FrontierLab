// Signature landmarks that belong at the water's edge (ART_DIRECTION §2.1):
// the pier hall under a row of white sails, the harbour hall roofed with white
// shells, the suspension bridge's two towers and sweeping cables, and the
// giant observation wheel. Each fits its size × size block (the bridge deck
// runs a little past it along a) and never depends on its surroundings.
import type { Engraver, Vec3 } from './engraver';
import { ribs } from './faceMarks';
import { plaza, wheelPt } from './signatureKit';
import { box, castShadow } from './solids';

/** Visual tuning, in tiles and world px. */
const WHEEL = { r: 54, hub: 64, spokes: [8, 16, 24], pods: [12, 20, 28] } as const;
const BRIDGE = {
  deckZ: 16,
  towerZ: 124,
  sagZ: 30,
  legB: [1.22, 1.78],
  towersA: [0.62, 2.38],
} as const;

export function sailCanopy(e: Engraver, s: number): void {
  const hall: [number, number, number, number] = [0.25, 0.95, s - 0.25, 2.05];
  const zh = 14;
  plaza(e, 0.1, 0.6, s - 0.1, 2.5);
  castShadow(e, ...hall, zh + 40);
  box(e, ...hall, 0, zh, { left: 'paper', right: 'light', top: 'roof' });
  ribs(e, 'left', hall, 0, zh, [6, 12, 18][e.lod]!);
  // A row of white sail peaks, back to front along a.
  const n = 5;
  for (let k = 0; k < n; k++) {
    const a = hall[0] + 0.24 + ((hall[2] - hall[0] - 0.48) * k) / (n - 1);
    sailPeak(e, a, 1.5, zh, 0.24, 0.46, 30 + (k % 2) * 6);
  }
}

/** A tent-like sail: curved edges from four base corners up to a mast top. */
function sailPeak(e: Engraver, a: number, b: number, z: number, wa: number, wb: number, h: number) {
  const apex = e.pt(a, b, z + h);
  const corner = (da: number, db: number) => e.pt(a + da, b + db, z);
  const c = e.ctx;
  const face = (
    p: { x: number; y: number },
    q: { x: number; y: number },
    fill: 'paper' | 'light',
  ) => {
    // Edges sag inward toward the sail's centre line, like stretched cloth.
    const mx = (p.x + q.x) / 2;
    const my = (p.y + q.y) / 2;
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.quadraticCurveTo(p.x + (apex.x - p.x) * 0.25, apex.y + (p.y - apex.y) * 0.55, apex.x, apex.y);
    c.quadraticCurveTo(q.x + (apex.x - q.x) * 0.25, apex.y + (q.y - apex.y) * 0.55, q.x, q.y);
    c.quadraticCurveTo(mx, my - h * 0.12, p.x, p.y);
    e.setFill(fill);
    c.fill();
    c.lineWidth = e.inks.outline;
    c.strokeStyle = e.inks.ink;
    c.stroke();
  };
  face(corner(-wa, wb), corner(wa, wb), 'paper');
  face(corner(wa, wb), corner(wa, -wb), 'light');
  e.segments(
    [
      [
        [a, b, z + h - 2],
        [a, b, z + h + 7],
      ],
    ],
    e.inks.outline,
  );
}

export function shellHall(e: Engraver, s: number): void {
  // Stepped podium.
  box(e, 0.15, 0.55, s - 0.15, 2.45, 0, 5, { left: 'medium', right: 'dense', top: 'paper' });
  box(e, 0.35, 0.7, s - 0.35, 2.3, 5, 9, { left: 'light', right: 'medium', top: 'paper' });
  castShadow(e, 0.4, 0.9, 2.6, 2.1, 70);
  // Two rows of shells, each row's shells nested from big (back) to small (front).
  const rows: [number, number[]][] = [
    [1.2, [58, 46, 34]],
    [1.85, [46, 36, 26]],
  ];
  for (const [b, sizes] of rows) {
    sizes.forEach((h, k) => shell(e, 0.5 + k * 0.66, b, 9, 0.8, 0.3, h));
  }
}

/**
 * One shell: a curved vault whose open mouth faces −a. The ridge sweeps from
 * the leaning tip down to the tail; the mouth edges curve up from the base.
 */
function shell(e: Engraver, a0: number, b: number, z: number, len: number, w: number, h: number) {
  const n = e.lod === 0 ? 6 : 12;
  const ridge: Vec3[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    ridge.push([a0 + len * t, b, z + h * Math.cos((t * Math.PI) / 2) ** 0.7]);
  }
  const mouth = (sb: number): Vec3[] => {
    const pts: Vec3[] = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      pts.push([
        a0 + 0.2 * (1 - u) - 0.08 * Math.sin(u * Math.PI),
        b + sb * w * (1 - u) ** 0.8,
        z + h * u,
      ]);
    }
    return pts;
  };
  const side = (sb: number): Vec3[] => [
    ...mouth(sb),
    ...ridge.slice(1),
    [a0 + len * 0.95, b + sb * w * 0.25, z],
  ];
  e.poly(side(-1), 'light');
  e.poly([...mouth(-1), ...mouth(1).reverse()], 'dense', e.inks.detail);
  e.poly(side(1), 'paper');
  if (e.lod === 0) return;
  // Fine ribs fanning down the near side from the ridge.
  const lines: [Vec3, Vec3][] = [];
  for (let k = 2; k < n; k += 2) {
    const t = k / n;
    lines.push([ridge[k]!, [a0 + 0.2 + (len - 0.2) * t * 0.9, b + w * (1 - t * 0.7), z]]);
  }
  e.segments(lines, e.inks.detail, 0.7);
}

export function suspensionBridge(e: Engraver, s: number): void {
  const { deckZ, towerZ, sagZ } = BRIDGE;
  const [bBack, bFront] = BRIDGE.legB;
  const [t0, t1] = BRIDGE.towersA;
  const a0 = -0.6;
  const a1 = s + 0.6;
  for (const ta of [t0, t1]) castShadow(e, ta - 0.05, bBack, ta + 0.05, bFront, towerZ);
  const cable = (b: number): Vec3[] => {
    const pts: Vec3[] = [];
    const n = e.lod === 0 ? 8 : 18;
    // Side spans: straight-ish runs from the deck ends to the tower tops.
    pts.push([a0, b, deckZ + 2]);
    for (let k = 0; k <= n; k++) {
      const u = k / n;
      const a = t0 + (t1 - t0) * u;
      // A parabola: highest at the towers, lowest mid-span.
      pts.push([a, b, sagZ + (towerZ - sagZ) * (2 * u - 1) ** 2]);
    }
    pts.push([a1, b, deckZ + 2]);
    return pts;
  };
  const drawCable = (b: number) => {
    const pts = cable(b);
    e.segments(
      pts.slice(1).map((p, k) => [pts[k]!, p]),
      e.inks.outline * 1.3,
    );
    if (e.lod === 0) return;
    const hangers: [Vec3, Vec3][] = [];
    for (const p of pts)
      if (p[0] > t0 + 0.05 && p[0] < t1 - 0.05) hangers.push([p, [p[0], b, deckZ + 3]]);
    e.segments(hangers, e.inks.detail * 0.8, 0.8);
  };
  const leg = (a: number, b: number) =>
    box(e, a - 0.05, b - 0.05, a + 0.05, b + 0.05, 0, towerZ, {
      left: 'light',
      right: 'dense',
      top: 'paper',
    });
  const beams = (a: number) => {
    for (const z of [deckZ + 40, deckZ + 76, towerZ - 6]) {
      box(e, a - 0.04, bBack, a + 0.04, bFront, z, z + 5, { left: 'paper', right: 'medium' });
    }
  };
  // Back cable and legs, the deck, then the front legs and cable.
  drawCable(bBack);
  for (const ta of [t0, t1]) leg(ta, bBack);
  box(e, a0, bBack - 0.04, a1, bFront + 0.04, deckZ - 4, deckZ, {
    left: 'light',
    right: 'medium',
    top: 'paper',
  });
  if (e.lod > 0)
    e.segments(
      [
        [
          [a0, 1.5, deckZ],
          [a1, 1.5, deckZ],
        ],
      ],
      e.inks.detail,
      0.5,
    );
  for (const ta of [t0, t1]) {
    beams(ta);
    leg(ta, bFront);
  }
  drawCable(bFront);
}

export function observationWheel(e: Engraver, s: number): void {
  const c = s / 2;
  const b = 1.5;
  const { r, hub } = WHEEL;
  plaza(e, 0.2, 1.0, s - 0.2, 2.4);
  castShadow(e, c - 0.3, b - 0.3, c + 0.3, b + 0.3, hub);
  const legs = (lb: number) =>
    e.segments(
      [
        [
          [c - 0.75, lb, 0],
          [c, b, hub],
        ],
        [
          [c + 0.75, lb, 0],
          [c, b, hub],
        ],
      ],
      e.inks.outline * 1.5,
    );
  legs(b - 0.45);
  // Rim (two rings), spokes and the hub.
  const steps = e.lod === 0 ? 24 : 48;
  for (const rr of [r, r - 3.5]) {
    const pts: Vec3[] = [];
    for (let k = 0; k < steps; k++) pts.push(wheelPt(c, b, hub, rr, (k / steps) * Math.PI * 2));
    e.poly(pts, 'none', e.lod === 0 ? e.inks.outline : e.inks.outline * 1.1);
  }
  const n = WHEEL.spokes[e.lod]!;
  const spokes: [Vec3, Vec3][] = [];
  for (let k = 0; k < n; k++)
    spokes.push([[c, b, hub], wheelPt(c, b, hub, r - 3.5, (k / n) * Math.PI * 2)]);
  e.segments(spokes, e.inks.detail, 0.85);
  e.flatCircle(c, b, hub, 0.05, 'dense', true);
  // Passenger pods hang just outside the rim.
  const pods = WHEEL.pods[e.lod]!;
  const ctx = e.ctx;
  ctx.beginPath();
  for (let k = 0; k < pods; k++) {
    const p = wheelPt(c, b, hub, r + 2.5, (k / pods) * Math.PI * 2 + 0.1);
    const q = e.pt(p[0], p[1], p[2]);
    ctx.moveTo(q.x + 2.4, q.y);
    ctx.ellipse(q.x, q.y, 2.4, 1.7, 0, 0, Math.PI * 2);
  }
  ctx.fillStyle = e.inks.paper;
  ctx.fill();
  ctx.lineWidth = e.inks.detail * 1.3;
  ctx.strokeStyle = e.inks.ink;
  ctx.stroke();
  legs(b + 0.45);
  // Boarding hall at the foot.
  box(e, c - 0.45, b + 0.25, c + 0.45, b + 0.7, 0, 7, {
    left: 'paper',
    right: 'light',
    top: 'roof',
  });
}
