// Map art constants (ART_DIRECTION §2). These shape how the city is drawn, not
// how the simulation behaves, so they live apart from balance.ts.
import type { Signature } from '../data/cityLooks';
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

/** Layout 2: the city look's skyline multiplies filler storeys in these districts. */
export const SKYLINE_DISTRICTS: readonly DistrictId[] = ['financial', 'downtown'];

/** Office buildings for lease draw this many storeys above their leasable floors (lobby, crown). */
export const OFFICE_ART_EXTRA_STOREYS = 2;
/** Storeys of credit bureau and marketing agency buildings (Stage 4). */
export const SITE_STOREYS = {
  bureau: 5,
  agency: 4,
  rivalHq: 8,
  employer: 4,
  university: 3,
  investmentBank: 9,
  /** Property buildings use their own floor count (Site.property.floors); this is the fallback. */
  property: 5,
  conventionCenter: 3,
  lobbyingFirm: 6,
  autoDealer: 2,
  auctionHouse: 4,
  vacationHome: 2,
} as const;

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
  // The city's one-of-a-kind landmark (data/cityLooks.ts); cities without one skip it.
  { id: 'signature', district: 'downtown' },
] as const satisfies readonly { id: string; district: DistrictId }[];
export type LandmarkId = (typeof LANDMARKS)[number]['id'];
/** Regional sites (CONTENT §2) are small towns: only the airport landmark. */
export const REGIONAL_LANDMARKS: readonly LandmarkId[] = ['airport'];
/** Regional sites keep filler buildings low (storeys), whatever the district. */
export const REGIONAL_MAX_FLOORS = 3;

// ─── Engraved renderer (src/art/isoRenderer.ts) ───────────────────────────────
// Rendering and cache tuning for the chunked map renderer. Purely visual: none
// of these touch the simulation.

/** Chunks are square and this many CSS px on screen at their zoom stop. */
export const CHUNK_CSS_PX = 256;
/**
 * Total device pixels the chunk cache may hold (4 bytes each). iOS Safari caps
 * all canvases at ~384 MB, so 40 M px (≈160 MB) leaves room for the view canvas.
 */
export const CHUNK_CACHE_BUDGET_PX = 40_000_000;
/** Time budget per frame for drawing missing chunks, in ms. */
export const RENDER_SLICE_MS = 6;
/** A stop may be scaled up this much before the next sharper stop is used. */
export const STOP_UPSCALE_TOLERANCE = 1.15;
/** Prefetch this many chunks around the visible ones once they are ready. */
export const PREFETCH_RING = 1;

/** Extra storeys above `floors` that crowns, spires and roofs may reach. */
export const ROOF_EXTRA_STOREYS = 4;
/** Height of the player's roof flag above the roof, in world px. */
export const FLAG_PX = 14;
/** Tallest a landmark may draw above its block, in world px. */
export const LANDMARK_MAX_PX = 150;
/** Street life (layout 2): how high avenue trees and plaza fountains reach, in world px. */
export const AVENUE_TREE_PX = 16;
export const FOUNTAIN_PX = 14;
/**
 * How tall each signature landmark draws above its block, in world px
 * (src/art/signatures*.ts), so chunk queries reach high enough and nothing
 * clips. Keep the tallest below MAP_MARGIN.top so it never leaves the map.
 */
export const SIGNATURE_HEIGHT_PX: Record<Signature, number> = {
  chateauHotel: 110,
  needleTower: 196,
  sailCanopy: 64,
  broadcastTower: 258,
  domedBasilica: 136,
  decoSpire: 256,
  twinAntenna: 258,
  suspensionBridge: 132,
  saucerTower: 180,
  observationWheel: 128,
  latticeTower: 260,
  steppedGables: 80,
  grandStation: 112,
  twinSpires: 158,
  latticeMast: 258,
  shellHall: 80,
  skyDeck: 206,
  prismTower: 252,
  steppedSpire: 258,
  onionDomes: 140,
  none: LANDMARK_MAX_PX,
};
/** Signature art may reach this many tiles past its block's sides (the bridge deck). */
export const LANDMARK_SIDE_TILES = 0.7;
/** Cast shadows run along +x for this many tiles per world px of height. */
export const SHADOW_TILES_PER_PX = 0.006;
