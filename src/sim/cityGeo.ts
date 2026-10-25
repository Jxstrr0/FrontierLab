// A city's resolved geography (ART_DIRECTION §2, DESIGN §5.2): per-tile masks
// for water, streets, bridges, the big park and storefront frontage, plus the
// district centres lots scatter around. Layout 1 is the original shared grid
// with a strip of shore (old saves keep it exactly); layout 2 gives every city
// its own water form, district arrangement and big park from data/cityLooks.ts.
// Pure functions of the city spec and the layout version, cached per pair, so
// the sim (lot placement) and the map art always agree. GameState stores only
// the version number (CityState.layout); this is derived data.
import { CITYGEN, CITY_LAYOUT } from '../config/balance';
import { DISTRICT_SQUEEZE, GEO, WATERFRONT_AT, type LayoutVersion } from '../config/cityGeo';
import type { CitySpec } from '../data/cities';
import { cityLook, type CityLook, type WaterForm } from '../data/cityLooks';
import { DISTRICTS, type DistrictId } from '../data/types';
import {
  carveCanals,
  carveIslands,
  cleanSpecks,
  distanceToShore,
  markBridges,
} from './cityGeoMasks';
import { shoreRow } from './cityLayout';
import { canonicalWater, phaseOf, toActual, toCanonical, type FormContext } from './waterForms';

export interface DistrictPlace {
  cx: number;
  cy: number;
  spread: number;
}

export interface CityGeometry {
  cityId: string;
  tiles: number;
  version: LayoutVersion;
  /** The water form drawn ('none' for dry cities; layout 1 is always 'coast' or 'none'). */
  form: WaterForm;
  /** Per tile (index y × tiles + x): 1 where water. */
  water: Uint8Array;
  /** 1 on land streets (bridges are not streets: lots never face them). */
  street: Uint8Array;
  /** Bridges over water: 1 deck runs along x (a row street), 2 along y (a column street), 3 both. */
  bridge: Uint8Array;
  /** 1 inside the big park (layout 2): no lots, sites or buildings. */
  park: Uint8Array;
  /** 1 on building tiles that face a land street, inside the edge margin. */
  frontage: Uint8Array;
  /** Tiles to the nearest tile across the shore (land ↔ water), capped at 255; 255 without water. */
  shoreDist: Uint8Array;
  /** District centres (grid fractions) and spreads, like CITYGEN.layout. */
  centres: Record<DistrictId, DistrictPlace>;
  /** The look's turn and mirror (layout 1: none); lot scatter turns with the city. */
  arrange: CityLook['arrange'];
  /** The tile the start camera centres on: the financial district, nudged toward the water. */
  focus: { x: number; y: number };
}

const cache = new Map<string, CityGeometry>();
const sq = (v: number) => v * v;

/** The city's geometry at a layout version (memoised: it never changes). */
export function cityGeometry(city: CitySpec, version: LayoutVersion): CityGeometry {
  const key = `${city.id}:${city.tiles}:${version}`;
  let geo = cache.get(key);
  if (!geo) {
    geo = version === 1 ? buildLayout1(city) : buildLayout2(city);
    cache.set(key, geo);
  }
  return geo;
}

function blank(city: CitySpec, version: LayoutVersion, form: WaterForm): CityGeometry {
  const size = city.tiles * city.tiles;
  return {
    cityId: city.id,
    tiles: city.tiles,
    version,
    form,
    water: new Uint8Array(size),
    street: new Uint8Array(size),
    bridge: new Uint8Array(size),
    park: new Uint8Array(size),
    frontage: new Uint8Array(size),
    shoreDist: new Uint8Array(size).fill(255),
    centres: { ...CITYGEN.layout },
    arrange: { turn: 0, mirror: false },
    focus: { x: 0, y: 0 },
  };
}

