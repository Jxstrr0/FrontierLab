// DOM pins over the map canvas (ART_DIRECTION §2; the shape language is in
// markers.ts): bank crests for your branches and rivals', small "$" coins for
// open branch locations, medallions in each place type's own ink, price tags
// for buildings you rent or buy and larger seals for landmarks. At the far zoom
// nearby pins of the same group merge into clusters that show what they hold;
// at close zoom places add a short caption. Plain DOM managed imperatively:
// elements are created when the pin set changes (pinElements.tsx) and only
// their transforms are touched per frame, so a pan never re-renders Preact.
// Each pin is a real <button> (tap, keyboard, label).
import {
  FAR_ZOOM_BELOW,
  PIN_CAPTION_FROM_ZOOM,
  PIN_COIN_DOT_SCALE,
  PIN_COIN_LIFT_PX,
  PIN_COIN_PX,
  PIN_CREST_CROWN_PX,
  PIN_CREST_LIFT_PX,
  PIN_CREST_PX,
  PIN_CULL_MARGIN_PX,
  PIN_FAR_SCALE,
  PIN_HIT_PX,
  PIN_LANDMARK_LIFT_PX,
  PIN_LANDMARK_PX,
  PIN_LIFT_PX,
  PIN_MEDALLION_PX,
  PIN_TAG_LIFT_PX,
  PIN_TAG_PX,
} from '../../config/mapView';
import { worldToScreen, type Size, type ViewCamera } from './camera';
import { clusterLevel, clusterPins, clusterRadius, type Cluster } from './cluster';
import { clusterGroup, stackTier } from './markers';
import { makeClusterElement, makePinElement } from './pinElements';
import type { PinSpec } from './pins';
import './pins.css';

export interface PinTargets {
  onPin(pin: PinSpec): void;
  onCluster(cluster: Cluster<PinSpec>): void;
}

interface Placed {
  el: HTMLButtonElement;
  x: number;
  y: number;
  /** Last transform written, to skip identical writes ('' = hidden). */
  shown: string;
  /** What the element shows, to reuse it when nothing changed. */
  key: string;
}

const pinKey = (p: PinSpec) =>
  `${p.kind}|${p.ink}|${p.monogram}|${p.label}|${p.badge}|${p.alert ?? false}|${p.x}|${p.y}|` +
  `${p.converting?.progress ?? ''}|${p.tag ?? ''}|${p.partner ?? false}|${p.muted ?? false}|${p.caption ?? ''}`;

/** Pin geometry from config/mapView.ts, as CSS custom properties on the pin layer (map.css). */
const GEOMETRY: Record<string, number> = {
  '--pin-size': PIN_MEDALLION_PX,
  '--pin-hit': PIN_HIT_PX,
  '--pin-lift': PIN_LIFT_PX,
  '--crest-h': PIN_CREST_PX.h,
  '--crest-lift': PIN_CREST_LIFT_PX,
  '--crest-crown': PIN_CREST_CROWN_PX,
  '--seal-size': PIN_LANDMARK_PX,
  '--seal-lift': PIN_LANDMARK_LIFT_PX,
  '--coin-size': PIN_COIN_PX,
  '--coin-lift': PIN_COIN_LIFT_PX,
  '--tag-h': PIN_TAG_PX,
  '--tag-lift': PIN_TAG_LIFT_PX,
};
const FAR_SCALES: Record<string, number> = {
  '--far-crest': PIN_FAR_SCALE.crest,
  '--far-mine': PIN_FAR_SCALE.mine,
  '--far-medallion': PIN_FAR_SCALE.medallion,
  '--far-seal': PIN_FAR_SCALE.landmark,
  '--far-coin': PIN_FAR_SCALE.coin,
  '--far-tag': PIN_FAR_SCALE.tag,
  '--dot-coin': PIN_COIN_DOT_SCALE,
};

export class PinLayer {
  private pins: PinSpec[] = [];
  private byId = new Map<string, PinSpec>();
  private els = new Map<string, Placed>();
  private clusters: Cluster<PinSpec>[] = [];
  private clusterAt = -1;
  private clusterEls = new Map<string, Placed>();
  private hidden = new Set<string>();
  private far = false;
  private close = false;
  /** Milliseconds spent in the last update (for the debug hook). */
  lastUpdateMs = 0;

  constructor(
    private host: HTMLElement,
    private targets: PinTargets,
  ) {
    host.addEventListener('click', this.onClick);
    for (const [k, v] of Object.entries(GEOMETRY)) host.style.setProperty(k, `${v}px`);
    for (const [k, v] of Object.entries(FAR_SCALES)) host.style.setProperty(k, String(v));
  }

