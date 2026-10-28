// How the city map *feels* to touch (SCREENS §2): camera limits, inertia,
// tap and double-tap tolerances, pin sizes and clustering. View-only numbers;
// the city art constants live in map.ts and simulation numbers in balance.ts.

/** Inertia: velocity decays as e^(−k·t); k per second. Higher stops sooner. */
export const INERTIA_DECAY_PER_S = 4.5;
/** Glide stops below this speed (CSS px per second). */
export const INERTIA_MIN_SPEED = 15;
/** Fling speed is capped (CSS px per second). */
export const INERTIA_MAX_SPEED = 3500;
/** Release velocity is measured over the last this-many ms of the drag. */
export const VELOCITY_WINDOW_MS = 90;
/** If the finger rested this long before lifting, there is no fling. */
export const FLING_REST_MS = 60;

/** A touch that moves less than this (CSS px) is a tap, not a drag. */
export const TAP_SLOP_PX = 8;
/** Two taps within this time and distance zoom in one stop. */
export const DOUBLE_TAP_MS = 320;
export const DOUBLE_TAP_SLOP_PX = 30;

/** Mouse wheel zoom: factor e^(−deltaY·k) per wheel pixel. */
export const WHEEL_ZOOM_PER_PX = 0.0018;
/** Trackpad pinch (ctrl + wheel) is more sensitive. */
export const PINCH_WHEEL_ZOOM_PER_PX = 0.01;
/** Wheel "line" and "page" deltas, converted to pixels. */
export const WHEEL_LINE_PX = 16;
export const WHEEL_PAGE_PX = 400;

/** Animated zooms (double tap, cluster tap, fly-to), in ms. */
export const ZOOM_TWEEN_MS = 260;

/**
 * Camera clamp: the screen centre must stay within the city diamond grown by
 * this much paper (world px), so the city can't be flung off-screen.
 */
export const CLAMP_MARGIN = { x: 160, y: 120 } as const;

/** Start framing with no branch yet: over the financial district at this zoom. */
export const OVERVIEW_ZOOM = 0.5;
/** Start framing on the player's first branch at this zoom. */
export const BRANCH_ZOOM = 1;

/** Below this zoom pins cluster and for-lease tags shrink to dots. */
export const FAR_ZOOM_BELOW = 0.75;
/** Pins closer than this on screen (CSS px) merge into a cluster. */
export const CLUSTER_RADIUS_PX = 36;
/** Cluster zoom levels per doubling: clusters regroup only at these steps. */
export const CLUSTER_LEVELS_PER_OCTAVE = 4;
/** Tapping a cluster zooms here, where no pins cluster. */
export const CLUSTER_EXPAND_ZOOM = 1;

/**
 * Pin geometry (ART_DIRECTION §2): medallion size and the hit box around it.
 * Medallions, crests, tags and seals share one footprint (about 28 px) so no
 * kind of pin shouts over the others.
 */
export const PIN_MEDALLION_PX = 28;
export const PIN_HIT_PX = 44;
/** The medallion floats this far above the roof anchor (centre to anchor). */
export const PIN_LIFT_PX = 20;
/** Bank crests (your branches and rivals'): width and height; a head office adds a crown on top. */
export const PIN_CREST_PX = { w: 26, h: 30 } as const;
export const PIN_CREST_CROWN_PX = 6;
export const PIN_CREST_LIFT_PX = 21;
/** Landmark seals (central bank, airport, stadium): a touch larger than medallions. */
export const PIN_LANDMARK_PX = 32;
export const PIN_LANDMARK_LIFT_PX = 23;
/**
 * Open branch locations: a "$" coin at close zoom (from PIN_CAPTION_FROM_ZOOM);
 * nearer out, a small brass dot on the roof, the coin scaled by PIN_COIN_DOT_SCALE.
 */
export const PIN_COIN_PX = 22;
export const PIN_COIN_LIFT_PX = 15;
export const PIN_COIN_DOT_SCALE = 0.45;
/** Price tags (rent or buy): height and lift. */
export const PIN_TAG_PX = 22;
export const PIN_TAG_LIFT_PX = 19;
/** Far zoom (below FAR_ZOOM_BELOW): each shape shrinks by this factor. */
export const PIN_FAR_SCALE = {
  crest: 0.82,
  mine: 0.92,
  medallion: 0.8,
  landmark: 0.78,
  coin: 0.5,
  tag: 0.8,
} as const;
/** Far-zoom cluster marks: crest width, medallion and coin size (px). */
export const CLUSTER_MARK_PX = { crest: 26, medallion: 25, coin: 14 } as const;
/** At most this many distinct marks fan out in a cluster stack. */
export const CLUSTER_STACK_MAX = 3;
/**
 * From this zoom up, places show a short caption under the pin ("Credit bureau"),
 * notes ("Sale 14 Mar"), the words on price tags ("For lease") and the coins' "$".
 */
export const PIN_CAPTION_FROM_ZOOM = 1.5;
/** Words dropped from a rival lab's name for the caption under its crest. */
export const RIVAL_CAPTION_GENERIC_WORDS = [
  'AI',
  'IA',
  'KI',
  'Labs',
  'Lab',
  'Open',
  'Models',
  'Intelligence',
  'Cognition',
  'Research',
  'Institute',
  'Collective',
  'Machine',
  'Works',
  '&',
  'Partners',
] as const;
/** Pins this far outside the viewport (CSS px) are still placed, so edges don't pop. */
export const PIN_CULL_MARGIN_PX = 48;

// ─── Flight overlay (Stage 8, ART_DIRECTION §1.4 "planes follow a dotted arc") ──
/** The plane crosses the world map in this many ms, then the overlay fades. */
export const FLIGHT_MS = 2500;
export const FLIGHT_FADE_MS = 320;
/** With reduced motion: a still frame of the whole route for this long, then a crossfade. */
export const FLIGHT_STILL_MS = 900;
/** Points sampled along the great circle. */
export const FLIGHT_PATH_POINTS = 64;
/** Extra lift of the drawn arc at its middle, as a share of its projected length. */
export const FLIGHT_ARC_LIFT = 0.12;
/** The map frames the route with at least this many degrees of longitude, plus padding. */
export const FLIGHT_MIN_SPAN_DEG = 45;
export const FLIGHT_PAD_DEG = 14;
/** Shares of the screen height the overlay's header and footer cover; the route is framed between. */
export const FLIGHT_INSETS = { top: 0.2, bottom: 0.07 } as const;
/** How long the arrival toast stays up, in ms. */
export const ARRIVAL_TOAST_MS = 4200;
