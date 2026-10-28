// Procedural buildings per district (ART_DIRECTION §2 table), shaped by the
// city's local style (§2.1, styleProfiles.ts): each district's fabric is a
// styled row, house or tower, or the district's classic building. Each tile's
// look comes only from its art seed, so a city draws the same way every
// session and in every chunk. Storefront lots get a glazed ground floor; the
// player's lots fly a brand-ink roof flag and rivals' lots carry an awning in
// their ink. Your data centers stand as a low, wide hall instead
// (buildingsDataCenter.ts).
import { FLAG_PX, STOREY_PX } from '../config/map';
import { frontageAt } from './blockRows';
import { downtownMidrise, financialTower, waterfrontGlass, type Shell } from './buildingsTall';
import { industrialShed, midtownRow, suburbanHouse, universityHall } from './buildingsLow';
import type { CityMap, TileInfo } from './citygen';
import type { Engraver, Vec3 } from './engraver';
import type { LotOccupant } from './mapRenderer';
import { artRng, mixSeed, type ArtRng } from './prng';
import { gableHouse } from './gables';
import { spire } from './rooftop';
import { drawDataCenterLot, isDataCenter } from './buildingsDataCenter';
import { castShadow, onFace, type Face } from './solids';
import { crane, washingLine } from './streetProps';
import { tileHeightPx } from './drawList';
import { styledHouse } from './styleHouses';
import { barrelShed, grainElevator } from './styleIndustry';
import { STYLE_PROFILES, type Fabric } from './styleProfiles';
import { rowBuilding } from './styleRows';
import { styledTower } from './styleTowers';

/** Visual tuning for storefronts and occupant marks. */
const SHOP = {
  glazingStoreys: 1.1,
  mullions: [2, 4, 5],
  awningPx: 5,
  awningDrop: 0.07,
  stripes: [0, 4, 7],
  flagWidth: 0.26,
  flagHeight: 6,
} as const;

/** Walls may rise this many storeys above the tile's floors (roofs need the rest). */
const WALL_CAP_STOREYS = 2;

/** Draws the building (or storefront) standing on one tile. */
export function drawBuilding(
  e: Engraver,
  t: TileInfo,
  occupant: LotOccupant | undefined,
  map: CityMap,
): void {
  if (t.kind === 'lot' && occupant && isDataCenter(occupant)) {
    drawDataCenterLot(e, t, occupant);
    if (occupant.fitout) crane(e, STOREY_PX * 1.5, tileHeightPx(map, t.y * map.tiles + t.x));
    return;
  }
  e.origin(t.x, t.y);
  const rng = artRng(t.seed);
  const lot = t.kind === 'lot';
  // Storefronts need walls tall enough to glaze.
  const floors = lot ? Math.max(2, t.floors) : t.floors;
  const shell = styled(e, t, floors, rng, lot, map) ?? classic(e, t, floors, rng, lot);
  if (!lot) {
    if (t.district === 'suburbs') washingLine(e, shell.rect, t.seed);
    return;
  }
  for (const face of ['left', 'right'] as const) shopfront(e, face, shell);
  if (occupant?.type === 'rival' || occupant?.type === 'business') {
    for (const face of ['left', 'right'] as const) awning(e, face, shell, occupant.ink);
  }
  if (occupant?.type === 'player') roofFlag(e, shell.roof, occupant.ink);
  if (occupant?.fitout) crane(e, shell.wall, tileHeightPx(map, t.y * map.tiles + t.x));
}

/** The style's building for this tile, or undefined to use the classic one. */
function styled(
  e: Engraver,
  t: TileInfo,
  floors: number,
  rng: ArtRng,
  lot: boolean,
  map: CityMap,
): Shell | undefined {
  const profile = STYLE_PROFILES[e.style];
  const pick = artRng(mixSeed(t.seed, 3));
  if (t.district === 'industrial') {
    if (profile.industry === 'elevator' && pick.chance(0.5)) return grainElevator(e, floors, rng);
    if (profile.industry === 'barrel') return barrelShed(e, rng);
    return undefined;
  }
  if (t.district === 'midtown' && !lot && pick.chance(profile.spireChance))
    return church(e, floors);
  let fabric: Fabric | undefined = profile.fabric[t.district];
  while (fabric?.kind === 'mix') fabric = pick.chance(fabric.p) ? fabric.a : fabric.b;
  if (!fabric || fabric.kind === 'classic') return undefined;
  const cap = t.floors + WALL_CAP_STOREYS;
  if (fabric.kind === 'row') {
    return rowBuilding(e, floors, cap, frontageAt(map, t.x, t.y), fabric.spec, rng, lot);
  }
  if (fabric.kind === 'house') return styledHouse(e, fabric.house, cap, rng);
  return styledTower(e, fabric.tower, floors, rng);
}

