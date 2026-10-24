// Flight overlay geometry (ART_DIRECTION §1.4 "planes follow a dotted arc"):
// points along the great circle between two airports, an equirectangular
// projection (x = lon + 180, y = 90 − lat, one unit per degree), a gentle lift
// so even short hops read as an arc, the framing box for the route and the
// plane's position and heading along it. UI-only maths, so Math.* is fine here.
import {
  FLIGHT_ARC_LIFT,
  FLIGHT_INSETS,
  FLIGHT_MIN_SPAN_DEG,
  FLIGHT_PAD_DEG,
} from '../../config/mapView';

export interface LatLon {
  lat: number;
  lon: number;
}
export interface Pt {
  x: number;
  y: number;
}

const RAD = Math.PI / 180;

/**
 * `n + 1` points from `a` to `b` along the great circle (spherical slerp).
 * Longitudes are unwrapped so the path never jumps across the date line: they
 * may run past ±180 (draw the world again either side to match).
 */
export function greatCircle(a: LatLon, b: LatLon, n: number): LatLon[] {
  const va = toVec(a);
  const vb = toVec(b);
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]));
  const d = Math.acos(dot);
  const out: LatLon[] = [];
  let prevLon = a.lon;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let p: LatLon;
    if (d < 1e-9) p = { ...a };
    else {
      const ka = Math.sin((1 - t) * d) / Math.sin(d);
      const kb = Math.sin(t * d) / Math.sin(d);
      p = fromVec([ka * va[0] + kb * vb[0], ka * va[1] + kb * vb[1], ka * va[2] + kb * vb[2]]);
    }
    // Unwrap: keep each longitude within 180° of the one before.
    while (p.lon - prevLon > 180) p.lon -= 360;
    while (p.lon - prevLon < -180) p.lon += 360;
    prevLon = p.lon;
    out.push(p);
  }
  return out;
}

function toVec(p: LatLon): [number, number, number] {
  const la = p.lat * RAD;
  const lo = p.lon * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

function fromVec(v: [number, number, number]): LatLon {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return {
    lat: Math.asin(Math.max(-1, Math.min(1, v[2] / len))) / RAD,
    lon: Math.atan2(v[1], v[0]) / RAD,
  };
}

/** Equirectangular projection, one unit per degree; north up. */
export function project(p: LatLon): Pt {
  return { x: p.lon + 180, y: 90 - p.lat };
}

/**
 * The drawn route: the projected great circle lifted towards the pole side by
 * FLIGHT_ARC_LIFT × its length at the middle (sin-shaped, zero at both ends).
 */
export function arcPoints(a: LatLon, b: LatLon, n: number): Pt[] {
  const pts = greatCircle(a, b, n).map(project);
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return pts;
  // Unit normal pointing "up" the screen (towards smaller y).
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const lift = FLIGHT_ARC_LIFT * len;
  return pts.map((p, i) => {
    const k = Math.sin((Math.PI * i) / (pts.length - 1)) * lift;
    return { x: p.x + nx * k, y: p.y + ny * k };
  });
}

/** An SVG path through the points. */
export function pathD(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('');
}

/** Position and heading (degrees, 0 = east, clockwise on screen) at t ∈ [0, 1]. */
export function pointAt(pts: Pt[], t: number): { x: number; y: number; angle: number } {
  const n = pts.length - 1;
  const f = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const a = pts[i]!;
  const b = pts[i + 1] ?? a;
  const u = f - i;
  return {
    x: a.x + (b.x - a.x) * u,
    y: a.y + (b.y - a.y) * u,
    angle: Math.atan2(b.y - a.y, b.x - a.x) / RAD,
  };
}

/**
 * A viewBox around the route with padding, at least FLIGHT_MIN_SPAN_DEG wide,
 * with the given width/height aspect. The route is framed in the band left
 * between the header (top share) and the footer (bottom share) of the screen;
 * that band stays within the poles where it fits, or centres the world when it
 * is taller (long routes on a portrait phone).
 */
export function frameFor(
  pts: Pt[],
  aspect: number,
  insets: { top: number; bottom: number } = FLIGHT_INSETS,
): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const share = 1 - insets.top - insets.bottom;
  const bandAspect = aspect / share;
  let w = Math.max(FLIGHT_MIN_SPAN_DEG, maxX - minX + 2 * FLIGHT_PAD_DEG);
  let band = maxY - minY + 2 * FLIGHT_PAD_DEG;
  if (w / band < bandAspect) w = band * bandAspect;
  else band = w / bandAspect;
  const bandY =
    band <= 180
      ? Math.min(Math.max((minY + maxY) / 2 - band / 2, 0), 180 - band)
      : (180 - band) / 2;
  const h = band / share;
  return { x: (minX + maxX) / 2 - w / 2, y: bandY - insets.top * h, w, h };
}

/** Ease in and out (a smoothstep), for the plane's progress. */
export const easeInOut = (t: number): number => t * t * (3 - 2 * t);