/** Layout 1: streets every block, water below a wavy shore row (unchanged since Stage 3). */
function buildLayout1(city: CitySpec): CityGeometry {
  const geo = blank(city, 1, city.water ? 'coast' : 'none');
  const n = city.tiles;
  const b = CITY_LAYOUT.block;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (y >= shoreRow(city, x)) geo.water[i] = 1;
      else if (x % b === 0 || y % b === 0) geo.street[i] = 1;
    }
  }
  finish(geo);
  const f = geo.centres.financial;
  geo.focus = { x: f.cx * n, y: f.cy * n };
  return geo;
}

/** Layout 2: the look's water form, bridges, big park and fitted district centres. */
function buildLayout2(city: CitySpec): CityGeometry {
  const look = cityLook(city.id);
  const form: WaterForm = city.water ? (look.water === 'none' ? 'coast' : look.water) : 'none';
  const geo = blank(city, 2, form);
  geo.arrange = look.arrange;
  const n = city.tiles;
  const ctx: FormContext = {
    tiles: n,
    phase: [phaseOf(`${city.id}:a`), phaseOf(`${city.id}:b`), phaseOf(`${city.id}:c`)],
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const [u, v] = toCanonical(look, (x + 0.5) / n, (y + 0.5) / n);
      if (canonicalWater(form, u, v, ctx)) geo.water[y * n + x] = 1;
    }
  }
  if (form === 'islands') carveIslands(geo, look, ctx);
  if (form === 'canals') carveCanals(geo, look);
  cleanSpecks(geo);
  geo.shoreDist = distanceToShore(geo);
  geo.centres = fitCentres(geo, look, form);
  if (look.bigPark) {
    placeBigPark(geo, city);
    // Refit so no district centre sits inside the park.
    geo.centres = fitCentres(geo, look, form);
  }
  const b = CITY_LAYOUT.block;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = y * n + x;
      if (!geo.water[i] && !geo.park[i] && (x % b === 0 || y % b === 0)) geo.street[i] = 1;
    }
  }
  markBridges(geo);
  finish(geo);
  geo.focus = focusFor(geo);
  return geo;
}

/** Frontage: building tiles in the edge margin with a land street beside them. */
function finish(geo: CityGeometry): void {
  const n = geo.tiles;
  const m = CITY_LAYOUT.edgeTiles;
  const street = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < n && y < n && geo.street[y * n + x] === 1;
  for (let y = m; y < n - m; y++) {
    for (let x = m; x < n - m; x++) {
      const i = y * n + x;
      if (geo.water[i] || geo.street[i] || geo.park[i]) continue;
      if (street(x + 1, y) || street(x - 1, y) || street(x, y + 1) || street(x, y - 1)) {
        geo.frontage[i] = 1;
      }
    }
  }
}

/** The nearest tile (to fractional point p) passing `ok`, by straight-line distance. */
function nearestTile(
  geo: CityGeometry,
  px: number,
  py: number,
  ok: (i: number) => boolean,
): { x: number; y: number } | undefined {
  const n = geo.tiles;
  let best: { x: number; y: number } | undefined;
  let bestD = Infinity;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!ok(y * n + x)) continue;
      const d = sq(x - px) + sq(y - py);
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

/**
 * Default centres squeezed away from the shore edge, turned and mirrored by the
 * look, then fitted: the waterfront hugs the shore, and any centre that fell in
 * the water sits on the nearest land a little way from it.
 */
function fitCentres(
  geo: CityGeometry,
  look: CityLook,
  form: WaterForm,
): Record<DistrictId, DistrictPlace> {
  const n = geo.tiles;
  const squeeze = DISTRICT_SQUEEZE[form] ?? 1;
  const out = {} as Record<DistrictId, DistrictPlace>;
  const inland = (i: number) =>
    !geo.water[i] && !geo.park[i] && geo.shoreDist[i]! >= GEO.inlandTiles;
  for (const d of DISTRICTS) {
    const base = CITYGEN.layout[d];
    const wf = WATERFRONT_AT[form];
    const [cu, cv] = d === 'waterfront' && wf ? wf : [base.cx, base.cy * squeeze];
    const [u, v] = toActual(look, cu, cv);
    let tx = u * (n - 1);
    let ty = v * (n - 1);
    const i = Math.round(ty) * n + Math.round(tx);
    const shore = (k: number) =>
      !geo.water[k] && !geo.park[k] && geo.shoreDist[k] === GEO.waterfrontInset;
    const want = d === 'waterfront' ? form !== 'none' && shore : inland;
    if (want && !want(i)) {
      const t = nearestTile(geo, tx, ty, want);
      if (t) [tx, ty] = [t.x, t.y];
    }
    out[d] = {
      cx: tx / (n - 1),
      cy: ty / (n - 1),
      spread: base.spread * roomy(geo, tx, ty, base.spread),
    };
  }
  return out;
}

