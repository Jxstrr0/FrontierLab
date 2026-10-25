// Layout-2 street life drawn as raised items (ART_DIRECTION §2): small lollipop
// trees lining avenue kerbs and a fountain in the middle of each plaza. Plaza
// paving is flat and drawn by ground.ts. Heights stay within AVENUE_TREE_PX and
// FOUNTAIN_PX (config/map.ts) so drawList bounds them.
import { CITY_LAYOUT } from '../config/balance';
import { AVENUE_TREE_PX, FOUNTAIN_PX } from '../config/map';
import { KIND } from './cityBlocks';
import { DECOR } from './cityDecor';
import type { CityMap } from './citygen';
import type { Engraver } from './engraver';
import { tree } from './flora';
import { artRng } from './prng';

/** Visual tuning, in tiles and world px. */
const LIFE = {
  /** Trees stand this far in from each kerb, at these spots along the street. */
  kerb: 0.11,
  spots: [0.3, 0.8],
  treeSize: 0.55,
  basinR: 0.42,
  rimPx: 2.2,
  innerR: 0.16,
  jetPx: FOUNTAIN_PX - 3,
} as const;

/** Extra height a tile's street life reaches (0 when it has none), for drawList bounds. */
export function streetLifeHeight(map: CityMap, index: number): number | undefined {
  const d = map.decor[index]!;
  if (!d) return undefined;
  const kind = map.kind[index];
  if (kind === KIND.street && d & DECOR.avenue) return AVENUE_TREE_PX;
  if (kind === KIND.park && d & DECOR.plaza) return d & DECOR.fountain ? FOUNTAIN_PX : 0;
  return undefined;
}

/** Draws a tile's street life; returns false when the tile has none to draw. */
export function drawStreetLife(e: Engraver, map: CityMap, x: number, y: number): boolean {
  const i = y * map.tiles + x;
  const d = map.decor[i]!;
  if (!d) return false;
  const kind = map.kind[i];
  if (kind === KIND.street && d & DECOR.avenue) {
    avenueTrees(e, x, y, map.seed[i]!);
    return true;
  }
  if (kind === KIND.park && d & DECOR.plaza) {
    if (d & DECOR.fountain) fountain(e, x, y);
    return true;
  }
  return false;
}

function avenueTrees(e: Engraver, x: number, y: number, seed: number): void {
  const rng = artRng(seed);
  // A column street (along y) has kerbs at a = kerb and 1 − kerb; a row street at b.
  const column = x % CITY_LAYOUT.block === 0;
  e.origin(x, y);
  const spots: [number, number][] = [];
  for (const along of LIFE.spots) {
    for (const across of [LIFE.kerb, 1 - LIFE.kerb]) {
      spots.push(column ? [across, along] : [along, across]);
    }
  }
  spots.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
  for (const [a, b] of spots) tree(e, a, b, LIFE.treeSize * rng.range(0.9, 1.1), rng);
}

function fountain(e: Engraver, x: number, y: number): void {
  e.origin(x, y);
  e.flatCircle(0.5, 0.5, 0, LIFE.basinR, 'light', true);
  e.flatCircle(0.5, 0.5, LIFE.rimPx, LIFE.basinR, 'paper', true);
  // The pool: the water tint inside the rim.
  const p = e.pt(0.5, 0.5, LIFE.rimPx);
  const rx = LIFE.basinR * 0.78 * Math.SQRT2 * (e.pt(1, 0, 0).x - e.pt(0, 0, 0).x);
  e.ctx.beginPath();
  e.ctx.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI * 2);
  e.ctx.fillStyle = e.inks.waterPrint;
  e.ctx.fill();
  e.flatCircle(0.5, 0.5, LIFE.rimPx + 2, LIFE.innerR, 'paper', true);
  if (e.lod === 0) return;
  // A jet of water: a thin column and falling arcs drawn as fine strokes.
  const top = LIFE.rimPx + LIFE.jetPx;
  const arcs: [readonly [number, number, number], readonly [number, number, number]][] = [];
  for (const [da, db] of [
    [0.22, 0],
    [-0.22, 0],
    [0, 0.22],
    [0, -0.22],
  ] as const) {
    arcs.push([
      [0.5, 0.5, top],
      [0.5 + da, 0.5 + db, LIFE.rimPx + 1],
    ]);
  }
  e.segments(
    [
      [
        [0.5, 0.5, LIFE.rimPx + 2],
        [0.5, 0.5, top],
      ],
      ...arcs,
    ],
    e.inks.detail,
    0.7,
  );
}
