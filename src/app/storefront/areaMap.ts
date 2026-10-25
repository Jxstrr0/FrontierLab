// Area map view model for the storefront panel (SCREENS §3: "a mini district
// map with this lot highlighted"). A window of the city around one lot,
// projected 2:1 isometric like the main map (ART_DIRECTION §2) into a 16:9 box:
// tiles sorted into layers (buildings by district, open lots, parks, water,
// landmarks), branch dots for you and your rivals, the RIVAL_RADIUS ring the
// "Nearby competition" count uses, and district labels. Pure: reads state and
// a tile grid, returns plain data; AreaMiniMap.tsx draws it.
import { TILE_KINDS } from '../../art/citygen';
import { RIVAL_RADIUS } from '../../config/balance';
import { DISTRICT_SPECS } from '../../data/districts';
import { DISTRICTS, type DistrictId } from '../../data/types';
import type { GameState, Lot } from '../../sim/state';

/** The drawing box (same 16:9 plate as the hero vignettes) and the tile size in it. */
export const AREA_BOX = { w: 320, h: 180 } as const;
const TILE_W = 16;
const TILE_H = TILE_W / 2;
/** A district is labelled when this many of its tiles show in the window. */
const LABEL_MIN_TILES = 24;
/** Labels stay this far from the highlighted lot so they never cover it. */
const LABEL_CLEAR = 26;

/** The tile grid of a generated city (CityMap from src/art/citygen.ts fits this). */
export interface AreaGrid {
  tiles: number;
  /** Index into TILE_KINDS, per tile (y × tiles + x). */
  kind: ArrayLike<number>;
  /** Index into DISTRICTS, per tile. */
  district: ArrayLike<number>;
}

export type AreaLayer = DistrictId | 'open' | 'park' | 'water' | 'landmark';

export interface AreaDot {
  x: number;
  y: number;
  kind: 'own' | 'rival';
  ink: string;
}

export interface AreaLabel {
  x: number;
  y: number;
  text: string;
}

export interface AreaMapModel {
  /** Tile centres per layer, in AREA_BOX units. */
  layers: Partial<Record<AreaLayer, [number, number][]>>;
  dots: AreaDot[];
  labels: AreaLabel[];
  /** The highlighted lot, always the centre of the box. */
  centre: { x: number; y: number };
  /** Half-size of one tile diamond. */
  half: { w: number; h: number };
  /** The competition radius as an ellipse (a circle in tile space, seen in 2:1 iso). */
  ring: { rx: number; ry: number; tiles: number };
}

/** Where a tile offset from the lot lands in the box. */
function project(dx: number, dy: number): [number, number] {
  return [AREA_BOX.w / 2 + ((dx - dy) * TILE_W) / 2, AREA_BOX.h / 2 + ((dx + dy) * TILE_H) / 2];
}

const inBox = (x: number, y: number) =>
  x > -TILE_W / 2 && x < AREA_BOX.w + TILE_W / 2 && y > -TILE_H / 2 && y < AREA_BOX.h + TILE_H / 2;

/** Which layer a tile draws in; streets (and anything unknown) stay bare paper. */
function layerOf(kind: string, district: DistrictId, occupied: boolean): AreaLayer | undefined {
  switch (kind) {
    case 'water':
    case 'park':
    case 'landmark':
      return kind;
    case 'lot':
      return occupied ? district : 'open';
    case 'building':
    case 'office':
    case 'site':
      return district;
    default:
      return undefined;
  }
}

/** The ink of a lot's occupant, or undefined when it shows no dot. */
function occupantDot(s: GameState, lot: Lot): AreaDot['kind'] | undefined {
  const occ = lot.occupant;
  if (!occ) return undefined;
  if (occ.type === 'rival') return s.rivals[occ.id] ? 'rival' : undefined;
  const own = s.branches[occ.id];
  return own && own.status !== 'closed' ? 'own' : undefined;
}

export function areaMapModel(s: GameState, lot: Lot, grid: AreaGrid): AreaMapModel {
  const n = grid.tiles;
  // Furthest tile offset that can still reach the box.
  const reach = Math.ceil(AREA_BOX.w / TILE_W + AREA_BOX.h / TILE_H / 2) + 1;
  const cityLots = Object.values(s.world.lots).filter((l) => l.cityId === lot.cityId);
  const lotByTile = new Map(cityLots.map((l) => [l.tile.y * n + l.tile.x, l]));

  const layers: AreaMapModel['layers'] = {};
  const sums = new Map<DistrictId, { x: number; y: number; n: number }>();
  const dots: AreaDot[] = [];
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const tx = lot.tile.x + dx;
      const ty = lot.tile.y + dy;
      if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
      const [x, y] = project(dx, dy);
      if (!inBox(x, y)) continue;
      const i = ty * n + tx;
      const kind = TILE_KINDS[grid.kind[i] ?? -1] ?? 'street';
      const district = DISTRICTS[grid.district[i] ?? -1] ?? 'midtown';
      const here = lotByTile.get(i);
      const dot = here && here.id !== lot.id ? occupantDot(s, here) : undefined;
      const layer = layerOf(kind, district, !!here?.occupant);
      if (layer) (layers[layer] ??= []).push([x, y]);
      if (layer === district) {
        const sum = sums.get(district) ?? { x: 0, y: 0, n: 0 };
        sums.set(district, { x: sum.x + x, y: sum.y + y, n: sum.n + 1 });
      }
      if (dot && here) {
        const ink =
          dot === 'own' ? s.meta.brandInk : (s.rivals[here.occupant!.id]?.ink ?? s.meta.brandInk);
        dots.push({ x, y, kind: dot, ink });
      }
    }
  }

  const centre = { x: AREA_BOX.w / 2, y: AREA_BOX.h / 2 };
  const labels: AreaLabel[] = [];
  for (const [d, sum] of sums) {
    if (sum.n < LABEL_MIN_TILES) continue;
    const x = sum.x / sum.n;
    const y = sum.y / sum.n;
    if (Math.hypot(x - centre.x, y - centre.y) < LABEL_CLEAR) continue;
    labels.push({ x, y, text: DISTRICT_SPECS[d]?.name ?? d });
  }
  // Your dots draw over rivals'.
  dots.sort((a, b) => Number(a.kind === 'own') - Number(b.kind === 'own'));

  return {
    layers,
    dots,
    labels,
    centre,
    half: { w: TILE_W / 2, h: TILE_H / 2 },
    // A circle of r tiles maps to an ellipse r·W/√2 wide and r·H/√2 tall.
    ring: {
      rx: (RIVAL_RADIUS * TILE_W) / Math.SQRT2,
      ry: (RIVAL_RADIUS * TILE_H) / Math.SQRT2,
      tiles: RIVAL_RADIUS,
    },
  };
}

/** One SVG path of diamonds, one per centre, shrunk by `inset` (0–1) to leave hairline gaps. */
export function diamondsPath(
  centres: readonly (readonly [number, number])[],
  half: { w: number; h: number },
  inset = 0,
): string {
  const w = half.w * (1 - inset);
  const h = half.h * (1 - inset);
  const r = (v: number) => Math.round(v * 10) / 10;
  return centres
    .map(
      ([x, y]) =>
        `M${r(x)} ${r(y - h)}L${r(x + w)} ${r(y)}L${r(x)} ${r(y + h)}L${r(x - w)} ${r(y)}Z`,
    )
    .join('');
}
