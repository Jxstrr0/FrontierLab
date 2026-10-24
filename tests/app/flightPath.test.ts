// Flight overlay geometry: great-circle points, the date line, the lifted arc,
// framing and the plane's position.
import { describe, expect, it } from 'vitest';
import {
  arcPoints,
  frameFor,
  greatCircle,
  pointAt,
  project,
} from '../../src/app/airport/flightPath';
import { FLIGHT_MIN_SPAN_DEG } from '../../src/config/mapView';
import { CITIES } from '../../src/data/cities';

describe('great circle', () => {
  it('starts and ends at the two airports', () => {
    const pts = greatCircle(CITIES.cal!, CITIES.lon!, 32);
    expect(pts).toHaveLength(33);
    expect(pts[0]!.lat).toBeCloseTo(CITIES.cal!.lat, 6);
    expect(pts[0]!.lon).toBeCloseTo(CITIES.cal!.lon, 6);
    expect(pts[32]!.lat).toBeCloseTo(CITIES.lon!.lat, 6);
    expect(pts[32]!.lon).toBeCloseTo(CITIES.lon!.lon, 6);
  });

  it('bows towards the pole on long east-west routes', () => {
    // Calgary to London passes far north of both cities (over Greenland).
    const pts = greatCircle(CITIES.cal!, CITIES.lon!, 32);
    const maxLat = Math.max(...pts.map((p) => p.lat));
    expect(maxLat).toBeGreaterThan(60);
  });

  it('runs along a meridian through its midpoint', () => {
    const pts = greatCircle({ lat: 0, lon: 10 }, { lat: 40, lon: 10 }, 4);
    expect(pts[2]!.lat).toBeCloseTo(20, 6);
    expect(pts[2]!.lon).toBeCloseTo(10, 6);
  });

  it('crosses the date line without jumping', () => {
    const pts = greatCircle(CITIES.van!, CITIES.tyo!, 64);
    for (let i = 1; i < pts.length; i++)
      expect(Math.abs(pts[i]!.lon - pts[i - 1]!.lon)).toBeLessThan(10);
    // Tokyo is reached going west over the Pacific: its longitude unwrapped below −180.
    expect(pts[64]!.lon).toBeCloseTo(CITIES.tyo!.lon - 360, 6);
  });
});

describe('drawn arc', () => {
  it('projects equirectangularly, one unit per degree', () => {
    expect(project({ lat: 0, lon: 0 })).toEqual({ x: 180, y: 90 });
    expect(project({ lat: 90, lon: -180 })).toEqual({ x: 0, y: 0 });
  });

  it('keeps its ends on the airports and lifts the middle up the screen', () => {
    const a = { lat: 10, lon: 0 };
    const b = { lat: 10, lon: 20 };
    const pts = arcPoints(a, b, 20);
    expect(pts[0]!.x).toBeCloseTo(project(a).x, 6);
    expect(pts[0]!.y).toBeCloseTo(project(a).y, 6);
    expect(pts[20]!.x).toBeCloseTo(project(b).x, 6);
    expect(pts[20]!.y).toBeCloseTo(project(b).y, 6);
    expect(pts[10]!.y).toBeLessThan(project(a).y - 1);
  });

  it('frames the whole route at the requested aspect, at least the minimum span wide', () => {
    const insets = { top: 0.2, bottom: 0.1 };
    for (const [a, b] of [
      ['cal', 'van'],
      ['cal', 'lon'],
      ['tyo', 'syd'],
      ['van', 'tyo'],
    ] as const) {
      const pts = arcPoints(CITIES[a]!, CITIES[b]!, 32);
      const box = frameFor(pts, 0.46, insets);
      expect(box.w / box.h).toBeCloseTo(0.46, 6);
      expect(box.w).toBeGreaterThanOrEqual(FLIGHT_MIN_SPAN_DEG);
      // Every point sits in the band between the header and the footer.
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(box.x);
        expect(p.x).toBeLessThanOrEqual(box.x + box.w);
        expect(p.y).toBeGreaterThanOrEqual(box.y + insets.top * box.h);
        expect(p.y).toBeLessThanOrEqual(box.y + (1 - insets.bottom) * box.h);
      }
    }
  });

  it('puts the plane at the ends and between, heading along the path', () => {
    const pts = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    expect(pointAt(pts, 0)).toMatchObject({ x: 0, y: 0, angle: 0 });
    expect(pointAt(pts, 0.25)).toMatchObject({ x: 5, y: 0 });
    const end = pointAt(pts, 1);
    expect(end.x).toBe(10);
    expect(end.y).toBe(10);
    expect(end.angle).toBe(90);
  });
});
