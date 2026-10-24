// Pin data for the map (SCREENS §2, ART_DIRECTION §2): one entry per storefront
// lot (your branches, rivals and open branch locations) in the current city and, with the HQ stage (FEATURES.hq), per office
// building, credit bureau and marketing agency, filtered by the Layers
// settings, with its roof anchor in world px and its accessible label. Also
// the renderer's occupants (lots and leased offices). Read-only views of
// GameState; positions come from the CityMap.
import type { CityMap } from '../../art/citygen';
import { roofAnchor } from '../../art/iso';
import type { LotOccupant } from '../../art/mapRenderer';
import { FEATURES, type FeatureId } from '../../config/balance';
import { AGENCIES } from '../../data/brandCampaigns';
import { LEASE_ONLY_KEY, layerOn, type MapLayerId } from '../../data/mapLayers';
import type { GameState, Lot, OfficeListing, Site } from '../../sim/state';

export type PinKind = 'mine' | 'hq' | 'rival' | 'office' | 'bureau' | 'agency' | 'lot';

export interface PinSpec {
  /** Lot, office listing or site id (also the DOM `data-lot-id`). */
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
  /** Your office in this building (kind 'hq'). */
  officeId?: string;
  /** Type icon for office, bureau and agency pins (offices also wear the For lease tag). */
  icon?: MapLayerId;
}

/** Clustering seeds and stacking: yours first, then rivals, then other buildings, open locations last. */
const KIND_ORDER: Record<PinKind, number> = {
  mine: 0,
  hq: 1,
  rival: 2,
  office: 3,
  bureau: 4,
  agency: 5,
  lot: 6,
};

/** Pins drawn in your brand ink, lifted above the rest. */
export const isYours = (p: { kind: PinKind }): boolean => p.kind === 'mine' || p.kind === 'hq';

export function pendingByBranch(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const a of Object.values(s.loanDesk.applications))
    out[a.branchId] = (out[a.branchId] ?? 0) + 1;
  return out;
}

function anchor(map: CityMap, tile: { x: number; y: number }) {
  const floors = map.floors[tile.y * map.tiles + tile.x] ?? 0;
  return roofAnchor(map.tiles, tile.x, tile.y, floors);
}

function lotPin(s: GameState, map: CityMap, lot: Lot, pending: Record<string, number>): PinSpec {
  const at = anchor(map, lot.tile);
  const occ = lot.occupant;
  const base = { id: lot.id, x: at.x, y: at.y };
  if (occ?.type === 'player') {
    const branch = s.branches[occ.id];
    const waiting = pending[occ.id] ?? 0;
    const name = branch?.name ?? lot.address;
    return {
      ...base,
      kind: 'mine',
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
      kind: 'rival',
      label: `${bank?.name ?? 'Rival bank'} branch, ${lot.address}`,
      ink: bank?.ink ?? '#5a5a5a',
      monogram: bank?.monogram ?? '?',
      badge: false,
    };
  }
  return {
    ...base,
    kind: 'lot',
    label: `Available branch location, ${lot.address}`,
    ink: '',
    monogram: '',
    badge: false,
  };
}

function officePin(s: GameState, map: CityMap, o: OfficeListing): PinSpec {
  const at = anchor(map, o.tile);
  const base = { id: o.id, x: at.x, y: at.y, badge: false };
  if (o.officeId) {
    return {
      ...base,
      kind: 'hq',
      label: `Your HQ, ${o.address}`,
      ink: s.meta.brandInk,
      monogram: s.meta.monogram,
      officeId: o.officeId,
    };
  }
  return {
    ...base,
    kind: 'office',
    label: `Office for lease, ${o.address}, ${o.floors} floors`,
    ink: '',
    monogram: '',
    icon: 'offices',
  };
}

/** A site's display name: the bureau's name or the agency's. */
export function siteName(site: Site): string {
  return site.kind === 'agency'
    ? (AGENCIES[site.refId]?.name ?? 'Marketing agency')
    : `${site.refId} credit bureau`;
}

function sitePin(map: CityMap, site: Site): PinSpec {
  const at = anchor(map, site.tile);
  const agency = site.kind === 'agency';
  return {
    id: site.id,
    kind: site.kind,
    x: at.x,
    y: at.y,
    label: `${siteName(site)}${agency ? ', marketing agency' : ''}, ${site.address}`,
    ink: '',
    monogram: '',
    badge: false,
    icon: agency ? 'marketingAgencies' : 'creditBureaus',
  };
}

/** Pins for the city on screen, after the Layers settings, in stacking order. */
export function buildPins(
  s: GameState,
  map: CityMap,
  lots: Lot[],
  features: Record<FeatureId, boolean> = FEATURES,
): PinSpec[] {
  const layers = s.settings.layers;
  const pins: PinSpec[] = [];
  if (layerOn(layers, 'branches')) {
    const leaseOnly = layers[LEASE_ONLY_KEY] === true;
    const pending = pendingByBranch(s);
    for (const lot of lots) {
      if (lot.cityId !== map.cityId) continue;
      if (leaseOnly && lot.occupant) continue;
      pins.push(lotPin(s, map, lot, pending));
    }
  }
  if (features.hq) {
    if (layerOn(layers, 'offices')) {
      for (const o of Object.values(s.world.officeListings))
        if (o.cityId === map.cityId) pins.push(officePin(s, map, o));
    }
    const bureaus = layerOn(layers, 'creditBureaus');
    const agencies = layerOn(layers, 'marketingAgencies');
    for (const site of Object.values(s.world.sites)) {
      if (site.cityId !== map.cityId) continue;
      if (site.kind === 'bureau' ? bureaus : agencies) pins.push(sitePin(map, site));
    }
  }
  return pins.sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** A string that changes whenever any pin would look or act differently. */
export function pinsKey(pins: PinSpec[]): string {
  return pins.map((p) => `${p.id}|${p.kind}|${p.ink}|${p.monogram}|${p.label}`).join(';');
}

/**
 * Who is in each lot (and, with FEATURES.hq, which office buildings you lease),
 * for the renderer's roof flags and awnings (src/art/mapRenderer.ts).
 */
export function occupantsOf(
  s: GameState,
  lots: Lot[],
  features: Record<FeatureId, boolean> = FEATURES,
): Record<string, LotOccupant> {
  const out: Record<string, LotOccupant> = {};
  for (const lot of lots) {
    const occ = lot.occupant;
    if (!occ) continue;
    out[lot.id] =
      occ.type === 'player'
        ? { type: 'player', ink: s.meta.brandInk }
        : { type: 'rival', ink: s.rivals[occ.id]?.ink ?? '#5a5a5a' };
  }
  if (features.hq) {
    for (const o of Object.values(s.world.officeListings)) {
      if (o.officeId && o.cityId === s.world.currentCityId)
        out[o.id] = { type: 'player', ink: s.meta.brandInk };
    }
  }
  return out;
}

export function occupantsKey(o: Record<string, LotOccupant>): string {
  return Object.keys(o)
    .sort()
    .map((k) => `${k}:${o[k]!.type}:${o[k]!.ink}`)
    .join(';');
}