/** A small church: a gabled nave with a spire at its front end. */
function church(e: Engraver, floors: number): Shell {
  const wall = Math.min(2, floors) * STOREY_PX;
  const r: [number, number, number, number] = [0.16, 0.3, 0.7, 0.7];
  const h = (floors + 3.6) * STOREY_PX;
  castShadow(e, 0.16, 0.3, 0.9, 0.7, h);
  gableHouse(e, r, wall, 16, true);
  spire(e, 0.8, 0.5, 0, h);
  return { rect: r, wall, roof: [0.8, 0.5, h] };
}

/** The district's classic building (ART_DIRECTION §2 table). */
function classic(e: Engraver, t: TileInfo, floors: number, rng: ArtRng, lot: boolean): Shell {
  let shell: Shell;
  switch (t.district) {
    case 'financial':
      shell = financialTower(e, floors, rng);
      break;
    case 'downtown':
      shell = downtownMidrise(e, floors, rng);
      break;
    case 'waterfront':
      shell = waterfrontGlass(e, floors, rng);
      break;
    case 'midtown':
      shell = midtownRow(e, floors, rng);
      break;
    case 'suburbs':
      shell = suburbanHouse(e, floors, rng);
      break;
    case 'university':
      shell = universityHall(e, t.x, t.y, floors, rng, lot);
      break;
    case 'industrial':
      shell = industrialShed(e, floors, rng);
      break;
  }
  return shell;
}

/** A glazed ground floor: paper glass, mullions, a door and a heavy lintel. */
function shopfront(e: Engraver, face: Face, shell: Shell): void {
  const [a0, b0, a1, b1] = shell.rect;
  const top = Math.min(shell.wall, STOREY_PX * SHOP.glazingStoreys);
  const p = (u: number, z: number) => onFace(face, a0, b0, a1, b1, u, z);
  const inset = 0.06;
  e.poly([p(inset, 0), p(1 - inset, 0), p(1 - inset, top * 0.92), p(inset, top * 0.92)], 'paper');
  const n = SHOP.mullions[e.lod]!;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < n; k++) {
    const u = inset + ((1 - 2 * inset) * k) / n;
    segs.push([p(u, 0), p(u, top * 0.92)]);
  }
  e.segments(segs, e.inks.detail);
  // Lintel.
  e.segments([[p(0, top), p(1, top)]], e.inks.outline * 1.4);
  if (e.lod > 0 && face === 'left') {
    // Door: a dense panel in the middle bay.
    const u0 = 0.44;
    const u1 = 0.56;
    e.poly([p(u0, 0), p(u1, 0), p(u1, top * 0.8), p(u0, top * 0.8)], 'dense', e.inks.detail);
  }
}

/** A rival's awning: a sloped band in their ink with paper stripes. */
function awning(e: Engraver, face: Face, shell: Shell, ink: string): void {
  const [a0, b0, a1, b1] = shell.rect;
  const top = Math.min(shell.wall, STOREY_PX * SHOP.glazingStoreys) + SHOP.awningPx * 0.4;
  const d = SHOP.awningDrop;
  // Push the lower edge outward from the wall face.
  const out = (v: Vec3): Vec3 =>
    face === 'left' ? [v[0], v[1] + d, v[2]] : [v[0] + d, v[1], v[2]];
  const p = (u: number, z: number) => onFace(face, a0, b0, a1, b1, u, z);
  const quad: Vec3[] = [
    p(0, top),
    p(1, top),
    out(p(1, top - SHOP.awningPx)),
    out(p(0, top - SHOP.awningPx)),
  ];
  e.poly(quad, ink, e.inks.detail);
  const n = SHOP.stripes[e.lod]!;
  if (n === 0) return;
  const segs: [Vec3, Vec3][] = [];
  for (let k = 1; k < n; k++) {
    const u = k / n;
    segs.push([p(u, top), out(p(u, top - SHOP.awningPx))]);
  }
  // Paper stripes so it reads as striped cloth.
  e.ctx.beginPath();
  for (const [q, r] of segs) {
    e.m(q[0], q[1], q[2]);
    e.l(r[0], r[1], r[2]);
  }
  e.ctx.strokeStyle = e.inks.paper;
  e.ctx.lineWidth = e.inks.detail * 1.2;
  e.ctx.stroke();
}

/** The player's flag: a pole on the roof with a pennant in the brand ink. */
export function roofFlag(e: Engraver, roof: Vec3, ink: string): void {
  const [a, b, z] = roof;
  const top = z + FLAG_PX;
  e.segments(
    [
      [
        [a, b, z],
        [a, b, top],
      ],
    ],
    e.inks.outline,
  );
  const w = SHOP.flagWidth;
  const h = SHOP.flagHeight;
  e.poly(
    [
      [a, b, top],
      [a + w, b, top - h * 0.15],
      [a + w * 0.85, b, top - h * 0.55],
      [a + w, b, top - h],
      [a, b, top - h],
    ],
    ink,
    e.inks.detail,
  );
}
