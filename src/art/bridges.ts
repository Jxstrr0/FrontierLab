// Layout-2 water life (ART_DIRECTION §2): engraved bridges where streets cross
// narrow water (deck, railings, arched fascia and piers), piers out from the
// streets that end at open water in any direction, and small boats moored on
// wide water. Drawn in the water ground step, in world space, after the quays.
import { CITY_LAYOUT } from '../config/balance';
import type { CityMap } from './citygen';
import { DECOR } from './cityDecor';
import type { TileRange } from './drawList';
import type { Engraver, Vec3 } from './engraver';
import { artRng } from './prng';

/** Visual tuning, in tiles and world px. */
const BRIDGE = {
  /** Deck edges across the street, from each side. */
  inset: 0.1,
  railInset: 0.16,
  railPx: 2.6,
  fasciaPx: 1.6,
  /** Arched spans this many tiles long, the water this far down, arch curve points. */
  pierEvery: 0.5,
  waterPx: 6,
  archSteps: 6,
  balusters: 0.125,
  shadow: 0.14,
} as const;
const PIER = { len: [1.2, 2.2], width: 0.34, deck: 1.5, minWater: 3 } as const;
const BOAT = { len: [0.32, 0.5], beam: 0.16, hullPx: 2.2, cabinPx: 3, sailPx: [9, 13] } as const;

/** Local frame for something running along x (dir 1) or along y (dir 2). */
function framePt(along: 1 | 2, s: number, t: number, z: number): Vec3 {
  return along === 1 ? [s, t, z] : [t, s, z];
}

export function drawWaterLife(e: Engraver, map: CityMap, range: TileRange): void {
  const n = map.tiles;
  const geo = map.geo;
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const i = y * n + x;
      const b = geo.bridge[i]!;
      if (b) bridge(e, x, y, b);
      else if (map.decor[i]! & DECOR.boat) boat(e, x, y, i);
    }
  }
  piers(e, map, range);
}

function bridge(e: Engraver, x: number, y: number, flag: number): void {
  e.origin(x, y);
  const q = BRIDGE.inset;
  const w = BRIDGE.waterPx;
  if (flag === 3) {
    e.poly(
      [
        [q, q, 0],
        [1 - q, q, 0],
        [1 - q, 1 - q, 0],
        [q, 1 - q, 0],
      ],
      'paper',
      e.inks.detail,
    );
    return;
  }
  const along = flag as 1 | 2;
  const P = (s: number, t: number, z: number) => framePt(along, s, t, z);
  // Shadow on the water beside the deck (shadows fall along +x / +y).
  const sh = 1 - q + BRIDGE.shadow;
  e.poly([P(0, 1 - q, -w), P(1, 1 - q, -w), P(1, sh, -w), P(0, sh, -w)], 'shadow', null);
  // The visible side: arched spans springing from piers in the water.
  const t = 1 - q;
  const crown = BRIDGE.fasciaPx;
  for (let s0 = 0; s0 < 0.999; s0 += BRIDGE.pierEvery) {
    const s1 = s0 + BRIDGE.pierEvery;
    const pts: Vec3[] = [P(s0, t, 0), P(s1, t, 0), P(s1, t, -w)];
    for (let k = 1; k < BRIDGE.archSteps; k++) {
      const ang = (Math.PI * k) / BRIDGE.archSteps;
      const s = s1 - ((1 - Math.cos(ang)) / 2) * (s1 - s0);
      pts.push(P(s, t, -crown - (w - crown) * (1 - Math.sin(ang))));
    }
    pts.push(P(s0, t, -w));
    e.poly(pts, 'light', e.inks.detail);
  }
  e.poly([P(0, q, 0), P(1, q, 0), P(1, 1 - q, 0), P(0, 1 - q, 0)], 'paper', e.inks.detail);
  // Railings on both sides, with balusters close up.
  const r = BRIDGE.railInset;
  const h = BRIDGE.railPx;
  const rails: [Vec3, Vec3][] = [
    [P(0, r, h), P(1, r, h)],
    [P(0, 1 - r, h), P(1, 1 - r, h)],
  ];
  if (e.lod === 2) {
    for (let s = 0; s <= 1.001; s += BRIDGE.balusters) {
      rails.push([P(s, r, 0), P(s, r, h)], [P(s, 1 - r, 0), P(s, 1 - r, h)]);
    }
  }
  e.segments(rails, e.lod === 2 ? e.inks.detail : e.inks.outline);
  if (e.lod > 0) e.segments([[P(0, 0.5, 0), P(1, 0.5, 0)]], e.inks.detail * 0.8, 0.3);
}

