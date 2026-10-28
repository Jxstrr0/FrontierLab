// The map's imperative core (SCREENS §2): owns the canvas, the renderer, the
// camera, gestures and the pin layer, and draws in requestAnimationFrame only
// while something changes (a gesture, a glide, a tween, new pins, a resize, or
// the renderer asking for another frame). City life (ART_DIRECTION §2.3) runs
// on its own canvas above the map at up to LIFE_FPS; while it is frozen (the
// game paused, or reduced motion) it redraws only when the camera moves, so an
// idle, paused map still costs nothing.
import type { CityMap } from '../../art/citygen';
import type { LifeLayer } from '../../art/lifeLayer';
import type { LifeMood } from '../../art/lifeMovers';
import { LIFE_FPS } from '../../config/cityLife';
import type { LotOccupant, MapRenderer, Viewport } from '../../art/mapRenderer';
import { INERTIA_DECAY_PER_S, ZOOM_TWEEN_MS } from '../../config/mapView';
import {
  clampCamera,
  inertiaStep,
  nextZoomStop,
  pinch,
  panBy,
  toRenderCamera,
  tweenCamera,
  tweenZoomAbout,
  zoomAbout,
  type Size,
  type Vec,
  type ViewCamera,
} from './camera';
import type { Cluster } from './cluster';
import { attachGestures } from './gestures';
import { PinLayer } from './PinLayer';
import type { PinSpec } from './pins';

export interface MapControllerOptions {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Transparent canvas over the map for city life. */
  lifeCanvas: HTMLCanvasElement;
  pinHost: HTMLElement;
  onPin(pin: PinSpec): void;
  onCluster(cluster: Cluster<PinSpec>): void;
  /** Player or system asks for less motion: no glide, instant zooms. */
  reducedMotion(): boolean;
  /** City life holds still (the game is paused, or less motion is asked for). */
  lifeFrozen(): boolean;
  /** Called after the camera settles, to remember it across remounts. */
  onCamera(cam: ViewCamera): void;
}

type Tween = { from: ViewCamera; t0: number; at: (from: ViewCamera, t: number) => ViewCamera };

export class MapController {
  private ctx: CanvasRenderingContext2D;
  private lifeCtx: CanvasRenderingContext2D;
  private life: LifeLayer | null = null;
  /** Seconds of city life shown so far (it stops while frozen). */
  private lifeT = 0;
  private lifeLast = 0;
  private lifeDrawnAt = -Infinity;
  private lifeStale = true;
  /** The base map needs drawing (the camera moved, pins or chunks changed). */
  private baseDirty = true;
  private renderer: MapRenderer | null = null;
  private map: CityMap | null = null;
  private cam: ViewCamera = { cx: 0, cy: 0, zoom: 1 };
  private vp: Size = { width: 0, height: 0 };
  private dpr = 1;
  private vel: Vec = { x: 0, y: 0 };
  private tween: Tween | null = null;
  private pinchFrom: { cam: ViewCamera; mid: Vec } | null = null;
  private raf = 0;
  private lastFrame = 0;
  private pins: PinLayer;
  private detach: () => void;
  private ro: ResizeObserver;

  constructor(private o: MapControllerOptions) {
    this.ctx = o.canvas.getContext('2d', { alpha: false })!;
    this.lifeCtx = o.lifeCanvas.getContext('2d')!;
    this.pins = new PinLayer(o.pinHost, { onPin: o.onPin, onCluster: o.onCluster });
    this.detach = attachGestures(o.container, {
      start: () => this.stopMotion(),
      pan: (dx, dy) => this.setCamera(panBy(this.cam, dx, dy)),
      pinchStart: (mid) => (this.pinchFrom = { cam: this.cam, mid }),
      pinch: (mid, scale) => {
        const f = this.pinchFrom;
        if (f) this.setCamera(pinch(f.cam, this.vp, f.mid, mid, scale));
      },
      release: (vx, vy) => {
        this.pinchFrom = null;
        if (this.o.reducedMotion() || (vx === 0 && vy === 0)) return this.settled();
        this.vel = { x: vx, y: vy };
        this.lastFrame = performance.now();
        this.invalidate();
      },
      wheel: (factor, at) => {
        this.setCamera(zoomAbout(this.cam, this.vp, this.cam.zoom * factor, at.x, at.y));
        this.settled();
      },
      doubleTap: (at) => {
        const z = nextZoomStop(this.cam.zoom);
        this.animate((from, t) => tweenZoomAbout(from, this.vp, z, at.x, at.y, t));
      },
    });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(o.container);
    this.resize();
  }

  /** Shows a city: its map, its renderer and where to look. */
  setScene(map: CityMap, renderer: MapRenderer, life: LifeLayer, cam: ViewCamera): void {
    this.renderer?.dispose();
    this.map = map;
    this.renderer = renderer;
    this.life = life;
    this.lifeStale = true;
    this.stopMotion();
    this.cam = clampCamera(cam, map.tiles);
    this.invalidate();
  }

