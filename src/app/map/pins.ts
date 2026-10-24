// Pin data for the map (SCREENS §2, ART_DIRECTION §2): one entry per storefront
// lot (your branches, rivals and open branch locations) in the current city and, with the HQ stage (FEATURES.hq), per office
// building, credit bureau and marketing agency, filtered by the Layers
// settings, with its roof anchor in world px and its accessible label. An
// acquired branch still converting wears the old bank's ink with a progress
// ring. Also the renderer's occupants (lots and leased offices). Read-only views of
// GameState; positions come from the CityMap.
import type { CityMap } from '../../art/citygen';
import { roofAnchor } from '../../art/iso';
import type { LotOccupant } from '../../art/mapRenderer';
import { FEATURES, MERGERS, type FeatureId } from '../../config/balance';
import { AGENCIES } from '../../data/brandCampaigns';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { CONVENTIONS_CALENDAR, DEFAULT_VENUE } from '../../data/conventions';
import { INVESTMENT_BANKS } from '../../data/investmentBanks';
import { LOBBY_FIRMS } from '../../data/lobbying';
import { conventionPinInfo } from '../convention/conventionPin';
import { propertyPinInfo } from '../realEstate/propertyPin';
import type { SitePinInfo } from './sitePinInfo';
import type { CountryId } from '../../data/types';
import { LEASE_ONLY_KEY, layerOn, type MapLayerId } from '../../data/mapLayers';
import type { GameState, Lot, OfficeListing, Site } from '../../sim/state';

export type PinKind =
  | 'mine'
  | 'hq'
  | 'rival'
  | 'office'
  | 'bureau'
  | 'agency'
  | 'centralBank'
  | 'rivalHq'
  | 'employer'
  | 'university'
  | 'investmentBank'
  | 'property'
  | 'conventionCenter'
  | 'lobbyingFirm'
  | 'lot';

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
  /** Oxblood dot: an unresolved incident at this branch (SCREENS §0.2). */
  alert?: boolean;
  branchId?: string;
  /** Your office in this building (kind 'hq'). */
  officeId?: string;
  /** Type icon for office, bureau and agency pins (offices also wear the For lease tag). */
  icon?: MapLayerId;
  /** The central bank pin's country. */
  countryId?: CountryId;
  /** Employer or university you partner with: a brand-ink seal on the medallion (ink = brand ink). */
  partner?: boolean;
  /** A failed rival's head office (distressed): drawn faded with a dashed ring. */
  muted?: boolean;
  /** Your acquired branch still converting (§19.8): old ink and monogram, with a progress ring. */
  converting?: { from: string; weeksLeft: number; progress: number };
  /** A short note under the medallion on Stage 7 sites ("For sale", "Open now"). */
  tag?: string;
}

