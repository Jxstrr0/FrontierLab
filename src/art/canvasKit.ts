// Canvas plumbing for the engraved map (ART_DIRECTION §2): offscreen canvases,
// ink colours and the cached 45° hatch patterns. Hatches are built in device
// pixels for one zoom stop and pinned to the world origin with
// pattern.setTransform, so they line up across chunk borders and stay crisp.

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

/** A canvas for off-screen drawing: OffscreenCanvas where available. */
export function createCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function context2d(c: AnyCanvas): Ctx2D {
  const ctx = c.getContext('2d') as Ctx2D | null;
  if (!ctx) throw new Error('2D canvas unavailable');
  return ctx;
}

/** Releases a canvas's pixel memory right away (iOS frees it on width = 0). */
export function freeCanvas(c: AnyCanvas): void {
  c.width = 0;
  c.height = 0;
}

/** `#rrggbb` to an rgba() string at the given alpha. */
export function rgba(hex: string, alpha: number): string {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

/** Mixes two `#rrggbb` colours (t = 0 gives a) into an opaque rgb() string. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace('#', ''), 16);
  const pb = parseInt(b.replace('#', ''), 16);
  const ch = (s: number) =>
    Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t).toString();
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export interface HatchSpec {
  /** Line spacing along the axis, in CSS px. */
  spacing: number;
  /** Line thickness in CSS px. */
  weight: number;
  /** Ink opacity of the lines. */
  alpha: number;
  /** 1 for "/" lines, -1 for "\" lines. */
  dir: 1 | -1;
  /** Opaque paper behind the lines (faces) or transparent (shadows). */
  opaque: boolean;
}

/**
 * A repeating 45° hatch, one tile of `period` device px. Lines are drawn three
 * times (shifted by ±period) so they wrap seamlessly at the tile edges.
 */
export function makeHatch(
  ctx: Ctx2D,
  spec: HatchSpec,
  ink: string,
  paper: string,
  devicePerCss: number,
  worldScale: number,
): CanvasPattern {
  const period = Math.max(2, Math.round(spec.spacing * devicePerCss));
  const tile = createCanvas(period, period);
  const t = context2d(tile);
  if (spec.opaque) {
    t.fillStyle = paper;
    t.fillRect(0, 0, period, period);
  }
  t.strokeStyle = rgba(ink, spec.alpha);
  t.lineWidth = Math.max(0.5, spec.weight * devicePerCss);
  t.lineCap = 'square';
  t.beginPath();
  for (const off of [-period, 0, period]) {
    if (spec.dir === 1) {
      t.moveTo(off, period);
      t.lineTo(off + period, 0);
    } else {
      t.moveTo(off, 0);
      t.lineTo(off + period, period);
    }
  }
  t.stroke();
  const pattern = ctx.createPattern(tile as CanvasImageSource, 'repeat');
  if (!pattern) throw new Error('pattern unavailable');
  // One pattern pixel per device pixel, anchored at the world origin.
  pattern.setTransform(new DOMMatrix([1 / worldScale, 0, 0, 1 / worldScale, 0, 0]));
  return pattern;
}
