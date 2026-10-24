import { describe, expect, it } from 'vitest';
import { makeChunkGrid, chunkRect, rectsOverlap } from '../../src/art/chunkGrid';
import { generateCityMap, tileAt } from '../../src/art/citygen';
import {
  footprintBounds,
  itemsInRect,
  maxItemHeight,
  orderKey,
  tileBounds,
  tileHeightPx,
  tileRangeForRect,
} from '../../src/art/drawList';
import { tileTop, worldSize } from '../../src/art/iso';
import { CITIES } from '../../src/data/cities';
import { newGame } from '../../src/sim/newGame';
import { FLAG_PX, LANDMARK_MAX_PX, ROOF_EXTRA_STOREYS, STOREY_PX } from '../../src/config/map';

function mapFor(cityId: string, seed = 42) {
  const s = newGame({ seed, cityId });
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  return generateCityMap(CITIES[cityId]!, seed, lots);
}

const sas = mapFor('sas');

/** Every raised thing on the map, by brute force. */
function allItems(map: ReturnType<typeof mapFor>) {
  const out: { key: string; bounds: ReturnType<typeof footprintBounds> }[] = [];
  for (let y = 0; y < map.tiles; y++) {
    for (let x = 0; x < map.tiles; x++) {
      const h = tileHeightPx(map, y * map.tiles + x);
      if (h > 0) out.push({ key: `t${x},${y}`, bounds: footprintBounds(map.tiles, x, y, 1, h) });
    }
  }
  for (const s of map.landmarks) {
    out.push({
      key: `l${s.id}`,
      bounds: footprintBounds(map.tiles, s.x, s.y, s.size, LANDMARK_MAX_PX),
    });
  }
  return out;
}

describe('draw list', () => {
  it('gives buildings room for roofs, and lots room for a flag', () => {
    for (let i = 0; i < sas.kind.length; i++) {
      const t = tileAt(sas, i % sas.tiles, Math.floor(i / sas.tiles))!;
      const h = tileHeightPx(sas, i);
      if (t.kind === 'street' || t.kind === 'water' || t.kind === 'landmark') expect(h).toBe(0);
      if (t.kind === 'building') expect(h).toBe((t.floors + ROOF_EXTRA_STOREYS) * STOREY_PX);
      if (t.kind === 'lot') expect(h).toBe((t.floors + ROOF_EXTRA_STOREYS) * STOREY_PX + FLAG_PX);
    }
    expect(maxItemHeight(sas)).toBeGreaterThanOrEqual(LANDMARK_MAX_PX);
  });

  it('bounds a tile from its roof down to its diamond and cast shadow', () => {
    const b = footprintBounds(40, 5, 7, 1, 100);
    const top = tileTop(40, 5, 7);
    expect(b.y).toBe(top.y - 100);
    expect(b.x).toBe(top.x - 32);
    expect(b.y + b.h).toBeGreaterThanOrEqual(top.y + 32);
    expect(b.x + b.w).toBeGreaterThan(top.x + 32);
    const lotIndex = [...sas.lotAt.keys()][0]!;
    const lb = tileBounds(sas, lotIndex % sas.tiles, Math.floor(lotIndex / sas.tiles));
    expect(lb.h).toBeGreaterThan(FLAG_PX);
  });

  it('tile ranges cover every tile whose diamond touches a rect', () => {
    const n = sas.tiles;
    const rects = [
      { x: 900, y: 500, w: 256, h: 256 },
      { x: 0, y: 0, w: 300, h: 300 },
      { x: 1200, y: 900, w: 128, h: 64 },
    ];
    for (const r of rects) {
      const range = tileRangeForRect(n, r);
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (!rectsOverlap(footprintBounds(n, x, y, 1, 0.001), r)) continue;
          expect(range).not.toBeNull();
          expect(x >= range!.x0 && x <= range!.x1 && y >= range!.y0 && y <= range!.y1).toBe(true);
        }
      }
    }
  });

  it('puts every overlapping item in each chunk, and nothing else', () => {
    const { width, height } = worldSize(sas.tiles);
    const all = allItems(sas);
    const maxH = maxItemHeight(sas);
    for (const stop of [0.5, 2]) {
      const g = makeChunkGrid(stop, 2, 256, width, height);
      for (let j = 0; j < g.rows; j += 2) {
        for (let i = 0; i < g.cols; i += 2) {
          const rect = chunkRect(g, i, j);
          const got = itemsInRect(sas, rect, maxH).map((it) =>
            it.type === 'tile' ? `t${it.x},${it.y}` : `l${it.site.id}`,
          );
          const want = all.filter((it) => rectsOverlap(it.bounds, rect)).map((it) => it.key);
          expect(got.sort()).toEqual(want.sort());
        }
      }
    }
  });

  it('orders items back to front: higher x + y draws later, landmarks by their front corner', () => {
    const n = 40;
    expect(orderKey(3, 3, 1, n)).toBeLessThan(orderKey(3, 4, 1, n));
    expect(orderKey(3, 3, 1, n)).toBeLessThan(orderKey(4, 3, 1, n));
    // A 3×3 landmark at (5, 5) sorts with its front tile (7, 7).
    expect(orderKey(5, 5, 3, n)).toBeGreaterThan(orderKey(7, 6, 1, n));
    expect(orderKey(5, 5, 3, n)).toBeLessThan(orderKey(7, 8, 1, n));
    const size = worldSize(n);
    const rect = { x: 0, y: 0, w: size.width, h: size.height };
    const items = itemsInRect(sas, rect, maxItemHeight(sas));
    for (let k = 1; k < items.length; k++) {
      expect(items[k]!.order).toBeGreaterThanOrEqual(items[k - 1]!.order);
    }
    // Everything raised appears exactly once in a whole-map query.
    expect(items).toHaveLength(allItems(sas).length);
  });
});
