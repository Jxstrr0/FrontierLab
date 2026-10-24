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

/** Pin geometry (ART_DIRECTION §2): medallion size and the hit box around it. */
export const PIN_MEDALLION_PX = 30;
export const PIN_HIT_PX = 44;
/** The medallion floats this far above the roof anchor (centre to anchor). */
export const PIN_LIFT_PX = 20;
/** Pins this far outside the viewport (CSS px) are still placed, so edges don't pop. */
export const PIN_CULL_MARGIN_PX = 48;