  /** Replaces the pin set; pins whose look didn't change keep their element. */
  setPins(pins: PinSpec[]): void {
    this.pins = pins;
    this.byId = new Map(pins.map((p) => [p.id, p]));
    for (const [id, placed] of this.els) {
      if (!this.byId.has(id)) {
        placed.el.remove();
        this.els.delete(id);
      }
    }
    for (const p of pins) {
      const key = pinKey(p);
      const old = this.els.get(p.id);
      if (old && old.key === key) continue;
      old?.el.remove();
      const el = makePinElement(p);
      // Yours always on top, open locations at the bottom; otherwise lower on the map in front.
      el.style.zIndex = String(stackOrder(p.y, stackTier(p.kind)));
      this.host.appendChild(el);
      this.els.set(p.id, { el, x: p.x, y: p.y, shown: '', key });
    }
    // Clusters are rebuilt from the new pins on the next far-zoom frame.
    this.clusterAt = -1;
    this.clusters = [];
    for (const placed of this.clusterEls.values()) placed.el.remove();
    this.clusterEls.clear();
  }

  /** Positions every pin for the camera. Cheap: transforms only. */
  update(cam: ViewCamera, vp: Size): void {
    const t0 = performance.now();
    const far = cam.zoom < FAR_ZOOM_BELOW;
    if (far !== this.far) {
      this.far = far;
      this.host.classList.toggle('is-far', far);
    }
    const close = cam.zoom >= PIN_CAPTION_FROM_ZOOM;
    if (close !== this.close) {
      this.close = close;
      this.host.classList.toggle('is-close', close);
    }
    const hidden = this.hidden;
    hidden.clear();
    if (far) {
      const level = clusterLevel(cam.zoom);
      if (level !== this.clusterAt) this.recluster(level, cam.zoom);
      for (const c of this.clusters) {
        if (c.members.length === 1) continue;
        for (const m of c.members) hidden.add(m.id);
        this.place(this.clusterEls.get(c.key)!, cam, vp);
      }
    } else {
      for (const placed of this.clusterEls.values()) hide(placed);
    }
    for (const [id, placed] of this.els) {
      if (hidden.has(id)) hide(placed);
      else this.place(placed, cam, vp);
    }
    this.lastUpdateMs = performance.now() - t0;
  }

  dispose(): void {
    this.host.removeEventListener('click', this.onClick);
    this.host.replaceChildren();
    this.els.clear();
    this.clusterEls.clear();
  }

  private place(p: Placed, cam: ViewCamera, vp: Size): void {
    const s = worldToScreen(cam, vp, p.x, p.y);
    const m = PIN_CULL_MARGIN_PX;
    if (s.x < -m || s.y < -m || s.x > vp.width + m || s.y > vp.height + m + PIN_LANDMARK_PX) {
      hide(p);
      return;
    }
    const tf = `translate3d(${s.x.toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
    if (tf !== p.shown) {
      if (p.shown === '') p.el.style.display = '';
      p.el.style.transform = tf;
      p.shown = tf;
    }
  }

  private recluster(level: number, zoom: number): void {
    this.clusterAt = level;
    // Only like with like: your branches, rival branches, open locations, places, tags.
    this.clusters = clusterPins(this.pins, clusterRadius(zoom), clusterGroup);
    for (const placed of this.clusterEls.values()) placed.el.remove();
    this.clusterEls.clear();
    for (const c of this.clusters) {
      if (c.members.length === 1) continue;
      const el = makeClusterElement(c);
      el.style.zIndex = String(stackOrder(c.y, stackTier(c.members[0]!.kind)));
      this.host.appendChild(el);
      this.clusterEls.set(c.key, { el, x: c.x, y: c.y, shown: '', key: c.key });
    }
  }

  private onClick = (e: MouseEvent) => {
    const el = (e.target as Element).closest<HTMLElement>('.map-pin');
    if (!el) return;
    const clusterKey = el.dataset.cluster;
    if (clusterKey !== undefined) {
      const c = this.clusters.find((x) => x.key === clusterKey);
      if (c) this.targets.onCluster(c);
      return;
    }
    const pin = this.byId.get(el.dataset.lotId ?? '');
    if (pin) this.targets.onPin(pin);
  };
}

/** z-index from world y (always ≥ 0 for map points), lifted by stacking tier (markers.ts). */
const TIER_LIFT = 1_000_000;
const stackOrder = (y: number, tier: number) => Math.round(y) + tier * TIER_LIFT;

function hide(p: Placed): void {
  if (p.shown === '') return;
  p.el.style.display = 'none';
  p.shown = '';
}
