import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN } from '../../src/config/map';
import { INERTIA_DECAY_PER_S } from '../../src/config/mapView';
import {
  cityDiamond,
  clampCamera,
  inertiaStep,
  nextZoomStop,
  panBy,
  pinch,
  screenToWorld,
  toRenderCamera,
  tweenCamera,
  worldToScreen,
  zoomAbout,
  type ViewCamera,
} from '../../src/app/map/camera';
import { releaseVelocity } from '../../src/app/map/gestures';

const vp = { width: 390, height: 844 };
const cam: ViewCamera = { cx: 1000, cy: 800, zoom: 1.5 };

describe('map camera', () => {
  it('converts world ↔ screen both ways, centred on the viewport', () => {
    expect(worldToScreen(cam, vp, 1000, 800)).toEqual({ x: 195, y: 422 });
    const w = screenToWorld(cam, vp, 10, 700);
    const back = worldToScreen(cam, vp, w.x, w.y);
    expect(back.x).toBeCloseTo(10);
    expect(back.y).toBeCloseTo(700);
  });

  it('gives the renderer the world point at the top-left corner', () => {
    const r = toRenderCamera(cam, vp);
    expect(r.zoom).toBe(1.5);
    expect(r.x).toBeCloseTo(1000 - 195 / 1.5);
    expect(r.y).toBeCloseTo(800 - 422 / 1.5);
    expect(screenToWorld(cam, vp, 0, 0)).toEqual({ x: r.x, y: r.y });
  });

  it('pans with the finger', () => {
    const next = panBy(cam, 30, -15);
    // The world point that was under (100, 100) is now under (130, 85).
    const w = screenToWorld(cam, vp, 100, 100);
    const s = worldToScreen(next, vp, w.x, w.y);
    expect(s.x).toBeCloseTo(130);
    expect(s.y).toBeCloseTo(85);
  });

  it('zooms about a focal point and respects the zoom limits', () => {
    const w = screenToWorld(cam, vp, 50, 600);
    const z = zoomAbout(cam, vp, 2, 50, 600);
    expect(z.zoom).toBe(2);
    const s = worldToScreen(z, vp, w.x, w.y);
    expect(s.x).toBeCloseTo(50);
    expect(s.y).toBeCloseTo(600);
    expect(zoomAbout(cam, vp, 99, 0, 0).zoom).toBe(ZOOM_MAX);
    expect(zoomAbout(cam, vp, 0.01, 0, 0).zoom).toBe(ZOOM_MIN);
  });

  it('pinches: the point under the fingers follows their midpoint', () => {
    const start = { x: 200, y: 400 };
    const w = screenToWorld(cam, vp, start.x, start.y);
    const p = pinch(cam, vp, start, { x: 220, y: 380 }, 1.25);
    expect(p.zoom).toBeCloseTo(1.875);
    const s = worldToScreen(p, vp, w.x, w.y);
    expect(s.x).toBeCloseTo(220);
    expect(s.y).toBeCloseTo(380);
  });

  it('steps through the zoom stops', () => {
    expect(nextZoomStop(0.35)).toBe(0.5);
    expect(nextZoomStop(0.5)).toBe(1);
    expect(nextZoomStop(1.4)).toBe(2);
    expect(nextZoomStop(2)).toBe(ZOOM_MAX);
  });

  it('keeps the screen centre on the city diamond (plus margin)', () => {
    const tiles = 52;
    const d = cityDiamond(tiles);
    const inside = { cx: d.cx + 10, cy: d.cy - 10, zoom: 1 };
    expect(clampCamera(inside, tiles)).toEqual(inside);
    // Flung far off to the right and up: pulled back onto the diamond's edge.
    const far = clampCamera(
      { cx: d.cx + 2 * (d.hw + 160), cy: d.cy - 1.5 * (d.hh + 120), zoom: 9 },
      tiles,
    );
    expect(far.zoom).toBe(ZOOM_MAX);
    expect(far.cx).toBeGreaterThan(d.cx);
    expect(far.cy).toBeLessThan(d.cy);
    const u = (far.cx - d.cx) / (d.hw + 160);
    const v = (d.cy - far.cy) / (d.hh + 120);
    expect(u + v).toBeCloseTo(1);
    expect(u).toBeCloseTo(0.75);
    // Straight out past a corner: lands on that corner.
    const corner = clampCamera({ cx: d.cx + 1e6, cy: d.cy, zoom: 1 }, tiles);
    expect(corner.cy).toBeCloseTo(d.cy);
    expect(corner.cx).toBeCloseTo(d.cx + d.hw + 160);
  });

  it('glides the same distance at any frame rate, and stops', () => {
    const run = (fps: number) => {
      let c: ViewCamera = { cx: 0, cy: 0, zoom: 1 };
      let v = { x: 1200, y: -600 };
      for (let t = 0; t < 2000; t += 1000 / fps) {
        ({ cam: c, vel: v } = inertiaStep(c, v, 1000 / fps, INERTIA_DECAY_PER_S));
      }
      return { c, v };
    };
    const a = run(30);
    const b = run(120);
    expect(a.c.cx).toBeCloseTo(b.c.cx, 0);
    expect(a.c.cy).toBeCloseTo(b.c.cy, 0);
    // Total travel is v / k (camera moves opposite to the drag direction).
    expect(a.c.cx).toBeCloseTo(-1200 / INERTIA_DECAY_PER_S, -1);
    expect(a.v).toEqual({ x: 0, y: 0 });
  });

  it('tweens from one camera to another', () => {
    const a = { cx: 0, cy: 0, zoom: 0.5 };
    const b = { cx: 100, cy: 50, zoom: 1 };
    expect(tweenCamera(a, b, 0)).toEqual(a);
    const end = tweenCamera(a, b, 1);
    expect(end.cx).toBeCloseTo(100);
    expect(end.cy).toBeCloseTo(50);
    expect(end.zoom).toBeCloseTo(1);
    const mid = tweenCamera(a, b, 0.5);
    expect(mid.zoom).toBeGreaterThan(0.5);
    expect(mid.zoom).toBeLessThan(1);
  });
});

describe('fling velocity', () => {
  it('measures the last stretch of the drag in px/s', () => {
    const samples = [
      { t: 0, x: 0, y: 0 },
      { t: 50, x: 10, y: 0 },
      { t: 100, x: 40, y: 20 },
      { t: 116, x: 50, y: 25 },
    ];
    const v = releaseVelocity(samples, 120);
    expect(v.x).toBeCloseTo(((50 - 10) / 66) * 1000);
    expect(v.y).toBeCloseTo((25 / 66) * 1000);
  });

  it('is zero when the finger rested before lifting', () => {
    expect(
      releaseVelocity(
        [
          { t: 0, x: 0, y: 0 },
          { t: 10, x: 30, y: 0 },
        ],
        400,
      ),
    ).toEqual({
      x: 0,
      y: 0,
    });
  });
});
