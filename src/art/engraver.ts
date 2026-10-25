// The engraver: drawing state for one zoom stop (ink, hatch patterns, line
// weights, level of detail) plus tile-local path helpers. Building and ground
// painters draw through it in tile space — (a, b) across a footprint and z in
// world px up — so every shape lands on the 2:1 isometric grid (ART_DIRECTION §2).
// It also carries the city's look (data/cityLooks.ts): the local building style
// and the pale "tint" underprint ink used on roofs, lawns and tree crowns.
import { STOREY_PX } from '../config/map';
import { cityLook, type CityLook, type Vernacular } from '../data/cityLooks';
import { makeHatch, mix, rgba, type Ctx2D } from './canvasKit';
import { isoPoint } from './iso';
import { paperPattern, waterPattern } from './printPatterns';

/** Visual tuning per zoom stop index (0.5, 1, 2), in CSS px at that stop. */
const LOOK = {
  outline: [0.75, 1.15, 1.5],
  detail: [0.45, 0.65, 0.85],
  hatchWeight: [0.42, 0.5, 0.62],
  light: [3.2, 4.4, 5.6],
  medium: [2.1, 2.9, 3.6],
  dense: [1.4, 1.9, 2.4],
  shadow: [1.8, 2.4, 3],
  hatchAlpha: 0.78,
  shadowAlpha: 0.45,
} as const;

/**
 * The tint underprint (ART_DIRECTION §2.1): banknotes print a pale second ink
 * under the engraving. Roofs take the tint mixed into the paper (under their
 * hatching), lawns a see-through wash and tree crowns a slightly stronger mix.
 * Kept low so the map still reads as ink lines on paper.
 */
const TINT = {
  roof: 0.34,
  crown: 0.5,
  lawnAlpha: 0.3,
} as const;

export type Fill =
  | 'paper'
  | 'light'
  | 'medium'
  | 'dense'
  | 'shadow'
  | 'roof'
  | 'roofLight'
  | 'roofMedium'
  | 'roofDense'
  | 'lawn'
  | 'crown'
  | 'water'
  | 'none'
  | (string & {});
export type Vec3 = readonly [number, number, number];
type Hatch = 'light' | 'medium' | 'dense' | 'shadow';
type RoofHatch = 'roofLight' | 'roofMedium' | 'roofDense';

function isHatch(f: Fill): f is Hatch {
  return f === 'light' || f === 'medium' || f === 'dense' || f === 'shadow';
}

function isRoofHatch(f: Fill): f is RoofHatch {
  return f === 'roofLight' || f === 'roofMedium' || f === 'roofDense';
}

export interface InkSet {
  ink: string;
  paper: string;
  /** 0, 1, 2 for the 0.5, 1 and 2 zoom stops: how much detail to draw. */
  lod: number;
  stop: number;
  patterns: Record<Hatch, CanvasPattern>;
  /** Hatches over tinted paper, for roof slopes (the underprint). */
  roofPatterns: Record<RoofHatch, CanvasPattern>;
  /** The city's tint ink, and opaque/see-through colours made from it. */
  tint: string;
  roof: string;
  crown: string;
  lawn: string;
  /** Paper with the guilloche mesh, and tinted water with waves (opaque). */
  paperPrint: CanvasPattern;
  waterPrint: CanvasPattern;
  /** Line widths in world px. */
  outline: number;
  detail: number;
  /** Cached ink colours at common opacities. */
  inkA: (alpha: number) => string;
}

