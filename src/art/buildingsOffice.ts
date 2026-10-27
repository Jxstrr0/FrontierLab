// Stage 4 map buildings (ART_DIRECTION §2): office towers for lease, your
// leased offices (a brand-ink roof flag) and two restrained landmarks of their
// own, the credit bureau (an archive block with slit windows and a mast) and
// the marketing agency (a glass studio with a rooftop billboard). Each look
// comes only from the tile's art seed, so it draws the same in every chunk.
import { STOREY_PX } from '../config/map';
import { roofFlag } from './buildings';
import type { TileInfo } from './citygen';
import type { Engraver, Vec3 } from './engraver';
import { drawEnergySite } from './buildingsDataCenter';
import type { LotOccupant } from './mapRenderer';
import { artRng } from './prng';
import { bands, box, castShadow, cylinder, onFace, ribs, windowSlits, type Face } from './solids';

type Rect = [number, number, number, number];

/** Visual tuning for these buildings. */
const LOOK = {
  officeInset: [0.1, 0.15],
  lobbyStoreys: 1.2,
  curtainRibs: [3, 5, 6],
  crownStoreys: 0.6,
  crownOverhang: 0.03,
  plantInset: 0.22,
  bannerU: [0.32, 0.68],
  bannerStoreys: 2.2,
  bureauInset: 0.07,
  bureauSlits: [3, 6, 8],
  plinthStoreys: 0.6,
  mastStoreys: 3,
  agencyInset: 0.12,
  agencyMullions: [2, 4, 6],
  boardStoreys: 1.4,
  boardPosts: 0.9,
} as const;

/** An office building: glazed lobby, curtain-wall shaft and a crown. */
export function drawOffice(e: Engraver, t: TileInfo, occupant: LotOccupant | undefined): void {
  e.origin(t.x, t.y);
  const rng = artRng(t.seed);
  const m = rng.range(LOOK.officeInset[0], LOOK.officeInset[1]);
  const r: Rect = [m, m, 1 - m, 1 - m];
  const h = t.floors * STOREY_PX;
  const lobby = STOREY_PX * LOOK.lobbyStoreys;
  const crown = STOREY_PX * LOOK.crownStoreys;
  castShadow(e, r[0], r[1], r[2], r[3], h);

  // Lobby: tall glass with a door bay, then the shaft above it.
  box(e, r[0], r[1], r[2], r[3], 0, lobby, { left: 'paper', right: 'light', top: 'none' });
  ribs(e, 'left', r, 0, lobby, 4);
  box(e, r[0], r[1], r[2], r[3], lobby, h - crown, { left: 'paper', top: 'none' });
  const n = LOOK.curtainRibs[e.lod]!;
  ribs(e, 'left', r, lobby, h - crown, n);
  ribs(e, 'right', r, lobby, h - crown, n);
  if (e.lod > 0) {
    const floors: number[] = [];
    for (let z = lobby + STOREY_PX; z < h - crown; z += STOREY_PX) floors.push(z);
    bands(e, 'left', r, floors, e.inks.detail * 0.8);
    bands(e, 'right', r, floors, e.inks.detail * 0.8);
  }
  bands(e, 'left', r, [lobby], e.inks.outline * 1.3);

  // Crown slab with a rooftop plant room.
  const o = LOOK.crownOverhang;
  box(e, r[0] - o, r[1] - o, r[2] + o, r[3] + o, h - crown, h, { left: 'paper', right: 'light' });
  const p = LOOK.plantInset;
  if (e.lod > 0) box(e, r[0] + p, r[1] + p, r[2] - p, r[3] - p * 1.6, h, h + STOREY_PX * 0.8);
  const roof: Vec3 = [(r[0] + r[2]) / 2 - 0.12, (r[1] + r[3]) / 2 + 0.12, h];

  if (occupant?.type === 'player') roofFlag(e, roof, occupant.ink);
  else letBanner(e, 'right', r, h - crown);
}

/** A "to let" banner hanging down the shaded face of a vacant office. */
function letBanner(e: Engraver, face: Face, r: Rect, top: number): void {
  const [u0, u1] = LOOK.bannerU;
  const z1 = top - STOREY_PX * 0.3;
  const z0 = Math.max(STOREY_PX * LOOK.lobbyStoreys, z1 - STOREY_PX * LOOK.bannerStoreys);
  const pt = (u: number, z: number) => onFace(face, ...r, u, z);
  e.poly([pt(u0, z0), pt(u1, z0), pt(u1, z1), pt(u0, z1)], 'paper', e.inks.outline * 1.2);
  if (e.lod < 2) return;
  // Lettering suggested by three short strokes.
  const lines: [Vec3, Vec3][] = [0.3, 0.5, 0.7].map((f) => {
    const z = z1 - (z1 - z0) * f;
    return [pt(u0 + 0.06, z), pt(u1 - 0.06, z)];
  });
  e.segments(lines, e.inks.detail, 0.8);
}

