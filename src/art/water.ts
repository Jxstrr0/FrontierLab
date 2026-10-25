// Water for the engraved map (ART_DIRECTION §2): a pale tint of the city ink
// with horizontal wavy guilloche lines at 50% ink (printPatterns.ts), a hatched quay wall where
// land meets water, a dotted promenade rail and piers at street ends. Works on
// any water shape; layout 2 adds bridges, piers in every direction and boats
// (bridges.ts).
import { CITY_LAYOUT } from '../config/balance';
import type { Rect } from './chunkGrid';
import { drawWaterLife } from './bridges';
import { TILE_KINDS, type CityMap } from './citygen';
import { tileRangeForRect } from './drawList';
import type { Engraver, Vec3 } from './engraver';
import { artRng } from './prng';

/** Visual tuning for water (CSS px are at the chunk's zoom stop). */
const WATER = {
  quayPx: 4,
  railInset: 0.07,
  pierLen: [1.2, 2.2],
  pierWidth: 0.34,
  pierDeck: 1.5,
  /** Piers reach this many tiles beyond their tile; widen chunk queries by it. */
  reachTiles: 3,
  waterlineAlpha: 0.85,
} as const;

const KIND_WATER = TILE_KINDS.indexOf('water');
const KIND_STREET = TILE_KINDS.indexOf('street');

export function waterLayer(e: Engraver, map: CityMap, r: Rect): void {
  const n = map.tiles;
  const pad = WATER.reachTiles * 32;
  const range = tileRangeForRect(n, {
    x: r.x - pad,
    y: r.y - pad,
    w: r.w + 2 * pad,
    h: r.h + 2 * pad,
  });
  if (!range) return;
  const isWater = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < n && y < n && map.kind[y * n + x] === KIND_WATER;
  const c = e.ctx;
  e.origin(0, 0);
  // Region path of every water tile in range.
  c.beginPath();
  let any = false;
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (!isWater(x, y)) continue;
      any = true;
      e.m(x, y, 0);
      e.l(x + 1, y, 0);
      e.l(x + 1, y + 1, 0);
      e.l(x, y + 1, 0);
      c.closePath();
    }
  }
  if (!any) return;
  c.fillStyle = e.inks.waterPrint;
  c.fill();
  shore(e, map, range, isWater);
  if (map.layout > 1) drawWaterLife(e, map, range);
}

function shore(
  e: Engraver,
  map: CityMap,
  range: { x0: number; y0: number; x1: number; y1: number },
  isWater: (x: number, y: number) => boolean,
): void {
  const n = map.tiles;
  const q = WATER.quayPx;
  const ri = WATER.railInset;
  const rails: [Vec3, Vec3][] = [];
  // Layout 2: a firm ink waterline all round, so rivers and canals read at a glance.
  const waterline: [Vec3, Vec3][] = [];
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (isWater(x, y)) continue;
      e.origin(x, y);
      const front = isWater(x, y + 1);
      const right = isWater(x + 1, y);
      if (map.layout > 1) {
        if (front)
          waterline.push([
            [x, y + 1, -q],
            [x + 1, y + 1, -q],
          ]);
        if (right)
          waterline.push([
            [x + 1, y, -q],
            [x + 1, y + 1, -q],
          ]);
        if (isWater(x, y - 1))
          waterline.push([
            [x, y, 0],
            [x + 1, y, 0],
          ]);
        if (isWater(x - 1, y))
          waterline.push([
            [x, y, 0],
            [x, y + 1, 0],
          ]);
      }
      if (front) {
        e.poly(
          [
            [0, 1, 0],
            [1, 1, 0],
            [1, 1, -q],
            [0, 1, -q],
          ],
          'light',
          e.inks.detail,
        );
        rails.push([
          [x, y + 1 - ri, 0],
          [x + 1, y + 1 - ri, 0],
        ]);
      }
      if (right) {
        e.poly(
          [
            [1, 1, 0],
            [1, 0, 0],
            [1, 0, -q],
            [1, 1, -q],
          ],
          'medium',
          e.inks.detail,
        );
        rails.push([
          [x + 1 - ri, y, 0],
          [x + 1 - ri, y + 1, 0],
        ]);
      }
      // Layout 1: a pier runs out from each street that ends at the water.
      const street = map.kind[y * n + x] === KIND_STREET;
      if (map.layout === 1 && front && street && x % CITY_LAYOUT.block === 0) {
        pier(e, x, y, isWater);
      }
    }
  }
  e.origin(0, 0);
  e.segments(waterline, e.inks.outline, WATER.waterlineAlpha);
  if (e.lod > 0) {
    e.ctx.setLineDash([1.2, 1.6]);
    e.segments(rails, e.inks.detail * 1.2, 0.6);
    e.ctx.setLineDash([]);
  }
}

function pier(e: Engraver, x: number, y: number, isWater: (x: number, y: number) => boolean): void {
  const rng = artRng(x * 7919 + y);
  let len = rng.range(WATER.pierLen[0], WATER.pierLen[1]);
  // Stop short of the map edge or any land.
  for (let k = 1; k <= Math.ceil(len); k++) if (!isWater(x, y + k)) len = Math.min(len, k - 1);
  if (len <= 0.3) return;
  const a0 = 0.5 - WATER.pierWidth / 2;
  const a1 = 0.5 + WATER.pierWidth / 2;
  const z = WATER.pierDeck;
  e.origin(x, y + 1);
  if (e.lod > 0) {
    const posts: [Vec3, Vec3][] = [];
    for (let b = 0.3; b < len; b += 0.4) {
      posts.push([
        [a0, b, z],
        [a0, b, -WATER.quayPx],
      ]);
      posts.push([
        [a1, b, z],
        [a1, b, -WATER.quayPx],
      ]);
    }
    e.segments(posts, e.inks.detail);
  }
  e.poly(
    [
      [a0, 0, z],
      [a1, 0, z],
      [a1, len, z],
      [a0, len, z],
    ],
    'paper',
    e.inks.detail,
  );
  e.poly(
    [
      [a0, len, z],
      [a1, len, z],
      [a1, len, z - 2],
      [a0, len, z - 2],
    ],
    'light',
    e.inks.detail,
  );
  if (e.lod === 2) {
    const planks: [Vec3, Vec3][] = [];
    for (let b = 0.1; b < len; b += 0.1)
      planks.push([
        [a0, b, z],
        [a1, b, z],
      ]);
    e.segments(planks, e.inks.detail * 0.6, 0.5);
  }
}
