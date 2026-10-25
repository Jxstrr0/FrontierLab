// Mask passes for layout-2 city geometry (cityGeo.ts): block-aligned islands,
// clearing specks of land and water, distance to the shore, and bridges where
// a street crosses narrow water. Each works in place on plain typed arrays.
import { CITY_LAYOUT } from '../config/balance';
import { GEO, WATER_SHAPES } from '../config/cityGeo';
import type { CityLook } from '../data/cityLooks';
import type { CityGeometry } from './cityGeo';
import { islandShore, toActual, type FormContext } from './waterForms';

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Snaps a tile coordinate to the nearest mid-block line (between two street lines). */
function midBlock(t: number): number {
  const b = CITY_LAYOUT.block;
  const mid = Math.floor(b / 2);
  return b * Math.round((t - mid) / b) + mid;
}

/** The actual grid direction of canonical +v (toward the main water). */
function shoreward(look: CityLook): { dx: number; dy: number } {
  const [ax, ay] = toActual(look, 0.5, 0.5);
  const [bx, by] = toActual(look, 0.5, 1);
  return { dx: Math.round(bx - ax) * 2, dy: Math.round(by - ay) * 2 };
}

/** Raises built-up islands, whole blocks with their streets, just off the bay shore. */
export function carveIslands(geo: CityGeometry, look: CityLook, ctx: FormContext): void {
  const n = geo.tiles;
  const b = CITY_LAYOUT.block;
  const s = WATER_SHAPES.islands;
  const span = s.islandBlocks * b;
  const top = b * Math.floor((n - 1 - span) / b);
  const snap = (t: number) =>
    Math.max(b, Math.min(top, b * Math.round((t * n) / b - s.islandBlocks / 2)));
  for (const u of s.islands) {
    const v = islandShore(u, ctx) + (GEO.islandGap + span / 2) / n;
    const [ax, ay] = toActual(look, u, v);
    const x0 = snap(ax);
    const y0 = snap(ay);
    for (let y = y0; y <= y0 + span; y++) {
      for (let x = x0; x <= x0 + span; x++) geo.water[y * n + x] = 0;
    }
  }
}

/**
 * Canal belts: U-shaped rings one tile wide along mid-block lines, open toward
 * the river mouth, so every street crossing gets a little bridge and every
 * block still faces a street.
 */
export function carveCanals(geo: CityGeometry, look: CityLook): void {
  const n = geo.tiles;
  const s = WATER_SHAPES.canals;
  const [cu, cv] = toActual(look, 0.5, s.mouth);
  const c = { x: cu * n, y: cv * n };
  const dir = shoreward(look);
  const set = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < n && y < n) geo.water[y * n + x] = 1;
  };
  for (const r of s.rings) {
    const R = r * n;
    // Coordinates along the mouth axis (m) and across it (p).
    const alongX = dir.dx !== 0;
    const sign = alongX ? Math.sign(dir.dx) : Math.sign(dir.dy);
    const cm = alongX ? c.x : c.y;
    const cp = alongX ? c.y : c.x;
    const back = midBlock(cm - sign * R);
    const p0 = midBlock(cp - R);
    const p1 = midBlock(cp + R);
    const put = (m: number, p: number) => (alongX ? set(m, p) : set(p, m));
    for (let p = p0; p <= p1; p++) put(back, p);
    for (let m = back; m >= 0 && m < n; m += sign) {
      put(m, p0);
      put(m, p1);
    }
  }
}

/** Labels 4-connected regions of one kind; returns each tile's region and region sizes. */
function regions(geo: CityGeometry): { label: Int32Array; sizes: number[] } {
  const n = geo.tiles;
  const label = new Int32Array(n * n).fill(-1);
  const sizes: number[] = [];
  const queue: number[] = [];
  for (let start = 0; start < n * n; start++) {
    if (label[start] !== -1) continue;
    const kind = geo.water[start];
    const id = sizes.length;
    let size = 0;
    label[start] = id;
    queue.length = 0;
    queue.push(start);
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q]!;
      size += 1;
      const x = i % n;
      const y = (i - x) / n;
      for (const [dx, dy] of NEIGHBOURS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
        const j = ny * n + nx;
        if (label[j] === -1 && geo.water[j] === kind) {
          label[j] = id;
          queue.push(j);
        }
      }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

/** Tiny land pockets become water and tiny ponds become land, so shores read cleanly. */
export function cleanSpecks(geo: CityGeometry): void {
  const { label, sizes } = regions(geo);
  for (let i = 0; i < geo.water.length; i++) {
    const size = sizes[label[i]!]!;
    if (geo.water[i] && size < GEO.minWater) geo.water[i] = 0;
    else if (!geo.water[i] && size < GEO.minLand) geo.water[i] = 1;
  }
}

/** Steps (4-connected) to the nearest tile of the other kind, 1 beside the shore; 255 if none. */
export function distanceToShore(geo: CityGeometry): Uint8Array {
  const n = geo.tiles;
  const dist = new Uint8Array(n * n).fill(255);
  const queue: number[] = [];
  for (let i = 0; i < n * n; i++) {
    const x = i % n;
    const y = (i - x) / n;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      if (geo.water[ny * n + nx] !== geo.water[i]) {
        dist[i] = 1;
        queue.push(i);
        break;
      }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const x = i % n;
    const y = (i - x) / n;
    const d = dist[i]!;
    if (d >= 254) continue;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const j = ny * n + nx;
      if (dist[j] === 255 && geo.water[j] === geo.water[i]) {
        dist[j] = d + 1;
        queue.push(j);
      }
    }
  }
  return dist;
}

/**
 * Bridges: a street line crossing a run of water no longer than GEO.bridgeMax,
 * with street on both banks. Short runs (canals) are bridged on every street,
 * longer ones on every GEO.bridgeEvery-th line.
 */
export function markBridges(geo: CityGeometry): void {
  const n = geo.tiles;
  const b = CITY_LAYOUT.block;
  for (let line = 0; line < n; line += b) {
    const every = (line / b) % GEO.bridgeEvery === 0;
    // Rows (deck along x) then columns (deck along y).
    for (const along of [1, 2] as const) {
      const at = (t: number) => (along === 1 ? line * n + t : t * n + line);
      let t = 0;
      while (t < n) {
        if (!geo.water[at(t)]) {
          t += 1;
          continue;
        }
        let end = t;
        while (end + 1 < n && geo.water[at(end + 1)]) end += 1;
        const len = end - t + 1;
        const banks = t > 0 && end + 1 < n && geo.street[at(t - 1)] && geo.street[at(end + 1)];
        const ok = banks && len <= GEO.bridgeMax && (len <= GEO.shortBridge || every);
        if (ok && crossesWater(geo, line, t, end, along)) {
          for (let k = t; k <= end; k++) geo.bridge[at(k)] = geo.bridge[at(k)]! | along;
        }
        t = end + 1;
      }
    }
  }
}

/**
 * Whether a run of water along a street line crosses the water rather than
 * running beside a bank: the water continues on both sides of the run's middle.
 */
function crossesWater(
  geo: CityGeometry,
  line: number,
  from: number,
  to: number,
  along: 1 | 2,
): boolean {
  const n = geo.tiles;
  const wet = (t: number, side: number) => {
    const [x, y] = along === 1 ? [t, line + side] : [line + side, t];
    return x >= 0 && y >= 0 && x < n && y < n && geo.water[y * n + x] === 1;
  };
  for (let t = from + 1; t < to; t++) if (!wet(t, -1) || !wet(t, 1)) return false;
  return from === to ? wet(from, -1) && wet(from, 1) : true;
}
