// The flat layer of the engraved map (ART_DIRECTION §2): sage paper with a faint
// guilloche wave mesh (printPatterns.ts), kerbs and dashed street centrelines, park stipple, the
// tinted water with wavy guilloche lines, quay walls and piers, and the
// microprint ring around the city. Everything is laid out in world space, so
// neighbouring chunks continue each other's lines exactly.
import { CITY_LAYOUT } from '../config/balance';
import type { Rect } from './chunkGrid';
import { TILE_KINDS, type CityMap } from './citygen';
import { tileRangeForRect } from './drawList';
import type { Engraver } from './engraver';
import { stipple } from './flora';
import { artRng, mixSeed } from './prng';
import { waterLayer } from './water';

/** Visual tuning for the ground layer (CSS px are at the chunk's zoom stop). */
const GROUND = {
  kerbAlpha: 0.45,
  dashAlpha: 0.3,
  dashesPerTile: 4,
  /** World px along one tile edge (√(32² + 16²)). */
  edgePx: 35.78,
  ringTiles: 0.9,
  ringGapTiles: 0.32,
  ringFontPx: 4.6,
  ringAlpha: 0.7,
} as const;

const K = Object.fromEntries(TILE_KINDS.map((k, i) => [k, i])) as Record<
  (typeof TILE_KINDS)[number],
  number
>;

export type GroundStep = 'paper' | 'tiles' | 'water' | 'ring';
export const GROUND_STEPS: readonly GroundStep[] = ['paper', 'tiles', 'water', 'ring'];

export function drawGround(
  e: Engraver,
  map: CityMap,
  rect: Rect,
  step: GroundStep,
  cityName: string,
): void {
  if (step === 'paper') paper(e, rect);
  else if (step === 'tiles') tiles(e, map, rect);
  else if (step === 'water') waterLayer(e, map, rect);
  else ring(e, map, rect, cityName);
}

function paper(e: Engraver, r: Rect): void {
  e.ctx.fillStyle = e.inks.paperPrint;
  e.ctx.fillRect(r.x, r.y, r.w, r.h);
}

function tiles(e: Engraver, map: CityMap, r: Rect): void {
  const n = map.tiles;
  const range = tileRangeForRect(n, r);
  if (!range) return;
  const block = CITY_LAYOUT.block;
  const kind = (x: number, y: number) =>
    x < 0 || y < 0 || x >= n || y >= n ? -1 : map.kind[y * n + x]!;
  const kerbs: [number, number, number, number][] = [];
  const dashes: [number, number, number, number][] = [];
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      const k = kind(x, y);
      if (k === K.street) {
        const col = x % block === 0;
        const row = y % block === 0;
        if (col && !row) dashes.push([x + 0.5, y, x + 0.5, y + 1]);
        else if (row && !col) dashes.push([x, y + 0.5, x + 1, y + 0.5]);
        continue;
      }
      if (k === K.water) continue;
      if (k === K.park) {
        e.origin(x, y);
        stipple(e, [0.04, 0.04, 0.96, 0.96], artRng(mixSeed(map.seed[y * n + x]!, 7)), 1.4);
      }
      // Kerbs: edges where this block meets a street.
      if (kind(x, y - 1) === K.street) kerbs.push([x, y, x + 1, y]);
      if (kind(x - 1, y) === K.street) kerbs.push([x, y, x, y + 1]);
      if (kind(x + 1, y) === K.street) kerbs.push([x + 1, y, x + 1, y + 1]);
      if (kind(x, y + 1) === K.street) kerbs.push([x, y + 1, x + 1, y + 1]);
    }
  }
  const c = e.ctx;
  e.origin(0, 0);
  const strokeAll = (segs: [number, number, number, number][]) => {
    c.beginPath();
    for (const [a0, b0, a1, b1] of segs) {
      e.m(a0, b0, 0);
      e.l(a1, b1, 0);
    }
    c.stroke();
  };
  c.lineWidth = e.inks.detail;
  c.strokeStyle = e.inks.inkA(GROUND.kerbAlpha);
  strokeAll(kerbs);
  const period = GROUND.edgePx / GROUND.dashesPerTile;
  c.setLineDash([period * 0.55, period * 0.45]);
  c.lineDashOffset = -period * 0.225;
  c.strokeStyle = e.inks.inkA(GROUND.dashAlpha);
  strokeAll(dashes);
  c.setLineDash([]);
}

/** The microprint ring: two rules around the city with its name between them. */
function ring(e: Engraver, map: CityMap, r: Rect, cityName: string): void {
  const n = map.tiles;
  const c = e.ctx;
  const d0 = GROUND.ringTiles;
  const d1 = d0 + GROUND.ringGapTiles;
  e.origin(0, 0);
  const pt = (t: number, d: number) => {
    const corners: [number, number][] = [
      [-d, -d],
      [n + d, -d],
      [n + d, n + d],
      [-d, n + d],
    ];
    const p = corners[t % 4]!;
    return e.pt(p[0], p[1], 0);
  };
  const outer = [0, 1, 2, 3].map((t) => pt(t, d1));
  const minX = Math.min(...outer.map((p) => p.x));
  const maxX = Math.max(...outer.map((p) => p.x));
  const minY = Math.min(...outer.map((p) => p.y));
  const maxY = Math.max(...outer.map((p) => p.y));
  // Skip chunks entirely inside the ring's inner diamond or outside its box.
  if (r.x > maxX || r.x + r.w < minX || r.y > maxY || r.y + r.h < minY) return;
  c.beginPath();
  for (const d of [d0, d1]) {
    for (let t = 0; t <= 4; t++) {
      const p = pt(t, d);
      if (t === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
  }
  c.lineWidth = e.inks.detail;
  c.strokeStyle = e.inks.inkA(GROUND.ringAlpha);
  c.stroke();
  // Name text runs left to right along each edge, centred between the rules.
  const mid = (d0 + d1) / 2;
  const unit = `${cityName.toUpperCase()} · `;
  c.font = `600 ${GROUND.ringFontPx}px "Public Sans", system-ui, sans-serif`;
  c.textBaseline = 'middle';
  c.fillStyle = e.inks.inkA(GROUND.ringAlpha);
  const unitW = c.measureText(unit).width;
  // Edges as [from corner, to corner], each drawn from its left end.
  const edges: [number, number][] = [
    [0, 1],
    [3, 2],
    [3, 0],
    [2, 1],
  ];
  for (const [fa, fb] of edges) {
    const p = pt(fa, mid);
    const q = pt(fb, mid);
    const [from, to] = p.x <= q.x ? [p, q] : [q, p];
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const pad = GROUND.ringFontPx;
    if (
      Math.max(from.x, to.x) + pad < r.x ||
      Math.min(from.x, to.x) - pad > r.x + r.w ||
      Math.max(from.y, to.y) + pad < r.y ||
      Math.min(from.y, to.y) - pad > r.y + r.h
    ) {
      continue;
    }
    const reps = Math.floor(len / unitW);
    c.save();
    c.translate(from.x, from.y);
    c.rotate(Math.atan2(to.y - from.y, to.x - from.x));
    c.fillText(unit.repeat(reps), (len - reps * unitW) / 2, 0);
    c.restore();
  }
}
