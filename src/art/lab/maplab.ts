// Dev-only map lab (maplab.html): renders one city full-window with the
// engraved renderer, drag-to-pan, wheel zoom and an fps / ms readout, for
// visual iteration and scripted screenshots. Params: ?city=sas&zoom=1&seed=42
// &cx=20&cy=20 (tile to centre on) &hud=0 (hide readout) &layout=1 (old saves'
// shared grid) &sig=latticeTower (draw that signature landmark instead of the
// city's own) &focus=signature (centre on the signature landmark). Never shipped.
import '@fontsource/public-sans/600.css';
import { LATEST_LAYOUT } from '../../config/cityGeo';
import { SIGNATURE_HEIGHT_PX, ZOOM_MAX, ZOOM_MIN } from '../../config/map';
import { CITIES } from '../../data/cities';
import type { Signature } from '../../data/cityLooks';
import { newGame } from '../../sim/newGame';
import { cityLook } from '../../data/cityLooks';
import { context2d, createCanvas } from '../canvasKit';
import { chunksInRect, makeChunkGrid } from '../chunkGrid';
import { runChunk, startChunk, type PaintContext } from '../chunkPainter';
import { generateCityMap } from '../citygen';
import { maxItemHeight } from '../drawList';
import { makeInkSet } from '../engraver';
import { tileCenter } from '../iso';
import { createMapRenderer } from '../isoRenderer';
import type { Camera, LotOccupant } from '../mapRenderer';

const PAPER = '#DFE7E7';
const PLAYER_INK = '#2C4A7A';
const PLAYER_LOTS = 3;

const params = new URLSearchParams(location.search);
const cityId = params.get('city') ?? 'sas';
const seed = Number(params.get('seed') ?? 42);
const city = CITIES[cityId] ?? CITIES.sas!;
const layout = params.get('layout') === '1' ? 1 : LATEST_LAYOUT;
const state = newGame({ seed, cityId: city.id, layout });
const lots = Object.values(state.world.lots).filter((l) => l.cityId === city.id);
// Stage 4 offices and sites; the first office shows as leased (roof flag).
const offices = Object.values(state.world.officeListings).filter((o) => o.cityId === city.id);
const sites = Object.values(state.world.sites).filter((x) => x.cityId === city.id);
const map = generateCityMap(city, seed, lots, { offices, sites, layout });
const sigSite = map.landmarks.find((l) => l.id === 'signature') ?? map.landmarks[0];
const sigParam = params.get('sig') as Signature | null;
if (sigParam && sigSite) {
  sigSite.id = 'signature';
  sigSite.signature = sigParam;
}

// Rivals keep their lots; the player takes the free lots nearest the centre.
const occupants: Record<string, LotOccupant> = {};
for (const lot of lots) {
  if (lot.occupant?.type === 'rival') {
    occupants[lot.id] = { type: 'rival', ink: state.rivals[lot.occupant.id]?.ink ?? '#555555' };
  }
}
const mid = city.tiles / 2;
lots
  .filter((l) => !l.occupant)
  .sort(
    (a, b) =>
      Math.hypot(a.tile.x - mid, a.tile.y - mid) - Math.hypot(b.tile.x - mid, b.tile.y - mid),
  )
  .slice(0, PLAYER_LOTS)
  .forEach((l) => (occupants[l.id] = { type: 'player', ink: PLAYER_INK }));

if (offices[0]) occupants[offices[0].id] = { type: 'player', ink: PLAYER_INK };

const renderer = createMapRenderer(map, { ink: city.ink, paper: PAPER, cityName: city.name });
renderer.setOccupants(occupants);

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;
if (params.get('hud') === '0') hud.style.display = 'none';
const ctx = canvas.getContext('2d')!;

const cam: Camera = { x: 0, y: 0, zoom: Number(params.get('zoom') ?? 1) };
const onSig = params.get('focus') === 'signature' && sigSite;
const focus = onSig
  ? tileCenter(map.tiles, sigSite.x + sigSite.size / 2, sigSite.y + sigSite.size / 2)
  : tileCenter(
      map.tiles,
      Number(params.get('cx') ?? map.geo.focus.x),
      Number(params.get('cy') ?? map.geo.focus.y),
    );
if (onSig) focus.y -= SIGNATURE_HEIGHT_PX[sigSite.signature ?? 'none'] * 0.45;
cam.x = focus.x - innerWidth / 2 / cam.zoom;
cam.y = focus.y - innerHeight / 2 / cam.zoom;