  setOccupants(occ: Record<string, LotOccupant>): void {
    this.renderer?.setOccupants(occ);
    this.invalidate();
  }

  /** New crowds for the city's mood (economy, offices, data centers). */
  setLifeMood(mood: LifeMood): void {
    this.life?.setMood(mood);
    this.lifeStale = true;
    this.wakeLife();
  }

  /** Restarts city life after a pause (cheap to call on every game update). */
  wakeLife(): void {
    if (this.life) this.request();
  }

  setPins(pins: PinSpec[]): void {
    this.pins.setPins(pins);
    this.invalidate();
  }

  /** The city map on screen (for framing landmarks). */
  get cityMap(): CityMap | null {
    return this.map;
  }

  get camera(): ViewCamera {
    return { ...this.cam };
  }

  get viewport(): Size {
    return { ...this.vp };
  }

  get pinUpdateMs(): number {
    return this.pins.lastUpdateMs;
  }

  /** Glides to centre a world point at a zoom (instant with reduced motion). */
  flyTo(world: Vec, zoom: number): void {
    const target = { cx: world.x, cy: world.y, zoom };
    this.animate((from, t) => tweenCamera(from, target, t));
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.detach();
    this.ro.disconnect();
    this.pins.dispose();
    this.renderer?.dispose();
    this.renderer = null;
    this.life = null;
  }

  private animate(at: Tween['at']): void {
    this.stopMotion();
    if (this.o.reducedMotion()) {
      this.setCamera(at(this.cam, 1));
      this.settled();
      return;
    }
    this.tween = { from: this.cam, t0: performance.now(), at };
    this.invalidate();
  }

  private stopMotion(): void {
    this.vel = { x: 0, y: 0 };
    this.tween = null;
  }

  private setCamera(cam: ViewCamera): void {
    this.cam = this.map ? clampCamera(cam, this.map.tiles) : cam;
    this.invalidate();
  }

  private settled(): void {
    this.o.onCamera(this.camera);
  }

  private resize(): void {
    const el = this.o.container;
    const width = el.clientWidth;
    const height = el.clientHeight;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    if (width === this.vp.width && height === this.vp.height && dpr === this.dpr) return;
    this.vp = { width, height };
    this.dpr = dpr;
    this.o.canvas.width = Math.max(1, Math.round(width * dpr));
    this.o.canvas.height = Math.max(1, Math.round(height * dpr));
    this.o.lifeCanvas.width = this.o.canvas.width;
    this.o.lifeCanvas.height = this.o.canvas.height;
    this.lifeStale = true;
    this.invalidate();
  }

  private invalidate(): void {
    this.baseDirty = true;
    this.request();
  }

  private request(): void {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private frame = (now: number): void => {
    this.raf = 0;
    let more = false;
    if (this.tween) {
      const t = Math.min(1, (now - this.tween.t0) / ZOOM_TWEEN_MS);
      this.setCamera(this.tween.at(this.tween.from, t));
      if (t < 1) more = true;
      else {
        this.tween = null;
        this.settled();
      }
    } else if (this.vel.x !== 0 || this.vel.y !== 0) {
      const dt = Math.min(64, Math.max(0, now - this.lastFrame));
      this.lastFrame = now;
      const before = this.cam;
      const step = inertiaStep(this.cam, this.vel, dt, INERTIA_DECAY_PER_S);
      this.setCamera(step.cam);
      // Stop gliding when the clamp holds us against the edge of the city.
      const stuck = this.cam.cx === before.cx && this.cam.cy === before.cy;
      this.vel = stuck ? { x: 0, y: 0 } : step.vel;
      if (this.vel.x !== 0 || this.vel.y !== 0) more = true;
      else this.settled();
    }
    const moved = this.baseDirty;
    const view = { ...this.vp, devicePixelRatio: this.dpr };
    if (moved) {
      this.baseDirty = false;
      if (this.renderer && this.vp.width > 0) {
        if (this.renderer.render(this.ctx, toRenderCamera(this.cam, this.vp), view)) more = true;
      }
      this.pins.update(this.cam, this.vp);
    }
    if (this.lifeFrame(now, moved, view)) this.request();
    if (more) this.invalidate();
  };

  /** Advances and draws city life when due; returns true while it keeps moving. */
  private lifeFrame(now: number, moved: boolean, view: Viewport): boolean {
    if (!this.life || this.vp.width === 0) return false;
    const frozen = this.o.lifeFrozen();
    // Long gaps (a hidden tab, a dropped frame) count as one short step.
    if (!frozen && this.lifeLast) this.lifeT += Math.min(0.1, (now - this.lifeLast) / 1000);
    this.lifeLast = frozen ? 0 : now;
    const due = moved || this.lifeStale || (!frozen && now - this.lifeDrawnAt >= 1000 / LIFE_FPS);
    if (due) {
      this.lifeStale = false;
      this.lifeDrawnAt = now;
      this.life.draw(this.lifeCtx, toRenderCamera(this.cam, this.vp), view, this.lifeT);
    }
    return !frozen;
  }
}
