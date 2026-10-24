// Touch, mouse and trackpad input for the map (SCREENS §2), via Pointer Events
// on the map container: one-finger drag pans (with a fling velocity on
// release), two fingers pinch-zoom and pan about their midpoint, the wheel
// zooms about the cursor, and a double tap zooms in. Pins are buttons inside
// the container, so a drag that starts on a pin still pans; once a pointer has
// moved past TAP_SLOP_PX the click that would follow is swallowed in the
// capture phase, so the pin doesn't open.
import {
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  FLING_REST_MS,
  INERTIA_MAX_SPEED,
  PINCH_WHEEL_ZOOM_PER_PX,
  TAP_SLOP_PX,
  VELOCITY_WINDOW_MS,
  WHEEL_LINE_PX,
  WHEEL_PAGE_PX,
  WHEEL_ZOOM_PER_PX,
} from '../../config/mapView';
import type { Vec } from './camera';

export interface GestureHandlers {
  /** A finger or button went down: stop any glide or tween. */
  start(): void;
  pan(dx: number, dy: number): void;
  pinchStart(mid: Vec): void;
  /** `scale` is relative to the finger distance at pinchStart. */
  pinch(mid: Vec, scale: number): void;
  /** The last finger lifted after a drag; velocity in CSS px/s. */
  release(vx: number, vy: number): void;
  wheel(factor: number, at: Vec): void;
  doubleTap(at: Vec): void;
}

interface Track {
  id: number;
  start: Vec;
  last: Vec;
}

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Wires gestures to `el`; returns a function that removes every listener. */
export function attachGestures(el: HTMLElement, on: GestureHandlers): () => void {
  const tracks: Track[] = [];
  let moved = false;
  let suppressClick = false;
  let pinchDist = 0;
  let samples: { t: number; x: number; y: number }[] = [];
  let lastTap: { t: number; at: Vec } | null = null;
  // Local coordinates: also correct if an ancestor is CSS-zoomed (text size).
  let rect = el.getBoundingClientRect();
  let ratio = 1;

  const local = (e: { clientX: number; clientY: number }): Vec => ({
    x: (e.clientX - rect.left) * ratio,
    y: (e.clientY - rect.top) * ratio,
  });
  const measure = () => {
    rect = el.getBoundingClientRect();
    ratio = rect.width > 0 ? el.offsetWidth / rect.width : 1;
  };

  const beginPinch = () => {
    const [a, b] = tracks;
    pinchDist = Math.max(1, dist(a!.last, b!.last));
    on.pinchStart(midpoint(a!.last, b!.last));
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (tracks.length >= 2) return;
    if (tracks.length === 0) {
      measure();
      moved = false;
      suppressClick = false;
      samples = [];
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    const p = local(e);
    tracks.push({ id: e.pointerId, start: p, last: p });
    on.start();
    if (tracks.length === 2) {
      moved = true;
      beginPinch();
    } else {
      samples.push({ t: e.timeStamp, x: p.x, y: p.y });
    }
  };

  const onMove = (e: PointerEvent) => {
    const t = tracks.find((x) => x.id === e.pointerId);
    if (!t) return;
    const p = local(e);
    const prev = t.last;
    t.last = p;
    if (!moved && dist(p, t.start) > TAP_SLOP_PX) moved = true;
    if (tracks.length === 2) {
      const [a, b] = tracks;
      on.pinch(midpoint(a!.last, b!.last), dist(a!.last, b!.last) / pinchDist);
    } else {
      on.pan(p.x - prev.x, p.y - prev.y);
      samples.push({ t: e.timeStamp, x: p.x, y: p.y });
      if (samples.length > 12) samples.shift();
    }
  };

  const finish = (e: PointerEvent, cancelled: boolean) => {
    const i = tracks.findIndex((x) => x.id === e.pointerId);
    if (i < 0) return;
    tracks.splice(i, 1);
    if (moved) suppressClick = true;
    if (tracks.length === 1) {
      // Pinch → pan with the remaining finger, from where it is now.
      samples = [{ t: e.timeStamp, ...tracks[0]!.last }];
      return;
    }
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    if (cancelled) return;
    if (moved) {
      const v = releaseVelocity(samples, e.timeStamp);
      on.release(v.x, v.y);
      lastTap = null;
      return;
    }
    // A tap. Pins handle their own taps (click); empty map only knows double taps.
    const onPin = (e.target as Element | null)?.closest?.('.map-pin');
    const at = local(e);
    if (onPin) lastTap = null;
    else if (
      lastTap &&
      e.timeStamp - lastTap.t < DOUBLE_TAP_MS &&
      dist(at, lastTap.at) < DOUBLE_TAP_SLOP_PX
    ) {
      lastTap = null;
      on.doubleTap(at);
    } else lastTap = { t: e.timeStamp, at };
  };
  const onUp = (e: PointerEvent) => finish(e, false);
  const onCancel = (e: PointerEvent) => finish(e, true);

  // Runs before the pin's own click handler: a drag is never a tap.
  const onClickCapture = (e: MouseEvent) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    measure();
    const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? WHEEL_PAGE_PX : 1;
    const k = e.ctrlKey ? PINCH_WHEEL_ZOOM_PER_PX : WHEEL_ZOOM_PER_PX;
    on.start();
    on.wheel(Math.exp(-e.deltaY * unit * k), local(e));
  };

  // iOS Safari: stop its own page pinch-zoom and rubber-band scrolling.
  const stop = (e: Event) => e.preventDefault();

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('click', onClickCapture, true);
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  el.addEventListener('contextmenu', stop);

  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('click', onClickCapture, true);
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('touchmove', stop);
    document.removeEventListener('gesturestart', stop);
    document.removeEventListener('gesturechange', stop);
    el.removeEventListener('contextmenu', stop);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  };
}

/**
 * Fling velocity from the last VELOCITY_WINDOW_MS of movement, in CSS px/s,
 * capped at INERTIA_MAX_SPEED; zero if the finger rested before lifting.
 */
export function releaseVelocity(samples: { t: number; x: number; y: number }[], now: number): Vec {
  const last = samples[samples.length - 1];
  if (!last || now - last.t > FLING_REST_MS) return { x: 0, y: 0 };
  const first = samples.find((s) => last.t - s.t <= VELOCITY_WINDOW_MS) ?? last;
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0) return { x: 0, y: 0 };
  let vx = (last.x - first.x) / dt;
  let vy = (last.y - first.y) / dt;
  const speed = Math.hypot(vx, vy);
  if (speed > INERTIA_MAX_SPEED) {
    vx *= INERTIA_MAX_SPEED / speed;
    vy *= INERTIA_MAX_SPEED / speed;
  }
  return { x: vx, y: vy };
}
