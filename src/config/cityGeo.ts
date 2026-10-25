// Tuning for layout 2 city geography (ART_DIRECTION §2, data/cityLooks.ts):
// the shape of each water form, bridges, the big park and how district centres
// are fitted around the water. Shapes are in "canonical" grid fractions (0–1),
// where the main water lies toward high v (the bottom-left edge of the map);
// each city's look then turns and mirrors them. Read by src/sim/waterForms.ts
// and src/sim/cityGeo.ts, so the sim (lot placement) and the art agree.

/** Layout versions: 1 is the original shared grid (old saves), 2 the per-city geography. */
export const LAYOUT_VERSIONS = [1, 2] as const;
export type LayoutVersion = (typeof LAYOUT_VERSIONS)[number];
/** New cities (new games and first visits) are generated at this layout. */
export const LATEST_LAYOUT: LayoutVersion = 2;

/**
 * Widths are in tiles; positions, amplitudes and radii in grid fractions.
 * `…Jitter` ranges shift a shape per city by its stable phase (waterForms.ts).
 */
export const WATER_SHAPES = {
  /** Open water along one edge, with a cove. */
  coast: {
    shore: 0.8,
    amp: 0.035,
    waves: 1.3,
    coveDepth: 0.08,
    coveWidth: 0.08,
    coveAt: [0.25, 0.75],
  },
  /** A meandering river across the grid; width = tiles × widthPerTile, clamped. */
  river: {
    centre: 0.64,
    amp: 0.07,
    waves: 1.1,
    amp2: 0.025,
    waves2: 2.3,
    wavesJitter: [0.85, 1.2],
    widthPerTile: 0.08,
    width: [3, 6],
  },
  /** Two rivers along the sides meeting in a harbour at the shore edge. */
  twinRivers: {
    west: { at: 0.1, amp: 0.02, waves: 1.2, width: 7 },
    east: { at: 0.86, amp: 0.03, waves: 0.9, width: 4 },
    /** The island tapers toward the harbour: each river moves in by taper × v². */
    taper: 0.08,
    harbour: 0.9,
    harbourAmp: 0.02,
    harbourWaves: 1,
  },
  /** A round bay in one corner, an ocean strip and a peninsula finger. */
  bay: {
    centre: [0.92, 0.98],
    radius: 0.4,
    radiusAmp: 0.04,
    radiusWaves: 2,
    ocean: 0.93,
    fingerJitter: 0.1,
    peninsulaHalfWidth: 0.035,
    peninsulaFrom: 1.42,
    peninsulaTo: 1.74,
  },
  /** A wide lake on one edge, fed by a narrow river from the far edge. */
  lake: {
    shore: 0.8,
    amp: 0.03,
    waves: 1.4,
    feeder: { from: [0.12, 0.25], slope: 0.14, amp: 0.04, waves: 0.8, width: 2.4 },
  },
  /** A wide channel across the grid with narrows and two coves. */
  harbour: {
    centre: 0.64,
    amp: 0.04,
    waves: 0.9,
    widthPerTile: 0.13,
    width: [6, 10],
    narrows: 2.5,
    narrowsWaves: 1.7,
    coves: [0.28, 0.72],
    coveJitter: 0.1,
    coveLengths: [0.12, 0.084],
    coveWidth: 2.4,
    /** Coves start this far inside the channel so they join it cleanly. */
    coveOverlap: 0.01,
  },
  /** Half-ring canals around a centre on a wide river mouth, plus a radial river. */
  canals: {
    mouth: 0.88,
    mouthAmp: 0.015,
    mouthWaves: 1.5,
    rings: [0.12, 0.2, 0.28],
    radial: { at: 0.62, amp: 0.03, waves: 0.7, width: 2.2 },
  },
  /** A bay with block-aligned islands, a river and one straight canal. */
  islands: {
    shore: 0.7,
    amp: 0.03,
    waves: 1.2,
    /** Island centres along the shore (canonical u); each is islandBlocks × islandBlocks blocks. */
    islands: [0.2, 0.5, 0.8],
    islandBlocks: 2,
    river: { at: 0.62, amp: 0.05, waves: 0.8, width: 3 },
    canal: { at: 0.48, width: 1.2, jitter: 0.08 },
  },
} as const;

/**
 * Where the waterfront district sits on each form, before snapping to the shore:
 * near the original layout's waterfront (0.5, 0.84), so its distances to the
 * other districts (and so rival crowding) stay close to the original.
 */
export const WATERFRONT_AT: Record<string, readonly [number, number]> = {
  coast: [0.5, 0.78],
  river: [0.6, 0.84],
  twinRivers: [0.5, 0.88],
  bay: [0.5, 0.84],
  lake: [0.5, 0.78],
  harbour: [0.3, 0.8],
  canals: [0.5, 0.86],
  islands: [0.5, 0.74],
};

/**
 * District centres sit inside the land: forms with water along the shore edge
 * squeeze the default centres' v toward the middle by this factor (1 = none).
 */
export const DISTRICT_SQUEEZE: Record<string, number> = {
  coast: 0.94,
  river: 1,
  twinRivers: 0.98,
  bay: 0.94,
  lake: 0.96,
  harbour: 1,
  canals: 0.97,
  islands: 0.9,
};

export const GEO = {
  /** Longest run of water (tiles) a street crosses on a bridge. */
  bridgeMax: 6,
  /** Runs up to this long are bridged on every street; longer ones on every bridgeEvery-th. */
  shortBridge: 2,
  bridgeEvery: 2,
  /** Land pockets smaller than this many tiles (not islands) become water; ponds smaller become land. */
  minLand: 24,
  minWater: 4,
  /**
   * Water and park take room from a district's scatter, so its spread grows by
   * 1/√(land share within spreadReach spreads), at most spreadMax: lots keep
   * about the original layout's density and distance to rivals.
   */
  spreadReach: 2,
  spreadMax: 1.2,
  /**
   * The waterfront centre sits this many tiles in from the shore (so its lots
   * line the water without piling onto it); other centres at least inlandTiles.
   */
  waterfrontInset: 4,
  inlandTiles: 2,
  /** Filler counts as waterfront only this many tiles from the water. */
  waterfrontReach: 6,
  /** Big park: blocks across × blocks deep, by city size, and its pull from the centre. */
  bigPark: { S: [2, 2], M: [2, 2], L: [2, 3], XL: [2, 3] } as Record<string, [number, number]>,
  /** The park centres on the grid centre moved this far away from the financial district. */
  bigParkOffset: 0.2,
  /** The start camera moves from the financial district toward the waterfront until this near (tiles). */
  focusReach: 12,
  /** Islands stand this many tiles of water off the shore. */
  islandGap: 4,
} as const;

/** Street life (art only, layout 2): avenue trees, plazas and boats. */
export const STREET_LIFE = {
  /** Plazas downtown (and midtown in big cities). */
  plazas: { S: 1, M: 1, L: 2, XL: 2 } as Record<string, number>,
  /** Boats float on water at least this many tiles from land, on this share of tiles. */
  boatReach: 2,
  boatShare: 0.035,
} as const;