/** How much a district's spread grows to make up for water and park near its centre. */
function roomy(geo: CityGeometry, tx: number, ty: number, spread: number): number {
  const n = geo.tiles;
  const r = GEO.spreadReach * spread * n;
  let all = 0;
  let land = 0;
  for (let y = Math.max(0, Math.floor(ty - r)); y <= Math.min(n - 1, ty + r); y++) {
    for (let x = Math.max(0, Math.floor(tx - r)); x <= Math.min(n - 1, tx + r); x++) {
      if (sq(x - tx) + sq(y - ty) > r * r) continue;
      all += 1;
      if (!geo.water[y * n + x] && !geo.park[y * n + x]) land += 1;
    }
  }
  if (land === 0) return GEO.spreadMax;
  return Math.min(GEO.spreadMax, Math.sqrt(all / land));
}

/** A big multi-block park between the financial district and the university. */
function placeBigPark(geo: CityGeometry, city: CitySpec): void {
  const n = geo.tiles;
  const b = CITY_LAYOUT.block;
  const [wide, deep] = GEO.bigPark[city.size] ?? [2, 2];
  const f = geo.centres.financial;
  const u = geo.centres.university;
  const len = Math.sqrt(sq(u.cx - f.cx) + sq(u.cy - f.cy)) || 1;
  const tx = (f.cx + ((u.cx - f.cx) / len) * GEO.bigParkOffset) * n;
  const ty = (f.cy + ((u.cy - f.cy) / len) * GEO.bigParkOffset) * n;
  let best: [number, number, number, number] | undefined;
  let bestD = Infinity;
  const blocks = Math.floor(n / b);
  for (const [bw, bd] of [
    [wide, deep],
    [deep, wide],
  ] as const) {
    for (let by = 1; by + bd < blocks; by++) {
      for (let bx = 1; bx + bw < blocks; bx++) {
        const [x0, y0, x1, y1] = [bx * b, by * b, (bx + bw) * b, (by + bd) * b];
        if (!allLand(geo, x0, y0, x1, y1)) continue;
        const d = sq((x0 + x1) / 2 - tx) + sq((y0 + y1) / 2 - ty);
        if (d < bestD) {
          bestD = d;
          best = [x0, y0, x1, y1];
        }
      }
    }
  }
  if (!best) return;
  const [x0, y0, x1, y1] = best;
  for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) geo.park[y * n + x] = 1;
}

function allLand(geo: CityGeometry, x0: number, y0: number, x1: number, y1: number): boolean {
  const n = geo.tiles;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++)
      if (geo.water[y * n + x] || geo.shoreDist[y * n + x]! < 2) return false;
  }
  return true;
}

/** The financial centre moved toward the waterfront until within reach, so the water shows. */
function focusFor(geo: CityGeometry): { x: number; y: number } {
  const n = geo.tiles;
  const f = geo.centres.financial;
  const fx = f.cx * (n - 1);
  const fy = f.cy * (n - 1);
  if (geo.form === 'none') return { x: fx, y: fy };
  const w = geo.centres.waterfront;
  const [wx, wy] = [w.cx * (n - 1), w.cy * (n - 1)];
  const d = Math.sqrt(sq(wx - fx) + sq(wy - fy));
  if (d <= GEO.focusReach) return { x: fx, y: fy };
  const k = (d - GEO.focusReach) / d;
  return { x: fx + (wx - fx) * k, y: fy + (wy - fy) * k };
}
