// What hides a moving thing (ART_DIRECTION §2.3). The city is drawn once into
// cached chunks and city life is painted over it, so a car behind a tower has
// to be left out by hand. Each tile gets the height of what stands on it; a
// point is hidden when something in front reaches above it on screen. Looking
// "in front" is a walk along +x+y in tile space: one tile along both axes moves
// a ground point TILE_H world px down the screen, so a building there hides it
// if it is taller than that.
import { LANDMARK_MAX_PX, STOREY_PX, TILE_H } from '../config/map';
import { KIND } from './cityBlocks';
import type { CityMap } from './citygen';
import { landmarkHeightPx } from './drawList';

/** Inset of a building's footprint within its tile, and the walk's step (tiles). */
const INSET = 0.12;
const STEP = 0.16;
/** Parks hide what is behind their trees, up to about this height (px). */
const PARK_PX = 9;
/** Landmarks are often open (wheels, masts): count this share of their height. */
const LANDMARK_SHARE = 0.55;
/** Lots and offices carry at least two storeys and a roof (buildings.ts). */
const ROOF_STOREYS = 0.6;

export interface Occlusion {
  /** True when a point at tile (x, y), z world px above the ground, is behind something. */
  hidden(x: number, y: number, z: number): boolean;
}

export function buildOcclusion(map: CityMap): Occlusion {
  const n = map.tiles;
  const h = new Float32Array(n * n);
  let max = 0;
  for (let i = 0; i < n * n; i++) {
    const k = map.kind[i];
    let px = 0;
    if (k === KIND.building || k === KIND.lot || k === KIND.office || k === KIND.site) {
      const floors = k === KIND.building ? map.floors[i]! : Math.max(2, map.floors[i]!);
      px = (floors + ROOF_STOREYS) * STOREY_PX;
    } else if (k === KIND.park) px = PARK_PX;
    h[i] = px;
    max = Math.max(max, px);
  }
  for (const site of map.landmarks) {
    const px = Math.min(LANDMARK_MAX_PX, landmarkHeightPx(site)) * LANDMARK_SHARE;
    for (let y = site.y; y < site.y + site.size && y < n; y++)
      for (let x = site.x; x < site.x + site.size && x < n; x++) h[y * n + x] = px;
    max = Math.max(max, px);
  }
  return {
    hidden(x, y, z) {
      const own = Math.floor(x) + Math.floor(y) * n;
      const limit = (max - z) / TILE_H;
      for (let t = STEP; t <= limit; t += STEP) {
        const ax = x + t;
        const ay = y + t;
        const ix = Math.floor(ax);
        const iy = Math.floor(ay);
        if (ix >= n || iy >= n) return false;
        const i = iy * n + ix;
        if (i === own || h[i]! <= z + t * TILE_H) continue;
        const fx = ax - ix;
        const fy = ay - iy;
        if (fx > INSET && fx < 1 - INSET && fy > INSET && fy < 1 - INSET) return true;
      }
      return false;
    },
  };
}
