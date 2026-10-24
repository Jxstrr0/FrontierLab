// Dev-only map lab (maplab.html): renders one city full-window with the
// engraved renderer, drag-to-pan, wheel zoom and an fps / ms readout, for
// visual iteration and scripted screenshots. Params: ?city=sas&zoom=1&seed=42
// &cx=20&cy=20 (tile to centre on) &hud=0 (hide readout). Never shipped.
import '@fontsource/public-sans/600.css';
import { ZOOM_MAX, ZOOM_MIN } from '../../config/map';
import { CITIES } from '../../data/cities';
import { newGame } from '../../sim/newGame';
import { generateCityMap } from '../citygen';
import { tileCenter } from '../iso';
import { createMapRenderer } from '../isoRenderer';
import type { Camera, LotOccupant } from '../mapRenderer';

const PAPER = '#E3E9DF';
const PLAYER_INK = '#2C4A7A';
const PLAYER_LOTS = 3;

const params = new URLSearchParams(location.search);
const cityId = params.get('city') ?? 'sas';
const seed = Number(params.get('seed') ?? 42);
const city = CITIES[cityId] ?? CITIES.sas!;
const state = newGame({ seed, cityId: city.id });
const lots = Object.values(state.world.lots).filter((l) => l.cityId === city.id);
const map = generateCityMap(city, seed, lots);

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

const renderer = createMapRenderer(map, { ink: city.ink, paper: PAPER, cityName: city.name });
renderer.setOccupants(occupants);

const canvas = document.getElementById('map') as HTMLCanvasElement;
const hud = document.getElementById('hud') as HTMLDivElement;
if (params.get('hud') === '0') hud.style.display = 'none';
const ctx = canvas.getContext('2d')!;

const cam: Camera = { x: 0, y: 0, zoom: Number(params.get('zoom') ?? 1) };
const focus = tileCenter(
  map.tiles,
  Number(params.get('cx') ?? city.tiles / 2),
  Number(params.get('cy') ?? city.tiles / 2),
);
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
  },
});
