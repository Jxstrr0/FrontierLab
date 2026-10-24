// Pin data for the map (SCREENS §2, ART_DIRECTION §2): one entry per storefront
// lot in the current city, filtered by the Layers settings, with its roof
// anchor in world px and its accessible label. Also the renderer's lot
// occupants. Read-only views of GameState; positions come from the CityMap.
import type { CityMap } from '../../art/citygen';
import { roofAnchor } from '../../art/iso';
import type { LotOccupant } from '../../art/mapRenderer';
import { LEASE_ONLY_KEY, layerOn } from '../../data/mapLayers';
import type { GameState, Lot } from '../../sim/state';

export type PinKind = 'mine' | 'rival' | 'lease';

export interface PinSpec {
  /** The lot id (also the DOM `data-lot-id`). */
  id: string;
  kind: PinKind;
  /** World position of the roof anchor (zoom-1 px). */
  x: number;
  y: number;
  label: string;
  ink: string;
  monogram: string;
  /** Brass dot: Loan Desk applications waiting (SCREENS §0.2). */
  badge: boolean;
  branchId?: string;
}

/** Clustering seeds and stacking: your branches first, then rivals, then storefronts. */
const KIND_ORDER: Record<PinKind, number> = { mine: 0, rival: 1, lease: 2 };

export function pendingByBranch(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of Object.values(s.loanDesk.applications))
    out[a.branchId] = (out[a.branchId] ?? 0) + 1;
  return out;
}

function lotPin(s: GameState, map: CityMap, lot: Lot, pending: Record<string, number>) {
  const floors = map.floors[lot.tile.y * map.tiles + lot.tile.x] ?? 0;
  const at = roofAnchor(map.tiles, lot.tile.x, lot.tile.y, floors);
  const occ = lot.occupant;
  const base = { id: lot.id, x: at.x, y: at.y };
  if (occ?.type === 'player') {
    const branch = s.branches[occ.id];
    const waiting = pending[occ.id] ?? 0;
    const name = branch?.name ?? lot.address;
    return {
      ...base,
      kind: 'mine' as const,
      label: `Your branch, ${name}${waiting ? `, ${waiting} loan applications waiting` : ''}`,
      ink: s.meta.brandInk,
      monogram: s.meta.monogram,
      badge: waiting > 0,
      branchId: occ.id,
    };
  }
  if (occ?.type === 'rival') {
    const bank = s.rivals[occ.id];
    return {
      ...base,
      kind: 'rival' as const,
      label: `${bank?.name ?? 'Rival bank'} branch, ${lot.address}`,
      ink: bank?.ink ?? '#5a5a5a',
      monogram: bank?.monogram ?? '?',
      badge: false,
    };
  }
  return {
    ...base,
    kind: 'lease' as const,
    label: `For lease, ${lot.address}`,
    ink: '',
    monogram: '',
    badge: false,
  };
}

/** Pins for the city on screen, after the Layers settings, in stacking order. */
export function buildPins(s: GameState, map: CityMap, lots: Lot[]): PinSpec[] {
  const layers = s.settings.layers;
  if (!layerOn(layers, 'branches')) return [];
  const leaseOnly = layers[LEASE_ONLY_KEY] === true;
  const pending = pendingByBranch(s);
  const pins: PinSpec[] = [];
  for (const lot of lots) {
    if (lot.cityId !== map.cityId) continue;
    if (leaseOnly && lot.occupant) continue;
    pins.push(lotPin(s, map, lot, pending));
  }
  return pins.sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** A string that changes whenever any pin would look or act differently. */
export function pinsKey(pins: PinSpec[]): string {
  return pins.map((p) => `${p.id}|${p.kind}|${p.ink}|${p.monogram}|${p.label}`).join(';');
}

/** Who is in each lot, for the renderer's roof flags (src/art/mapRenderer.ts). */
export function occupantsOf(s: GameState, lots: Lot[]): Record<string, LotOccupant> {
  const out: Record<string, LotOccupant> = {};
  for (const lot of lots) {
    const occ = lot.occupant;
    if (!occ) continue;
    out[lot.id] =
      occ.type === 'player'
        ? { type: 'player', ink: s.meta.brandInk }
        : { type: 'rival', ink: s.rivals[occ.id]?.ink ?? '#5a5a5a' };
  }
  return out;
}

export function occupantsKey(o: Record<string, LotOccupant>): string {
  return Object.keys(o)
    .sort()
    .map((k) => `${k}:${o[k]!.type}:${o[k]!.ink}`)
    .join(';');
}