function boat(e: Engraver, x: number, y: number, i: number): void {
  const rng = artRng(i * 2654435761);
  const along: 1 | 2 = rng.chance(0.5) ? 1 : 2;
  const len = rng.range(BOAT.len[0], BOAT.len[1]);
  const s0 = rng.range(0.2, 0.8 - len);
  const t0 = rng.range(0.3, 0.7);
  const hb = BOAT.beam / 2;
  const z = BOAT.hullPx;
  e.origin(x, y);
  const P = (s: number, t: number, zz: number) => framePt(along, s, t, zz);
  // Hull: a pointed deck over a hatched side.
  e.poly(
    [
      P(s0, t0 + hb, 0),
      P(s0 + len * 0.8, t0 + hb, 0),
      P(s0 + len, t0, 0),
      P(s0 + len * 0.8, t0 + hb, z),
      P(s0, t0 + hb, z),
    ],
    'medium',
    e.inks.detail,
  );
  e.poly(
    [
      P(s0, t0 - hb, z),
      P(s0 + len * 0.8, t0 - hb, z),
      P(s0 + len, t0, z),
      P(s0 + len * 0.8, t0 + hb, z),
      P(s0, t0 + hb, z),
    ],
    'paper',
    e.inks.detail,
  );
  if (e.lod === 0) return;
  const m = s0 + len * 0.42;
  if (rng.chance(0.5)) {
    // A sailing boat: mast and a triangular sail.
    const top = z + rng.range(BOAT.sailPx[0], BOAT.sailPx[1]);
    e.poly([P(m, t0, z + 1), P(m, t0, top), P(s0 + len * 0.05, t0, z + 1)], 'paper', e.inks.detail);
  } else {
    // A launch with a little cabin.
    const c = BOAT.cabinPx;
    e.poly(
      [
        P(s0 + len * 0.15, t0 + hb * 0.6, z),
        P(m, t0 + hb * 0.6, z),
        P(m, t0 + hb * 0.6, z + c),
        P(s0 + len * 0.15, t0 + hb * 0.6, z + c),
      ],
      'light',
      e.inks.detail,
    );
    e.poly(
      [
        P(s0 + len * 0.15, t0 - hb * 0.6, z + c),
        P(m, t0 - hb * 0.6, z + c),
        P(m, t0 + hb * 0.6, z + c),
        P(s0 + len * 0.15, t0 + hb * 0.6, z + c),
      ],
      'paper',
      e.inks.detail,
    );
  }
}

/** Piers out from street ends that meet open water (not a bridge), in any direction. */
function piers(e: Engraver, map: CityMap, range: TileRange): void {
  const n = map.tiles;
  const geo = map.geo;
  const water = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < n && y < n && geo.water[y * n + x] === 1;
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!geo.street[y * n + x]) continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        // Only along the street's own direction, onto open water.
        const onLine = dx !== 0 ? y % CITY_LAYOUT.block === 0 : x % CITY_LAYOUT.block === 0;
        if (!onLine || !water(x + dx, y + dy) || geo.bridge[(y + dy) * n + x + dx]) continue;
        let run = 0;
        while (run < PIER.minWater && water(x + dx * (run + 1), y + dy * (run + 1))) run += 1;
        if (run >= PIER.minWater) pier(e, x, y, dx, dy, water);
      }
    }
  }
}

function pier(
  e: Engraver,
  x: number,
  y: number,
  dx: number,
  dy: number,
  water: (x: number, y: number) => boolean,
): void {
  const rng = artRng(x * 7919 + y * 31 + dx * 3 + dy);
  let len = rng.range(PIER.len[0], PIER.len[1]);
  for (let k = 1; k <= Math.ceil(len); k++)
    if (!water(x + dx * k, y + dy * k)) len = Math.min(len, k - 1);
  if (len <= 0.3) return;
  // Local frame: s runs out from the tile edge, t across the pier.
  const along: 1 | 2 = dx !== 0 ? 1 : 2;
  const sign = dx + dy;
  const edge = sign > 0 ? 1 : 0;
  const a0 = 0.5 - PIER.width / 2;
  const a1 = 0.5 + PIER.width / 2;
  const z = PIER.deck;
  e.origin(x, y);
  const P = (s: number, t: number, zz: number) => framePt(along, edge + sign * s, t, zz);
  if (e.lod > 0) {
    const posts: [Vec3, Vec3][] = [];
    for (let s = 0.3; s < len; s += 0.4) {
      posts.push(
        [P(s, a0, z), P(s, a0, -BRIDGE.waterPx)],
        [P(s, a1, z), P(s, a1, -BRIDGE.waterPx)],
      );
    }
    e.segments(posts, e.inks.detail);
  }
  e.poly([P(0, a0, z), P(0, a1, z), P(len, a1, z), P(len, a0, z)], 'paper', e.inks.detail);
}
