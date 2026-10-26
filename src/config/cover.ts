// Title screen cover, "Living skyline" (docs/COVER_SCREEN.md, SCREENS §1): every
// number the cover panel uses, so components hold no magic numbers.

/** Map zoom the skyline strip is printed at (CSS px per world px; tuned between 0.5 and 1). */
export const COVER_ZOOM = 0.7;
/** How far the strip drifts each way, in CSS px, for a 358 px wide panel (scales with width). */
export const COVER_PAN_PX = 26;
/** Panel width the pan distance above is tuned for (390 px phone minus 16 px gutters). */
export const COVER_PAN_REFERENCE_WIDTH = 358;
/** Seconds for one sweep (left to right, or back). */
export const COVER_PAN_SECONDS = 26;
/** Most backing-store pixels for the strip canvas (stays well inside iOS Safari's canvas limits). */
export const COVER_MAX_PIXELS = 4_000_000;
/** Crossfade from the empty paper panel to the printed city (ms). */
export const COVER_FADE_MS = 400;
/** Most of your own flags a save card remembers for the cover. */
export const COVER_MAX_FLAGS = 12;
/** Most rival flags a save card remembers for the cover. */
export const COVER_MAX_RIVAL_FLAGS = 40;
/** Showcase flags on the cover for a new player, on the free lots nearest the financial district. */
export const COVER_SHOWCASE_FLAGS = 3;
/** Ink of the showcase flags (Vault Blue, the default brand ink). */
export const COVER_SHOWCASE_INK = '#2C4A7A';
/** The signature landmark pulls the camera halfway toward it when it's within this many world px of the centre. */
export const COVER_SIGNATURE_REACH = 520;
/** Share of the signature landmark's height the camera aims above its base, so the tower sits in frame. */
export const COVER_SIGNATURE_LIFT = 0.45;
/** Dots in the caption row (a quiet hint that the city changes). */
export const COVER_DOTS = 5;
/** Placeholder guilloche: how many waves, their amplitude and period (CSS px), and their opacity. */
export const COVER_WAVES = { count: 9, amplitude: 9, period: 64, opacity: 0.1 } as const;
/** Resizes smaller than this (CSS px) keep the strip already printed. */
export const COVER_RESIZE_SLACK = 24;
/** Seed of the city printed for a new player (any seed works; this one matches the map lab). */
export const COVER_NEW_PLAYER_SEED = 42;
/** Most frames spent printing the strip before taking what's there (a guard, never reached in practice). */
export const COVER_MAX_FRAMES = 600;
/** A returning player's nearest flag shares the frame with the financial district within this many world px; beyond it, the camera centres on the flag. */
export const COVER_FLAG_REACH = 360;