export function makeInkSet(
  ctx: Ctx2D,
  ink: string,
  paper: string,
  stopIndex: number,
  stop: number,
  dpr: number,
  tint: string = paper,
): InkSet {
  const i = stopIndex;
  const w = LOOK.hatchWeight[i]!;
  const scale = stop * dpr;
  const roof = mix(paper, tint, TINT.roof);
  const hatch = (spacing: number, dir: 1 | -1, alpha: number, opaque: boolean, bg = paper) =>
    makeHatch(ctx, { spacing, weight: w, alpha, dir, opaque }, ink, bg, dpr, scale);
  const cache = new Map<number, string>();
  return {
    ink,
    paper,
    lod: i,
    stop,
    patterns: {
      light: hatch(LOOK.light[i]!, -1, LOOK.hatchAlpha, true),
      medium: hatch(LOOK.medium[i]!, 1, LOOK.hatchAlpha, true),
      dense: hatch(LOOK.dense[i]!, 1, LOOK.hatchAlpha, true),
      shadow: hatch(LOOK.shadow[i]!, 1, LOOK.shadowAlpha, false),
    },
    roofPatterns: {
      roofLight: hatch(LOOK.light[i]!, -1, LOOK.hatchAlpha, true, roof),
      roofMedium: hatch(LOOK.medium[i]!, 1, LOOK.hatchAlpha, true, roof),
      roofDense: hatch(LOOK.dense[i]!, 1, LOOK.hatchAlpha, true, roof),
    },
    tint,
    roof,
    crown: mix(paper, tint, TINT.crown),
    lawn: rgba(tint, TINT.lawnAlpha),
    paperPrint: paperPattern(ctx, ink, paper, i, stop, dpr),
    waterPrint: waterPattern(ctx, ink, paper, i, stop, dpr),
    outline: LOOK.outline[i]! / stop,
    detail: LOOK.detail[i]! / stop,
    inkA: (alpha) => {
      let s = cache.get(alpha);
      if (!s) cache.set(alpha, (s = rgba(ink, alpha)));
      return s;
    },
  };
}

export class Engraver {
  ctx!: Ctx2D;
  ox = 0;
  oy = 0;
  /** While batching, segments() collects strokes by width and alpha instead of drawing. */
  private batch: Map<string, { width: number; alpha: number; segs: [Vec3, Vec3][] }> | null = null;
  /** While batching polygons too, poly() collects shapes by fill and outline. */
  private polyBatch: Map<string, { fill: Fill; stroke: number | null; list: Vec3[][] }> | null =
    null;

  constructor(
    readonly inks: InkSet,
    readonly tiles: number,
    readonly look: CityLook = cityLook(''),
  ) {}

  get lod(): number {
    return this.inks.lod;
  }

  /** The city's local building style. */
  get style(): Vernacular {
    return this.look.style;
  }

  /** Sets the tile whose top corner is local (0, 0). */
  origin(x: number, y: number): this {
    this.ox = x;
    this.oy = y;
    return this;
  }

  /** World point of local tile coords (a, b) at height z (world px). */
  pt(a: number, b: number, z: number): { x: number; y: number } {
    return isoPoint(this.tiles, this.ox + a, this.oy + b, z);
  }

  /** Storeys to world px. */
  storeys(n: number): number {
    return n * STOREY_PX;
  }

  m(a: number, b: number, z: number): void {
    const p = this.pt(a, b, z);
    this.ctx.moveTo(p.x, p.y);
  }

  l(a: number, b: number, z: number): void {
    const p = this.pt(a, b, z);
    this.ctx.lineTo(p.x, p.y);
  }

  /** Sets a fill style; returns false for 'none'. */
  setFill(fill: Fill): boolean {
    const c = this.ctx;
    if (fill === 'none') return false;
    if (fill === 'paper') c.fillStyle = this.inks.paper;
    else if (isHatch(fill)) c.fillStyle = this.inks.patterns[fill];
    else if (fill === 'roof') c.fillStyle = this.inks.roof;
    else if (fill === 'lawn') c.fillStyle = this.inks.lawn;
    else if (fill === 'crown') c.fillStyle = this.inks.crown;
    else if (fill === 'water') c.fillStyle = this.inks.waterPrint;
    else if (isRoofHatch(fill)) c.fillStyle = this.inks.roofPatterns[fill];
    else c.fillStyle = fill;
    return true;
  }