let dirty = true;
/** Lets scripted runs simulate a devicePixelRatio change (e.g. moving screens). */
let dprOverride: number | null = null;
let busy = false;
const frames: number[] = [];
const costs: number[] = [];
/** Every render() cost since the last lab.resetStats(), for scripted runs. */
let allCosts: number[] = [];
let last = performance.now();

function frame(t: number) {
  const dt = t - last;
  last = t;
  const dpr = dprOverride ?? devicePixelRatio;
  const w = Math.round(innerWidth * dpr);
  const h = Math.round(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    dirty = true;
  }
  if (dirty || busy) {
    const t0 = performance.now();
    busy = renderer.render(ctx, cam, {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio: dpr,
    });
    costs.push(performance.now() - t0);
    allCosts.push(costs[costs.length - 1]!);
    frames.push(dt);
    dirty = false;
    if (costs.length > 60) costs.shift();
    if (frames.length > 60) frames.shift();
    const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
    hud.textContent =
      `${city.name} ${map.tiles}×${map.tiles}  zoom ${cam.zoom.toFixed(2)}  dpr ${dpr}\n` +
      `fps ${(1000 / avg(frames)).toFixed(0)}  render ${avg(costs).toFixed(1)} ms` +
      `  max ${Math.max(...costs).toFixed(1)}${busy ? '  painting…' : ''}`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Drag to pan, wheel to zoom about the pointer.
let drag: { x: number; y: number } | null = null;
canvas.addEventListener('pointerdown', (e) => {
  drag = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  pan(drag.x - e.clientX, drag.y - e.clientY);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('pointerup', () => (drag = null));
canvas.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    zoomAt(cam.zoom * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
  },
  { passive: false },
);

function pan(dx: number, dy: number) {
  cam.x += dx / cam.zoom;
  cam.y += dy / cam.zoom;
  dirty = true;
}

function zoomAt(z: number, sx: number, sy: number) {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
  const wx = cam.x + sx / cam.zoom;
  const wy = cam.y + sy / cam.zoom;
  cam.zoom = next;
  cam.x = wx - sx / next;
  cam.y = wy - sy / next;
  dirty = true;
}

/**
 * Paints every chunk under a 390×844 view at the map centre for one zoom stop
 * from scratch, forcing each to rasterise, and returns the best of `runs`
 * total times in ms: a steadier paint-cost number than frame timings.
 */
function bench(stopIndex: number, runs = 3, dpr = 2): number {
  const stops = [0.5, 1, 2];
  const stop = stops[stopIndex]!;
  const w = renderer.width;
  const h = renderer.height;
  const grid = makeChunkGrid(stop, dpr, 256, w, h);
  const vw = 390 / stop;
  const vh = 844 / stop;
  const range = chunksInRect(grid, { x: w / 2 - vw / 2, y: h / 2 - vh / 2, w: vw, h: vh })!;
  const probe = context2d(createCanvas(1, 1));
  const look = cityLook(city.id);
  const inks = makeInkSet(probe, city.ink, PAPER, stopIndex, stop, dpr, look.tint);
  let best = Infinity;
  for (let r = 0; r < runs; r++) {
    const pc: PaintContext = {
      map,
      look,
      cityName: city.name,
      maxHeight: maxItemHeight(map),
      occupants,
      rasterRatio: 1,
      flushTarget: context2d(createCanvas(1, 1)),
    };
    const t0 = performance.now();
    for (let j = range.j0; j <= range.j1; j++) {
      for (let i = range.i0; i <= range.i1; i++) {
        const job = startChunk(grid, i, j, pc);
        while (!runChunk(job, pc, inks, Infinity, () => performance.now()));
      }
    }
    best = Math.min(best, performance.now() - t0);
  }
  return best;
}

// Hooks for scripted runs (Playwright).
Object.assign(window, {
  lab: {
    pan,
    zoomAt,
    idle: () => !busy && !dirty,
    costs: () => allCosts,
    resetStats: () => (allCosts = []),
    camera: () => ({ ...cam }),
    occupants: () => ({ ...occupants }),
    setDpr: (d: number | null) => {
      dprOverride = d;
      dirty = true;
    },
    setOccupant: (lotId: string, occ: LotOccupant | null) => {
      if (occ) occupants[lotId] = occ;
      else delete occupants[lotId];
      renderer.setOccupants(occupants);
      dirty = true;
    },
    world: () => ({ width: renderer.width, height: renderer.height }),
    landmarks: () => map.landmarks.map((l) => ({ ...l })),
    bench,
  },
});