/** Clustering seeds and stacking: yours first, then rivals, then other buildings, open locations last. */
const KIND_ORDER: Record<PinKind, number> = {
  mine: 0,
  hq: 1,
  rival: 2,
  office: 3,
  bureau: 4,
  agency: 5,
  centralBank: 6,
  rivalHq: 7,
  employer: 8,
  university: 9,
  investmentBank: 10,
  property: 11,
  conventionCenter: 12,
  lobbyingFirm: 13,
  lot: 14,
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
    const alert = s.incidents.active.some((i) => i.scopeKind === 'branch' && i.scope === occ.id);
    const conv = branch?.converting;
    const weeks = conv ? `${conv.weeksLeft} week${conv.weeksLeft === 1 ? '' : 's'} left` : '';
    const pin: PinSpec = {
      ...base,
      kind: 'mine',
      label: `Your branch, ${name}${conv ? `, converting from ${conv.name}, ${weeks}` : ''}${alert ? ', open incident' : ''}${waiting ? `, ${waiting} loan applications waiting` : ''}`,
      // An acquired branch keeps the old bank's colours until its conversion finishes.
      ink: conv?.ink ?? s.meta.brandInk,
      monogram: conv?.monogram ?? s.meta.monogram,
      badge: waiting > 0,
      alert,
      branchId: occ.id,
    };
    if (conv) {
      const total = MERGERS.conversionWeeks;
      pin.converting = {
        from: conv.name,
        weeksLeft: conv.weeksLeft,
        progress: Math.min(1, Math.max(0, (total - conv.weeksLeft) / total)),
      };
    }
    return pin;
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

/** A site's display name: the bureau's, agency's, rival head office's, employer's or university's. */
export function siteName(s: GameState | undefined, site: Site): string {
  switch (site.kind) {
    case 'agency':
      return AGENCIES[site.refId]?.name ?? 'Marketing agency';
    case 'bureau':
      return `${site.refId} credit bureau`;
    case 'rivalHq':
      return `${s?.rivals[site.refId]?.name ?? 'Rival bank'} head office`;
    case 'investmentBank':
      return INVESTMENT_BANKS[site.refId]?.name ?? 'Investment bank';
    case 'property':
      return `Building at ${site.address}`;
    case 'conventionCenter':
      return (
        CONVENTIONS_CALENDAR.find((c) => c.id === site.refId)?.venue ??
        DEFAULT_VENUE(CITIES[site.cityId]?.name ?? 'City')
      );
    case 'lobbyingFirm':
      return LOBBY_FIRMS[site.refId]?.name ?? 'Lobbying firm';
    default:
      return site.employer?.name ?? site.refId;
  }
}

const SITE_ICON: Record<Site['kind'], MapLayerId> = {
  bureau: 'creditBureaus',
  agency: 'marketingAgencies',
  rivalHq: 'banks',
  employer: 'employers',
  university: 'universities',
  investmentBank: 'investmentBanks',
  property: 'realEstate',
  conventionCenter: 'conventions',
  lobbyingFirm: 'lobbyingFirms',
};

const SITE_LAYER: Record<Site['kind'], MapLayerId> = SITE_ICON;

/** You hold a partnership (or the graduate program) at this employer or university. */
export function isPartnerSite(s: GameState, site: Site): boolean {
  if (site.kind !== 'employer' && site.kind !== 'university') return false;
  if (s.company.gradProgram?.siteId === site.id) return true;
  return Object.values(s.partnerships).some((p) => p.siteId === site.id && p.status === 'active');
}

/** Visibility, label, tag and owned seal for Stage 7 sites; undefined for other kinds. */
function stage7Info(s: GameState, site: Site): SitePinInfo | undefined {
  if (site.kind === 'property') return propertyPinInfo(s, site);
  if (site.kind === 'conventionCenter') return conventionPinInfo(s, site);
  if (site.kind === 'lobbyingFirm') return { visible: true, suffix: ', lobbying firm' };
  return undefined;
}

function sitePin(s: GameState, map: CityMap, site: Site, info?: SitePinInfo): PinSpec {
  const at = anchor(map, site.tile);
  const partner = isPartnerSite(s, site) || !!info?.owned;
  const suffix =
    (info
      ? info.suffix
      : site.kind === 'agency'
        ? ', marketing agency'
        : site.kind === 'employer'
          ? ', employer'
          : site.kind === 'investmentBank'
            ? ', investment bank'
            : site.kind === 'rivalHq' && s.rivals[site.refId]?.status === 'distressed'
              ? ', seized by regulators'
              : '') + (partner && !info?.owned ? ', your partner' : '');
  const rival = site.kind === 'rivalHq' ? s.rivals[site.refId] : undefined;
  const pin: PinSpec = {
    id: site.id,
    kind: site.kind,
    x: at.x,
    y: at.y,
    label: `${siteName(s, site)}${suffix}, ${site.address}`,
    ink: rival?.ink ?? (partner ? s.meta.brandInk : ''),
    monogram: rival?.monogram ?? '',
    badge: false,
    icon: SITE_ICON[site.kind],
    ...(rival && rival.status !== 'active' ? { muted: true } : {}),
  };
  if (partner) pin.partner = true;
  if (info?.tag) pin.tag = info.tag;
  return pin;
}

/** The central bank landmark (one per city; it speaks for the city's country). */
function centralBankPin(s: GameState, map: CityMap): PinSpec | undefined {
  const lm = map.landmarks.find((l) => l.id === 'centralBank');
  const country = CITIES[map.cityId]?.country;
  if (!lm || !country) return undefined;
  const mid = Math.floor(lm.size / 2);
  const at = anchor(map, { x: lm.x + mid, y: lm.y + mid });
  return {
    id: `cb_${map.cityId}`,
    kind: 'centralBank',
    x: at.x,
    y: at.y,
    label: `${COUNTRIES[country].centralBank}`,
    ink: '',
    monogram: '',
    badge: false,
    icon: 'banks',
    countryId: country,
  };
}

/** Whether a site kind's stage is switched on (bureaus and agencies come with the HQ stage). */
export function siteEnabled(
  kind: Site['kind'],
  features: Record<FeatureId, boolean> = FEATURES,
): boolean {
  if (kind === 'bureau' || kind === 'agency') return features.hq;
  if (kind === 'investmentBank') return features.capitalMarkets;
  if (kind === 'property' || kind === 'conventionCenter' || kind === 'lobbyingFirm')
    return features.investments;
  return features.competition;
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
    for (const site of Object.values(s.world.sites)) {
      if (site.cityId !== map.cityId) continue;
      if (!siteEnabled(site.kind, features)) continue;
      // A seized or acquired rival's head office leaves the map; a distressed one stays, faded.
      const status = site.kind === 'rivalHq' ? s.rivals[site.refId]?.status : undefined;
      if (status === 'seized' || status === 'acquired') continue;
      if (!layerOn(layers, SITE_LAYER[site.kind])) continue;
      const info = stage7Info(s, site);
      if (info && !info.visible) continue;
      pins.push(sitePin(s, map, site, info));
    }
  }
  if (features.competition && layerOn(layers, 'banks')) {
    const cb = centralBankPin(s, map);
    if (cb) pins.push(cb);
  }
  return pins.sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** A string that changes whenever any pin would look or act differently. */
export function pinsKey(pins: PinSpec[]): string {
  return pins
    .map(
      (p) =>
        `${p.id}|${p.kind}|${p.ink}|${p.monogram}|${p.label}|${p.muted ? 1 : 0}|${p.converting?.weeksLeft ?? ''}|${p.tag ?? ''}|${p.partner ? 1 : 0}`,
    )
    .join(';');
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
    // A converting branch still flies the old bank's colours (§19.8).
    out[lot.id] =
      occ.type === 'player'
        ? { type: 'player', ink: s.branches[occ.id]?.converting?.ink ?? s.meta.brandInk }
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
