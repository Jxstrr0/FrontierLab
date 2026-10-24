// The map camera (SCREENS §2), kept as plain numbers so it can be unit-tested:
// world ↔ screen conversion, zoom about a focal point, clamping to the city,
// inertia and tweens. The view camera stores the world point at the *centre* of
// the screen (so rotating the phone keeps what you were looking at); the
// renderer's camera stores the top-left corner (src/art/mapRenderer.ts).
import { MAP_MARGIN, TILE_H, TILE_W, ZOOM_MAX, ZOOM_MIN, ZOOM_STOPS } from '../../config/map';
import { CLAMP_MARGIN, INERTIA_MIN_SPEED } from '../../config/mapView';
import type { Camera } from '../../art/mapRenderer';

export interface ViewCamera {
  /** World point (zoom-1 px) at the centre of the viewport. */
  cx: number;
  cy: number;
  /** CSS px per world px. */
  zoom: number;
}

/** Viewport size in CSS px. */
export interface Size {
  width: number;
  height: number;
}

export interface Vec {
  x: number;
  y: number;
}

/** The renderer's camera: the world point at the viewport's top-left corner. */
export function toRenderCamera(cam: ViewCamera, vp: Size): Camera {
  return {
    x: cam.cx - vp.width / 2 / cam.zoom,
    y: cam.cy - vp.height / 2 / cam.zoom,
    zoom: cam.zoom,
  };
}

export function screenToWorld(cam: ViewCamera, vp: Size, sx: number, sy: number): Vec {
  return {
    x: cam.cx + (sx - vp.width / 2) / cam.zoom,
    y: cam.cy + (sy - vp.height / 2) / cam.zoom,
  };
}

export function worldToScreen(cam: ViewCamera, vp: Size, wx: number, wy: number): Vec {
  return {
    x: (wx - cam.cx) * cam.zoom + vp.width / 2,
    y: (wy - cam.cy) * cam.zoom + vp.height / 2,
  };
}

export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/** Moves the camera by a screen-space drag (the map follows the finger). */
export function panBy(cam: ViewCamera, dx: number, dy: number): ViewCamera {
  return { cx: cam.cx - dx / cam.zoom, cy: cam.cy - dy / cam.zoom, zoom: cam.zoom };
}

/** Zooms so the world point under screen point (sx, sy) stays under it. */
export function zoomAbout(
  cam: ViewCamera,
  vp: Size,
  zoom: number,
  sx: number,
  sy: number,
): ViewCamera {
  const z = clampZoom(zoom);
  const w = screenToWorld(cam, vp, sx, sy);
  return { cx: w.x - (sx - vp.width / 2) / z, cy: w.y - (sy - vp.height / 2) / z, zoom: z };
}

/**
 * Pinch: the world point that was under `startMid` (with camera `start`) ends up
 * under `mid` at the new zoom, so the map zooms and pans with the fingers.
 */
export function pinch(start: ViewCamera, vp: Size, startMid: Vec, mid: Vec, scale: number) {
  const z = clampZoom(start.zoom * scale);
  const w = screenToWorld(start, vp, startMid.x, startMid.y);
  return { cx: w.x - (mid.x - vp.width / 2) / z, cy: w.y - (mid.y - vp.height / 2) / z, zoom: z };
}

/** The next zoom stop above `zoom` (ART_DIRECTION §2), or ZOOM_MAX past the last. */
export function nextZoomStop(zoom: number): number {
  for (const stop of ZOOM_STOPS) if (stop > zoom * 1.02) return stop;
  return ZOOM_MAX;
}

/** The city diamond in world px: centre and half-extents. */
export function cityDiamond(tiles: number) {
  return {
    cx: MAP_MARGIN.x + (tiles * TILE_W) / 2,
    cy: MAP_MARGIN.top + (tiles * TILE_H) / 2,
    hw: (tiles * TILE_W) / 2,
    hh: (tiles * TILE_H) / 2,
  };
}

/**
 * Keeps zoom in range and the screen centre inside the city diamond grown by
 * CLAMP_MARGIN, so some of the city is always on screen.
 */
export function clampCamera(cam: ViewCamera, tiles: number): ViewCamera {
  const d = cityDiamond(tiles);
  const hw = d.hw + CLAMP_MARGIN.x;
  const hh = d.hh + CLAMP_MARGIN.y;
  // In diamond-normalised space the region is the L1 unit ball |u| + |v| ≤ 1.
  const u = (cam.cx - d.cx) / hw;
  const v = (cam.cy - d.cy) / hh;
  let au = Math.abs(u);
  let av = Math.abs(v);
  if (au + av > 1) {
    // Project onto the nearest edge of the ball, then onto its corners if past them.
    const t = (au + av - 1) / 2;
    au -= t;
    av -= t;
    if (au < 0) [au, av] = [0, 1];
    else if (av < 0) [au, av] = [1, 0];
  }
  return {
    cx: d.cx + Math.sign(u) * au * hw,
    cy: d.cy + Math.sign(v) * av * hh,
    zoom: clampZoom(cam.zoom),
  };
}

/**
 * One inertia step. Velocity (CSS px/s, screen space) decays as e^(−k·t), and the
 * position moves by the exact integral of that, so the glide is the same at
 * 30, 60 or 120 fps. Returns the new camera and velocity (zero once it's slow).
 */
export function inertiaStep(
  cam: ViewCamera,
  vel: Vec,
  dtMs: number,
  decayPerS: number,
): { cam: ViewCamera; vel: Vec } {
  const dt = dtMs / 1000;
  const keep = Math.exp(-decayPerS * dt);
  const travel = (1 - keep) / decayPerS;
  const next = panBy(cam, vel.x * travel, vel.y * travel);
  const v = { x: vel.x * keep, y: vel.y * keep };
  if (Math.hypot(v.x, v.y) < INERTIA_MIN_SPEED) return { cam: next, vel: { x: 0, y: 0 } };
  return { cam: next, vel: v };
}

/** Ease-out cubic for tweens. */
export const easeOut = (t: number): number => 1 - (1 - Math.min(1, Math.max(0, t))) ** 3;

/**
 * A camera between `a` and `b` at progress t ∈ [0, 1]: zoom moves geometrically
 * (feels even), and the centre follows so the motion reads as one glide.
 */
export function tweenCamera(a: ViewCamera, b: ViewCamera, t: number): ViewCamera {
  const k = easeOut(t);
  const zoom = a.zoom * (b.zoom / a.zoom) ** k;
  // Weight the centre by how far the zoom has gone (in screen terms) so the
  // target stays steady on screen as we zoom in on it.
  const span = 1 / a.zoom - 1 / b.zoom;
  const w = Math.abs(span) < 1e-9 ? k : (1 / a.zoom - 1 / zoom) / span;
  return { cx: a.cx + (b.cx - a.cx) * w, cy: a.cy + (b.cy - a.cy) * w, zoom };
}

/** A focal-point zoom tween: (sx, sy) stays fixed while zooming from a to `zoom`. */
export function tweenZoomAbout(
  a: ViewCamera,
  vp: Size,
  zoom: number,
  sx: number,
  sy: number,
  t: number,
): ViewCamera {
  const z = a.zoom * (clampZoom(zoom) / a.zoom) ** easeOut(t);
  return zoomAbout(a, vp, z, sx, sy);
}
