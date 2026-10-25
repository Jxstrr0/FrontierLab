// Where the drawable city's special things go (ART_DIRECTION §2): landmarks on
// free blocks near their district, the signature landmark where its kind makes
// sense (by the water for wheels, sail halls and bridges; downtown for towers
// and churches), and in layout 2 plazas, tree-lined avenues and boats. Pure and
// seeded, like citygen.ts.
import { CITY_LAYOUT } from '../config/balance';
import { STREET_LIFE } from '../config/cityGeo';
import { LANDMARKS, REGIONAL_LANDMARKS, type LandmarkId } from '../config/map';
import type { CitySpec } from '../data/cities';
import { cityLook, type Signature } from '../data/cityLooks';
import type { DistrictId } from '../data/types';
import { fillBlock, KIND } from './cityBlocks';
import type { CityMap, LandmarkSite } from './citygen';
import { artRng, hashString, mixSeed } from './prng';

/** Street life flags in CityMap.decor. */
export const DECOR = { avenue: 1, plaza: 2, fountain: 4, boat: 8 } as const;

/** Signatures that stand by the water, and how much open water pulls them (tiles per tile). */
const WATER_SIGNATURES: Partial<Record<Signature, number>> = {
  observationWheel: 0.5,
  shellHall: 0.6,
  sailCanopy: 0.6,
  suspensionBridge: 1,
  chateauHotel: 0.25,
};
/** How far (tiles) to look past a block's edge for open water. */
const WATER_LOOK = 8;

type Block = { x: number; y: number };
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
] as const;

function centreOf(map: CityMap, d: DistrictId): { x: number; y: number } {
  const c = map.geo.centres[d];
  return { x: c.cx * map.tiles, y: c.cy * map.tiles };
}

const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/** Index of the free block nearest a tile point, scored like the original layout. */
function nearestBlock(map: CityMap, free: Block[], at: { x: number; y: number }): number {
  const n = map.tiles;
  let best = -1;
  let bestD = Infinity;
  free.forEach((b, k) => {
    const dx = (b.x + 1) / n - at.x / n;
    const dy = (b.y + 1) / n - at.y / n;
    const dist = dx * dx + dy * dy;
    if (dist < bestD) {
      bestD = dist;
      best = k;
    }
  });
  return best;
}

/** Water tiles in the 3-wide strip beyond each side of a block, and the most open side. */
function openWater(map: CityMap, b: Block): { count: number; side: { dx: number; dy: number } } {
  const n = map.tiles;
  const s = CITY_LAYOUT.block - 1;
  let best = { count: 0, side: DIRS[0] as { dx: number; dy: number } };
  for (const dir of DIRS) {
    let count = 0;
    for (let k = 1; k <= WATER_LOOK; k++) {
      for (let w = 0; w < s; w++) {
        const x = dir.dx > 0 ? b.x + s - 1 + k : dir.dx < 0 ? b.x - k : b.x + w;
        const y = dir.dy > 0 ? b.y + s - 1 + k : dir.dy < 0 ? b.y - k : b.y + w;
        if (x >= 0 && y >= 0 && x < n && y < n && map.geo.water[y * n + x]) count += 1;
      }
    }
    if (count > best.count) best = { count, side: dir };
  }
  return best;
}

/** The signature landmark's block: by the water for water kinds, else central. */
function signatureBlock(map: CityMap, free: Block[], sig: Signature): number {
  const pull = WATER_SIGNATURES[sig];
  const downtown = centreOf(map, 'downtown');
  if (pull === undefined || map.geo.form === 'none') {
    return nearestBlock(map, free, midpoint(downtown, centreOf(map, 'financial')));
  }
  const anchor = midpoint(downtown, centreOf(map, 'waterfront'));
  let best = -1;
  let bestScore = Infinity;
  free.forEach((b, k) => {
    const open = openWater(map, b).count;
    if (open === 0) return;
    const d = Math.sqrt((b.x + 1 - anchor.x) ** 2 + (b.y + 1 - anchor.y) ** 2);
    const score = d - pull * Math.min(open, WATER_LOOK * 3);
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  });
  return best >= 0 ? best : nearestBlock(map, free, downtown);
}

/**
 * Landmarks claim free blocks, each nearest its district centre. Layout 1 keeps
 * the original order and rule exactly; layout 2 seats the signature first.
 */
