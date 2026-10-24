// DOM pins over the map canvas (ART_DIRECTION §2): medallions for branches
// and your HQ, plain "$" medallions for open branch locations, type
// medallions for credit bureaus and agencies (employers and universities you
// partner with add a brand-ink seal), brass "For lease" tags for
// office buildings you can rent, and count medallions for clusters at the far
// zoom. Plain DOM managed imperatively: elements are created when the
// pin set changes and only their transforms are touched per frame, so a pan
// never re-renders Preact. Each pin is a real <button> (tap, keyboard, label).
import { h, render } from 'preact';
import {
  FAR_ZOOM_BELOW,
  PIN_CULL_MARGIN_PX,
  PIN_HIT_PX,
  PIN_LIFT_PX,
  PIN_MEDALLION_PX,
} from '../../config/mapView';
import { Medallion } from '../components';
import { LayerIcon, LayerMedallion } from './LayerIcon';
import { worldToScreen, type Size, type ViewCamera } from './camera';
import { clusterLevel, clusterPins, clusterRadius, type Cluster } from './cluster';
import { isYours, type PinSpec } from './pins';

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
  `${p.kind}|${p.ink}|${p.monogram}|${p.label}|${p.badge}|${p.x}|${p.y}`;

export class PinLayer {
  private pins: PinSpec[] = [];
  private byId = new Map<string, PinSpec>();
  private els = new Map<string, Placed>();
  private clusters: Cluster<PinSpec>[] = [];
  private clusterAt = -1;
  private clusterEls = new Map<string, Placed>();
  private hidden = new Set<string>();
  private far = false;
  /** Milliseconds spent in the last update (for the debug hook). */
  lastUpdateMs = 0;

  constructor(
    private host: HTMLElement,
    private targets: PinTargets,
  ) {
    host.addEventListener('click', this.onClick);
    host.style.setProperty('--pin-size', `${PIN_MEDALLION_PX}px`);
    host.style.setProperty('--pin-hit', `${PIN_HIT_PX}px`);
    host.style.setProperty('--pin-lift', `${PIN_LIFT_PX}px`);
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
      // Your branches and HQ always on top; otherwise lower on the map draws in front.
      el.style.zIndex = String(stackOrder(p.y, isYours(p)));
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
    if (s.x < -m || s.y < -m || s.x > vp.width + m || s.y > vp.height + m + PIN_MEDALLION_PX) {
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
    this.clusters = clusterPins(this.pins, clusterRadius(zoom));
    for (const placed of this.clusterEls.values()) placed.el.remove();
    this.clusterEls.clear();
    for (const c of this.clusters) {
      if (c.members.length === 1) continue;
      const el = makeClusterElement(c);
      el.style.zIndex = String(stackOrder(c.y, c.members.some(isYours)));
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

/** z-index from world y (always ≥ 0 for map points); yours lifted above every other pin. */
const MINE_LIFT = 1_000_000;
const stackOrder = (y: number, mine: boolean) => Math.round(y) + (mine ? MINE_LIFT : 0);

function hide(p: Placed): void {
  if (p.shown === '') return;
  p.el.style.display = 'none';
  p.shown = '';
}

const LEASE_TAG_ICON_PX = 13;

/** Open branch location: a blank ivory medallion with a plain "$" (ART_DIRECTION §2). */
const LOT_MEDALLION_SVG =
  `<svg class="medallion" width="${PIN_MEDALLION_PX}" height="${PIN_MEDALLION_PX}" viewBox="0 0 30 30">` +
  '<circle cx="15" cy="15" r="14" fill="var(--ivory)" stroke="var(--brass)" stroke-width="1.5"/>' +
  '<circle cx="15" cy="15" r="11.5" fill="none" stroke="var(--brass)" stroke-width="0.6" stroke-dasharray="1 1.2"/>' +
  '<text x="15" y="15.5" text-anchor="middle" dominant-baseline="central" class="medallion-text" fill="var(--ledger-ink)">$</text>' +
  '</svg>';

function makePinElement(p: PinSpec): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `map-pin pin-${p.kind}${p.muted ? ' is-muted' : ''}`;
  el.dataset.lotId = p.id;
  // Rival head offices wear the bank's ink as a ring and pennant (map.css).
  if (p.kind === 'rivalHq' && p.ink) el.style.setProperty('--pin-ink', p.ink);
  el.setAttribute('aria-label', p.label);
  el.style.display = 'none';
  if (p.kind === 'office') {
    // Rentable building: the For lease tag with the building type's icon.
    const tag = document.createElement('span');
    tag.className = 'pin-tag';
    tag.setAttribute('aria-hidden', 'true');
    if (p.icon) render(h(LayerIcon, { id: p.icon, size: LEASE_TAG_ICON_PX }), tag);
    tag.insertAdjacentText('beforeend', 'For lease');
    el.appendChild(tag);
  } else if (p.kind === 'lot') {
    el.innerHTML = `<span class="pin-body" aria-hidden="true">${LOT_MEDALLION_SVG}</span>`;
  } else {
    const body = document.createElement('span');
    body.className = 'pin-body';
    render(
      p.icon
        ? h(LayerMedallion, { id: p.icon, size: PIN_MEDALLION_PX })
        : h(Medallion, {
            ink: p.ink,
            monogram: p.monogram,
            size: PIN_MEDALLION_PX,
            ring: p.kind === 'rival',
          }),
      body,
    );
    el.appendChild(body);
  }
  if (p.partner) {
    // Your employer or university partner: a small brand-ink seal with an ivory tick.
    const seal = document.createElement('span');
    seal.className = 'pin-partner';
    seal.setAttribute('aria-hidden', 'true');
    seal.style.setProperty('--pin-ink', p.ink);
    seal.innerHTML = PARTNER_SEAL_SVG;
    el.appendChild(seal);
  }
  if (p.badge)
    el.insertAdjacentHTML('beforeend', '<span class="pin-badge" aria-hidden="true"></span>');
  return el;
}

const PARTNER_SEAL_SVG =
  '<svg viewBox="0 0 14 14" width="14" height="14"><path d="M3.8 7.2l2.1 2.1 4.3-4.6" ' +
  'fill="none" stroke="var(--ivory)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function makeClusterElement(c: Cluster<PinSpec>): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  const mine = c.members.filter(isYours);
  el.className = `map-pin pin-cluster${mine.length ? ' has-mine' : ''}`;
  if (mine[0]) el.style.setProperty('--pin-ink', mine[0].ink);
  el.dataset.cluster = c.key;
  const n = c.members.length;
  el.setAttribute(
    'aria-label',
    `${n} places${mine.length ? `, ${mine.length} of them yours` : ''}. Zoom in`,
  );
  el.style.display = 'none';
  el.innerHTML = `<span class="pin-count" aria-hidden="true">${n > 99 ? '99+' : n}</span>`;
  if (c.members.some((m) => m.badge))
    el.insertAdjacentHTML('beforeend', '<span class="pin-badge" aria-hidden="true"></span>');
  return el;
}
