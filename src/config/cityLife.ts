// City life tuning (ART_DIRECTION §2.3): the moving layer over the map (traffic,
// people, boats, fountain spray, birds, delivery trucks and data center steam)
// and the static street props (parked cars, café tables, washing lines,
// cranes). View-only numbers: none of this touches the simulation.
import type { DistrictId } from '../data/types';
import type { Phase } from '../data/types';

/** The moving layer redraws at most this often (frames per second). */
export const LIFE_FPS = 30;
/** Below this zoom the people are too small to draw; cars become dashes. */
export const LIFE_PEOPLE_MIN_ZOOM = 0.45;
/** Movers are looked for this far (CSS px) outside the screen, so they never pop in at the edge. */
export const LIFE_VIEW_PAD_PX = 40;

/** How busy each district's streets and pavements are (1 = downtown). */
export const LIFE_DISTRICT_BUSY: Record<DistrictId, number> = {
  financial: 1,
  downtown: 1,
  midtown: 0.75,
  university: 0.65,
  waterfront: 0.6,
  industrial: 0.45,
  suburbs: 0.3,
};

/** Traffic and crowds by the home economy's phase (multiplies every count). */
export const LIFE_PHASE_BUSY: Record<Phase, number> = {
  expansion: 1.15,
  recovery: 1,
  slowdown: 0.85,
  recession: 0.6,
};
/** Each point of GDP growth above (below) zero adds (removes) this share; the result is clamped. */
export const LIFE_GDP_BUSY_PER_PT = 0.04;
export const LIFE_BUSY_RANGE: [number, number] = [0.45, 1.35];

/** Cars: per tile of street at busy 1, speed range (tiles a second), size (tiles, px). */
export const CARS = {
  perTile: 0.3,
  speed: [0.55, 0.85] as [number, number],
  /** A bus is this share of vehicles downtown and in the financial district. */
  busShare: 0.08,
  /** Lanes sit this far from the street's centre line (tiles). */
  lane: 0.17,
  len: 0.2,
  busLen: 0.36,
  width: 0.1,
  bodyPx: 2.2,
  cabinPx: 1.6,
  /** Fade in and out over this much of a run's ends (tiles). */
  fade: 0.6,
} as const;

/** People on pavements, plazas and park paths. */
export const PEOPLE = {
  /** Walkers per tile of street pavement at busy 1. */
  perStreetTile: 0.3,
  /** Walkers per plaza or park tile at busy 1. */
  perPlazaTile: 0.9,
  perParkTile: 0.4,
  speed: [0.16, 0.26] as [number, number],
  /** Pavements run this far in from the street's edges (tiles). */
  pavement: 0.07,
  /** A pavement stroll covers this many tiles before turning back. */
  stroll: [2, 5] as [number, number],
  /** Wandering in a plaza or park: seconds per leg, pause share at each stop. */
  legSeconds: [5, 9] as [number, number],
  pause: 0.3,
  /** Figure height and head size (world px). */
  heightPx: 4.4,
  headPx: 1.1,
} as const;

/** People going in and out of offices, by how busy the office is (0–1). */
export const OFFICE_FOOTFALL = {
  /** Walkers at an office at full activity; a quiet one keeps at least `min`. */
  max: 7,
  min: 0,
  /** How far along the street they walk from the door (tiles). */
  reach: [1, 3] as [number, number],
  /** Seconds standing at the door and at the far end. */
  dwell: [1, 4] as [number, number],
} as const;

/** Data centers: delivery trucks and steam over the roof, by how hard the compute runs (0–1). */
export const DATA_CENTER_LIFE = {
  trucks: 2,
  /** Trucks come from this many tiles down the street, and wait this long at the dock. */
  truckReach: [4, 7] as [number, number],
  truckDwell: [3, 6] as [number, number],
  /** Steam puffs at full load, how high they rise (px) and how long each lives (s). */
  puffs: 6,
  puffRisePx: 26,
  puffSeconds: 3.5,
  /** Roof height of the hall (storeys, see buildingsDataCenter.ts HALL.wallStoreys). */
  roofStoreys: 1.6,
} as const;

/** Boats cruising open water, slowly, back and forth along a clear line. */
export const CRUISE = {
  /** One boat per this many tiles of clear water line. */
  tilesPerBoat: 9,
  /** A line needs at least this many tiles of water this far from shore. */
  minRun: 6,
  shoreDist: 2,
  speed: [0.18, 0.3] as [number, number],
  len: 0.42,
  beam: 0.15,
  hullPx: 2,
  cabinPx: 2.6,
  wakeTiles: 0.9,
} as const;

/** Fountain spray: droplets thrown up and falling back, per fountain. */
export const SPRAY = {
  drops: 7,
  /** Seconds a drop is in the air, how far it travels (tiles) and how high it goes (px). */
  seconds: 1.1,
  reach: 0.2,
  risePx: 7,
} as const;

/** Birds: a flock crosses the city every so often. */
export const BIRDS = {
  flocks: 2,
  size: [5, 8] as [number, number],
  /** Seconds to cross the map, and seconds between crossings. */
  crossSeconds: 55,
  gapSeconds: 30,
  heightPx: 140,
  wingPx: 2.6,
} as const;

/** Static street props (drawn with the city, not moving). */
export const PROPS = {
  /** Share of plain street tiles with cars parked along a kerb, by district. */
  parked: {
    financial: 0.35,
    downtown: 0.5,
    midtown: 0.55,
    university: 0.4,
    waterfront: 0.35,
    industrial: 0.3,
    suburbs: 0.25,
  } as Record<DistrictId, number>,
  parkedPx: 4,
  /** Plaza tiles without a fountain: share with café tables, and their height (umbrellas). */
  cafe: 0.75,
  cafePx: 8,
  /** Suburban yards: share with a washing line. */
  washing: 0.35,
  /** Cranes over lots being fitted out, and their reach above the roof (px). */
  craneAbovePx: 34,
} as const;