export function placeLandmarks(map: CityMap, city: CitySpec, free: Block[]): void {
  const signature = cityLook(city.id).signature;
  const list = (
    city.regional ? LANDMARKS.filter((l) => REGIONAL_LANDMARKS.includes(l.id)) : LANDMARKS
  ).filter((l) => l.id !== 'signature' || signature !== 'none');
  const order =
    map.layout > 1
      ? [...list.filter((l) => l.id === 'signature'), ...list.filter((l) => l.id !== 'signature')]
      : list;
  for (const lm of order) {
    const sigHere = lm.id === 'signature' && map.layout > 1;
    const best = sigHere
      ? signatureBlock(map, free, signature)
      : nearestBlock(map, free, centreOf(map, lm.district));
    if (best < 0) continue;
    const b = free.splice(best, 1)[0]!;
    const site: LandmarkSite = {
      id: lm.id as LandmarkId,
      x: b.x,
      y: b.y,
      size: CITY_LAYOUT.block - 1,
    };
    if (lm.id === 'signature') site.signature = signature;
    if (sigHere && WATER_SIGNATURES[signature] !== undefined && map.geo.form !== 'none') {
      site.waterSide = openWater(map, b).side;
    }
    map.landmarks.push(site);
    fillBlock(map, b, KIND.landmark);
  }
}

/** Layout 2: paved plazas with a fountain on free blocks downtown (and midtown in big cities). */
export function placePlazas(map: CityMap, city: CitySpec, free: Block[]): void {
  const anchors: DistrictId[] = ['downtown', 'midtown'];
  const count = STREET_LIFE.plazas[city.size] ?? 1;
  for (let k = 0; k < count && k < anchors.length; k++) {
    const best = nearestBlock(map, free, centreOf(map, anchors[k]!));
    if (best < 0) return;
    const b = free.splice(best, 1)[0]!;
    fillBlock(map, b, KIND.park);
    const inner = CITY_LAYOUT.block - 1;
    for (let y = b.y; y < b.y + inner; y++) {
      for (let x = b.x; x < b.x + inner; x++) map.decor[y * map.tiles + x] = DECOR.plaza;
    }
    const mid = (b.y + 1) * map.tiles + b.x + 1;
    map.decor[mid] = DECOR.plaza | DECOR.fountain;
  }
}

/** Layout 2: avenue trees around the big park and along one boulevard, and boats. */
export function markStreetLife(map: CityMap, saveSeed: number): void {
  const n = map.tiles;
  const geo = map.geo;
  const step = CITY_LAYOUT.block;
  const street = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < n && y < n && map.kind[y * n + x] === KIND.street;
  const plant = (x: number, y: number) => {
    // Trees line the kerbs between crossings, never on a crossing itself.
    if (street(x, y) && !(x % step === 0 && y % step === 0)) {
      map.decor[y * n + x] = map.decor[y * n + x]! | DECOR.avenue;
    }
  };
  // The streets around the big park.
  let [x0, y0, x1, y1] = [n, n, -1, -1];
  for (let i = 0; i < n * n; i++) {
    if (!geo.park[i]) continue;
    const x = i % n;
    const y = (i - x) / n;
    [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  }
  if (x1 >= 0) {
    for (let x = x0 - 1; x <= x1 + 1; x++) [y0 - 1, y1 + 1].forEach((y) => plant(x, y));
    for (let y = y0 - 1; y <= y1 + 1; y++) [x0 - 1, x1 + 1].forEach((x) => plant(x, y));
  }
  // One boulevard through the financial district, a row or a column by city.
  const f = centreOf(map, 'financial');
  const rowFirst = hashString(map.cityId) % 2 === 0;
  const bx = step * Math.round(f.x / step);
  const by = step * Math.round(f.y / step);
  for (let t = 0; t < n; t++) {
    if (rowFirst) plant(t, by);
    else plant(bx, t);
  }
  // Boats on open water, away from the shore and the bridges.
  const city = hashString(map.cityId);
  for (let i = 0; i < n * n; i++) {
    if (!geo.water[i] || geo.bridge[i] || geo.shoreDist[i]! < STREET_LIFE.boatReach) continue;
    if (artRng(mixSeed(saveSeed, i, city)).chance(STREET_LIFE.boatShare)) {
      map.decor[i] = map.decor[i]! | DECOR.boat;
    }
  }
}