  /** A closed polygon in local coords, filled then outlined. */
  poly(pts: readonly Vec3[], fill: Fill, stroke: number | null = this.inks.outline): void {
    if (this.polyBatch) {
      const key = `${fill}|${stroke}`;
      let v = this.polyBatch.get(key);
      if (!v) this.polyBatch.set(key, (v = { fill, stroke, list: [] }));
      v.list.push([...pts]);
      return;
    }
    const c = this.ctx;
    c.beginPath();
    pts.forEach(([a, b, z], k) => (k === 0 ? this.m(a, b, z) : this.l(a, b, z)));
    c.closePath();
    if (this.setFill(fill)) c.fill();
    if (stroke !== null) {
      c.lineWidth = stroke;
      c.strokeStyle = this.inks.ink;
      c.stroke();
    }
  }

  /** Several closed polygons sharing one fill and outline, in one path (fewer paint calls). */
  polys(
    list: readonly (readonly Vec3[])[],
    fill: Fill,
    stroke: number | null = this.inks.outline,
  ): void {
    if (list.length === 0) return;
    const c = this.ctx;
    c.beginPath();
    for (const pts of list) {
      pts.forEach(([a, b, z], k) => (k === 0 ? this.m(a, b, z) : this.l(a, b, z)));
      c.closePath();
    }
    if (this.setFill(fill)) c.fill();
    if (stroke !== null) {
      c.lineWidth = stroke;
      c.strokeStyle = this.inks.ink;
      c.stroke();
    }
  }

  /**
   * Starts collecting line marks (and, with `polys`, flat shapes) so a whole
   * row of houses paints them in a few paths (endBatch draws them). Only for
   * marks that do not overlap one another or anything drawn later.
   */
  beginBatch(polys = false): void {
    this.batch = new Map();
    if (polys) this.polyBatch = new Map();
  }

  /** Draws what was collected: shapes first (by fill), then the line marks. */
  endBatch(): void {
    const b = this.batch;
    const p = this.polyBatch;
    this.batch = null;
    this.polyBatch = null;
    if (p) for (const v of p.values()) this.polys(v.list, v.fill, v.stroke);
    if (b) for (const v of b.values()) this.segments(v.segs, v.width, v.alpha);
  }

  /** Strokes a batch of local-space segments in one path. */
  segments(segs: readonly (readonly [Vec3, Vec3])[], width: number, alpha = 1): void {
    if (segs.length === 0) return;
    if (this.batch) {
      const key = `${width}|${alpha}`;
      let v = this.batch.get(key);
      if (!v) this.batch.set(key, (v = { width, alpha, segs: [] }));
      for (const [p, q] of segs) v.segs.push([p, q]);
      return;
    }
    const c = this.ctx;
    c.beginPath();
    for (const [p, q] of segs) {
      this.m(p[0], p[1], p[2]);
      this.l(q[0], q[1], q[2]);
    }
    c.lineWidth = width;
    c.strokeStyle = alpha === 1 ? this.inks.ink : this.inks.inkA(alpha);
    c.stroke();
  }

  /** A filled ellipse lying flat at height z: a circle of radius r (tiles) at (a, b). */
  flatCircle(a: number, b: number, z: number, r: number, fill: Fill, stroke: boolean): void {
    const c = this.ctx;
    const p = this.pt(a, b, z);
    const rx = r * Math.SQRT2 * (this.pt(1, 0, 0).x - this.pt(0, 0, 0).x);
    c.beginPath();
    c.ellipse(p.x, p.y, rx, rx / 2, 0, 0, Math.PI * 2);
    if (this.setFill(fill)) c.fill();
    if (stroke) {
      c.lineWidth = this.inks.outline;
      c.strokeStyle = this.inks.ink;
      c.stroke();
    }
  }
}
