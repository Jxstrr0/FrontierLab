// The tint underprint on the ground (ART_DIRECTION §2.1): a see-through wash of
// the city's tint over park lawns, the gravel paths that cross each park block
// to its middle tile, and that tile's paved round or pond (parkFurniture.ts).
// Runs as a ground step after the stipple and before the water, laid out in
// world space so neighbouring chunks continue each other exactly.
import type { Rect } from './chunkGrid';
import { TILE_KINDS, type CityMap } from './citygen';
import { tileRangeForRect } from './drawList';
import type { Engraver } from './engraver';
import { featureFor, featureGround } from './parkFurniture';

/** Path width as a share of a tile, and the opacity of its edge lines. */
const PATH = { width: 0.16, edgeAlpha: 0.4 } as const;
/** World px along one tile edge on screen (√(32² + 16²)). */
const EDGE_PX = 35.78;

const KIND_PARK = TILE_KINDS.indexOf('park');

/** True when a park tile has park on all four sides: a block's middle tile. */
export function isParkMiddle(map: CityMap, x: number, y: number): boolean {
  const n = map.tiles;
  const park = (i: number, j: number) =>
    i >= 0 && j >= 0 && i < n && j < n && map.kind[j * n + i] === KIND_PARK;
  return park(x, y) && park(x - 1, y) && park(x + 1, y) && park(x, y - 1) && park(x, y + 1);
}

export function tintLayer(e: Engraver, map: CityMap, r: Rect): void {
  const n = map.tiles;
  const range = tileRangeForRect(n, r);
  if (!range) return;
  const c = e.ctx;
  const lawns: [number, number][] = [];
  const paths: [number, number, number, number][] = [];
  const middles: [number, number][] = [];
  for (let y = range.y0; y <= range.y1; y++) {
    for (let x = range.x0; x <= range.x1; x++) {
      if (map.kind[y * n + x] !== KIND_PARK) continue;
      lawns.push([x, y]);
      if (isParkMiddle(map, x, y)) {
        middles.push([x, y]);
        continue;
      }
      // A tile next to a middle tile carries the path from it out to the street.
      if (isParkMiddle(map, x - 1, y) || isParkMiddle(map, x + 1, y))
        paths.push([x, y + 0.5, x + 1, y + 0.5]);
      if (isParkMiddle(map, x, y - 1) || isParkMiddle(map, x, y + 1))
        paths.push([x + 0.5, y, x + 0.5, y + 1]);
    }
  }
  if (lawns.length === 0) return;
  e.origin(0, 0);
  c.beginPath();
  for (const [x, y] of lawns) {
    e.m(x, y, 0);
    e.l(x + 1, y, 0);
    e.l(x + 1, y + 1, 0);
    e.l(x, y + 1, 0);
    c.closePath();
  }
  c.fillStyle = e.inks.lawn;
  c.fill();
  // Paths through the middle tiles too: half-way to each neighbour.
  for (const [x, y] of middles) {
    paths.push([x, y + 0.5, x + 1, y + 0.5], [x + 0.5, y, x + 0.5, y + 1]);
  }
  if (paths.length > 0) {
    const w = PATH.width * EDGE_PX;
    c.beginPath();
    for (const [a0, b0, a1, b1] of paths) {
      e.m(a0, b0, 0);
      e.l(a1, b1, 0);
    }
    c.lineCap = 'butt';
    c.lineWidth = w + e.inks.detail * 2;
    c.strokeStyle = e.inks.inkA(PATH.edgeAlpha);
    c.stroke();
    c.lineWidth = w;
    c.strokeStyle = e.inks.paper;
    c.stroke();
    c.lineCap = 'round';
  }
  for (const [x, y] of middles) {
    e.origin(x, y);
    featureGround(e, featureFor(map.seed[y * n + x]!));
  }
}
