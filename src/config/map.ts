// Map art constants (ART_DIRECTION §2). These shape how the city is drawn, not
// how the simulation behaves, so they live apart from balance.ts.
import type { DistrictId } from '../data/types';

/** 2:1 isometric tile footprint at zoom 1, in world pixels. */
export const TILE_W = 64;
export const TILE_H = 32;
/** One storey of building height at zoom 1. */
export const STOREY_PX = 9;
/** Paper around the city diamond: room for tall towers above and the microprint ring. */
export const MAP_MARGIN = { x: 120, top: 260, bottom: 120 } as const;

/** Zoom stops (ART_DIRECTION §2); pinch interpolates between them. */
export const ZOOM_STOPS = [0.5, 1, 2] as const;
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 2.5;

/** Building height range in storeys, by district. */
export const FLOORS: Record<DistrictId, [number, number]> = {
  financial: [9, 18],
  downtown: [4, 8],
  midtown: [2, 4],
  university: [2, 4],
  suburbs: [1, 2],
  industrial: [1, 3],
  waterfront: [2, 6],
};

/** Share of lot-free blocks that become parks, by district. */
export const PARK_SHARE: Record<DistrictId, number> = {
  financial: 0.05,
  downtown: 0.08,
  midtown: 0.12,
  university: 0.3,
  suburbs: 0.2,
  industrial: 0.04,
  waterfront: 0.15,
};

/** Special buildings, each filling one lot-free block near its district (Stage 3: art only). */
export const LANDMARKS = [
  { id: 'centralBank', district: 'financial' },
  { id: 'clockTower', district: 'university' },
  { id: 'stadium', district: 'suburbs' },
  { id: 'airport', district: 'industrial' },
] as const satisfies readonly { id: string; district: DistrictId }[];
export type LandmarkId = (typeof LANDMARKS)[number]['id'];
