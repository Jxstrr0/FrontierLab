// Paints one chunk of the map into its own canvas, a step at a time so the
// renderer can spread the work over several frames (ART_DIRECTION §2,
// Performance). Steps are the ground layers (with the tint underprint after the
// stipple) followed by every raised item that reaches into the chunk, back to
// front. The city's look (data/cityLooks.ts) rides along on the engraver.
import { drawBuilding } from './buildings';
import { drawOffice, drawSite } from './buildingsOffice';
import type { ChunkGrid, Rect } from './chunkGrid';
import { chunkRect } from './chunkGrid';
import { context2d, createCanvas, type AnyCanvas, type Ctx2D } from './canvasKit';
import type { CityLook } from '../data/cityLooks';
import { tileAt, type CityMap } from './citygen';
import { itemsInRect, type DrawItem } from './drawList';
import { Engraver, type InkSet } from './engraver';
import { parkTrees } from './flora';
import { drawGround, GROUND_STEPS, type GroundStep } from './ground';
import { drawLandmark } from './landmarks';
import type { LotOccupant } from './mapRenderer';
import { mixSeed } from './prng';
import { drawStreetLife } from './streetLife';
import { isParkMiddle, tintLayer } from './tintLayer';

type Step = { ground: GroundStep } | { tint: true } | { item: DrawItem };

export interface ChunkJob {
  canvas: AnyCanvas;
  ctx: Ctx2D;
  rect: Rect;
  steps: Step[];
  cursor: number;
}

export interface PaintContext {
  map: CityMap;
  look: CityLook;
  cityName: string;
  maxHeight: number;
  occupants: Record<string, LotOccupant>;
  /** Running estimate of raster time per ms of recorded drawing (see runChunk). */
  rasterRatio: number;
  /** A 1×1 canvas used to make a chunk rasterise its recorded drawing now. */
  flushTarget: Ctx2D;
}

/** Smoothing for the raster-ratio estimate, and its sane range. */
const RASTER_EMA = 0.25;
const RASTER_RATIO_MAX = 40;

/** Starts a chunk job, reusing `canvas` when it is the right size. */
export function startChunk(
  grid: ChunkGrid,
  i: number,
  j: number,
  pc: PaintContext,
  canvas?: AnyCanvas,
): ChunkJob {
  const size = grid.devicePx;
  const c =
    canvas && canvas.width === size && canvas.height === size ? canvas : createCanvas(size, size);
  const ctx = context2d(c);
  const rect = chunkRect(grid, i, j);
  // World px → this chunk's device px.
  ctx.setTransform(grid.scale, 0, 0, grid.scale, -i * size, -j * size);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const steps: Step[] = GROUND_STEPS.map((g) => ({ ground: g }));
  // The tint goes over the street and stipple layer, under the water.
  steps.splice(Math.max(0, GROUND_STEPS.indexOf('tiles')) + 1, 0, { tint: true });
  for (const item of itemsInRect(pc.map, rect, pc.maxHeight)) steps.push({ item });
  return { canvas: c, ctx, rect, steps, cursor: 0 };
}

/**
 * Runs steps until done or the time to `deadline` (performance.now() ms) is used;
 * always runs at least one step. Returns true once the chunk is complete.
 *
 * Browsers record canvas commands and rasterise them later (when the canvas is
 * first drawn), which would dump a whole chunk's raster cost into one frame. So
 * each slice ends by sampling the chunk into a 1×1 canvas, forcing the raster
 * now, and the measured raster/record ratio decides how much to record next time.
 */
export function runChunk(
  job: ChunkJob,
  pc: PaintContext,
  inks: InkSet,
  deadline: number,
  now: () => number,
): boolean {
  const e = new Engraver(inks, pc.map.tiles, pc.look);
  e.ctx = job.ctx;
  const start = now();
  const budget = deadline - start;
  do {
    const step = job.steps[job.cursor++]!;
    if ('ground' in step) drawGround(e, pc.map, job.rect, step.ground, pc.cityName);
    else if ('tint' in step) tintLayer(e, pc.map, job.rect);
    else drawItem(e, pc, step.item);
  } while (job.cursor < job.steps.length && (now() - start) * (1 + pc.rasterRatio) < budget);
  const recorded = now() - start;
  pc.flushTarget.drawImage(job.canvas as CanvasImageSource, 0, 0, 1, 1);
  const raster = now() - start - recorded;
  const ratio = Math.min(RASTER_RATIO_MAX, raster / Math.max(recorded, 0.05));
  pc.rasterRatio += (ratio - pc.rasterRatio) * RASTER_EMA;
  return job.cursor >= job.steps.length;
}

function drawItem(e: Engraver, pc: PaintContext, item: DrawItem): void {
  if (item.type === 'landmark') {
    const { site } = item;
    drawLandmark(e, site, mixSeed(pc.map.seed[site.y * pc.map.tiles + site.x]!, site.size));
    return;
  }
  if (drawStreetLife(e, pc.map, item.x, item.y)) return;
  const t = tileAt(pc.map, item.x, item.y)!;
  if (t.kind === 'park') parkTrees(e, t.x, t.y, t.seed, isParkMiddle(pc.map, t.x, t.y));
  else if (t.kind === 'office') drawOffice(e, t, t.officeId ? pc.occupants[t.officeId] : undefined);
  else if (t.kind === 'site') drawSite(e, t, t.siteId ? pc.occupants[t.siteId] : undefined);
  else drawBuilding(e, t, t.lotId ? pc.occupants[t.lotId] : undefined, pc.map);
}