/**
 * Credit bureau (archive block, slit windows, mast) or marketing agency (glass
 * studio, billboard); an energy site draws its substation yard and any data
 * center hall instead (buildingsDataCenter.ts, C8c).
 */
export function drawSite(e: Engraver, t: TileInfo, occupant?: LotOccupant): void {
  if (occupant?.building) {
    drawEnergySite(e, t, occupant);
    return;
  }
  e.origin(t.x, t.y);
  if (t.siteKind === 'agency') agency(e, t);
  else bureau(e, t);
}

function bureau(e: Engraver, t: TileInfo): void {
  const m = LOOK.bureauInset;
  const r: Rect = [m, m, 1 - m, 1 - m];
  const h = t.floors * STOREY_PX;
  const plinth = STOREY_PX * LOOK.plinthStoreys;
  castShadow(e, r[0], r[1], r[2], r[3], h);
  box(e, r[0] - 0.02, r[1] - 0.02, r[2] + 0.02, r[3] + 0.02, 0, plinth, { right: 'dense' });
  box(e, r[0], r[1], r[2], r[3], plinth, h, { left: 'light', right: 'medium' });
  // Tall narrow slits, like rows of filing drawers.
  const cols = LOOK.bureauSlits[e.lod]!;
  windowSlits(e, 'left', r, plinth, h - STOREY_PX * 0.5, cols, STOREY_PX * 1.5, 0.8);
  windowSlits(e, 'right', r, plinth, h - STOREY_PX * 0.5, cols, STOREY_PX * 1.5, 0.8);
  bands(e, 'left', r, [h - STOREY_PX * 0.35], e.inks.outline);
  bands(e, 'right', r, [h - STOREY_PX * 0.35], e.inks.outline);
  // Roof: a lattice mast with a small dish.
  const a = r[2] - 0.22;
  const b = r[1] + 0.22;
  const top = h + STOREY_PX * LOOK.mastStoreys;
  e.segments(
    [
      [
        [a, b, h],
        [a, b, top],
      ],
      [
        [a - 0.06, b, h],
        [a, b, top * 0.98],
      ],
      [
        [a + 0.06, b, h],
        [a, b, top * 0.98],
      ],
    ],
    e.inks.detail * 1.2,
  );
  if (e.lod > 0) cylinder(e, r[0] + 0.25, r[3] - 0.25, 0.09, h, h + STOREY_PX * 0.5, 'light');
}

function agency(e: Engraver, t: TileInfo): void {
  const m = LOOK.agencyInset;
  const r: Rect = [m, m, 1 - m, 1 - m];
  const h = t.floors * STOREY_PX;
  castShadow(e, r[0], r[1], r[2], r[3], h);
  box(e, r[0], r[1], r[2], r[3], 0, h, { left: 'paper', right: 'light' });
  const n = LOOK.agencyMullions[e.lod]!;
  ribs(e, 'left', r, 0, h, n);
  ribs(e, 'right', r, 0, h, Math.max(2, n - 1));
  if (e.lod > 0) {
    const floors = Array.from({ length: t.floors - 1 }, (_, k) => (k + 1) * STOREY_PX);
    bands(e, 'left', r, floors, e.inks.detail);
    bands(e, 'right', r, floors, e.inks.detail);
  }
  // Rooftop billboard facing the street: two posts and a framed panel.
  const posts = STOREY_PX * LOOK.boardPosts;
  const z0 = h + posts;
  const z1 = z0 + STOREY_PX * LOOK.boardStoreys;
  const b = (r[1] + r[3]) / 2 + 0.08;
  const a0 = r[0] + 0.05;
  const a1 = r[2] - 0.05;
  e.segments(
    [
      [
        [a0 + 0.12, b, h],
        [a0 + 0.12, b, z0],
      ],
      [
        [a1 - 0.12, b, h],
        [a1 - 0.12, b, z0],
      ],
    ],
    e.inks.outline,
  );
  e.poly(
    [
      [a0, b, z0],
      [a1, b, z0],
      [a1, b, z1],
      [a0, b, z1],
    ],
    'paper',
    e.inks.outline * 1.2,
  );
  if (e.lod === 0) return;
  // A sunburst on the billboard: the agency's mark.
  const am = (a0 + a1) / 2;
  const zm = (z0 + z1) / 2;
  const rays: [Vec3, Vec3][] = [];
  for (let k = 0; k < 5; k++) {
    const f = (k + 0.5) / 5;
    rays.push([
      [am, b, z0 + 1],
      [a0 + 0.08 + (a1 - a0 - 0.16) * f, b, z1 - 1],
    ]);
  }
  e.segments(rays, e.inks.detail, 0.8);
  e.segments(
    [
      [
        [a0 + 0.04, b, zm - STOREY_PX * 0.55],
        [a1 - 0.04, b, zm - STOREY_PX * 0.55],
      ],
    ],
    e.inks.detail,
  );
}
