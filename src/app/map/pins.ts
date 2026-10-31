// Pin data for the map (SCREENS §2, ART_DIRECTION §2): one entry per storefront
// lot (your sales offices and data centers, rivals and open locations) in the
// current city and per office building and
// site (sitePins.ts), filtered by the Layers settings, plus the central bank
// and airport landmarks, each with its roof anchor in world px and its
// accessible label. An acquired office still converting wears the old lab's
// ink with a progress ring. Types live in pinTypes.ts; what the renderer draws
// on each lot in mapOccupants.ts. Read-only views of GameState.
import type { CityMap } from '../../art/citygen';
import { MERGERS } from '../../config/balance';
import { LEASE_ONLY_KEY, layerOn } from '../../data/mapLayers';
import type { Business, GameState, Lot, OfficeListing } from '../../sim/state';
import { vendorCaption, vendorName } from '../business/businessView';
import { newRfpsByBranch } from '../branch/dealDeskSelectors';
import { stadiumPins } from '../franchise/stadiumPin';
import { airportPin, centralBankPin } from './landmarkPins';
import { rivalShortName } from './markers';
import { pinAnchor, type PinKind, type PinSpec } from './pinTypes';
import { siteLayer, sitePin, stage7Info } from './sitePins';

export type { PinKind, PinSpec } from './pinTypes';

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
  energySite: 8,
  university: 9,
  investmentBank: 10,
  property: 11,
  conventionCenter: 12,
  lobbyingFirm: 13,
  airport: 14,
  autoDealer: 15,
  auctionHouse: 16,
  vacationHome: 17,
  stadium: 18,
  business: 19,
  lot: 20,
};

/** New proposal requests waiting at each of your offices (the pin's badge). */
export const pendingByBranch = (s: GameState): Record<string, number> => newRfpsByBranch(s);

function lotPin(s: GameState, map: CityMap, lot: Lot, pending: Record<string, number>): PinSpec {
  const at = pinAnchor(map, lot.tile);
  const occ = lot.occupant;
  const base = { id: lot.id, x: at.x, y: at.y };
  const dc = occ?.type === 'player' ? s.dataCenters[occ.id] : undefined;
  if (dc) {
    // Your data center (C2c): your crest, noted "Data center", opening its panel.
    return {
      ...base,
      kind: 'mine',
      label: `Your data center, ${dc.name}${dc.status === 'fitout' ? ', fitting out' : ''}`,
      ink: s.meta.brandInk,
      monogram: s.meta.monogram,
      badge: false,
      dataCenterId: dc.id,
      tag: dc.status === 'fitout' ? 'Fit-out' : 'Data center',
    };
  }
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
      label: `Your sales office, ${name}${conv ? `, converting from ${conv.name}, ${weeks}` : ''}${alert ? ', open incident' : ''}${waiting ? `, ${waiting} proposal requests waiting` : ''}`,
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
      label: `${bank?.name ?? 'Rival lab'} sales office, ${lot.address}`,
      ink: bank?.ink ?? '#5a5a5a',
      monogram: bank?.monogram ?? '?',
      badge: false,
      caption: rivalShortName(bank?.name ?? 'Rival lab'),
    };
  }
  return {
    ...base,
    kind: 'lot',
    label: `Available sales office location, ${lot.address}`,
    ink: '',
    monogram: '',
    badge: false,
  };
}

/** A business on its storefront (C5a): the Businesses medallion, your seal once it is yours. */
function businessPin(s: GameState, map: CityMap, lot: Lot, b: Business): PinSpec {
  const at = pinAnchor(map, lot.tile);
  const mine = b.vendor?.type === 'player';
  const pin: PinSpec = {
    id: lot.id,
    kind: 'business',
    x: at.x,
    y: at.y,
    label: `${b.name}, ${b.vendor ? `served by ${vendorName(s, b)}` : 'no AI vendor yet'}, ${lot.address}`,
    ink: mine ? s.meta.brandInk : '',
    monogram: '',
    badge: false,
    icon: 'employers',
    businessId: b.id,
  };
  const caption = vendorCaption(s, b);
  if (caption) pin.caption = caption;
  if (mine) pin.partner = true;
  return pin;
}

function officePin(s: GameState, map: CityMap, o: OfficeListing): PinSpec {
  const at = pinAnchor(map, o.tile);
  const base = { id: o.id, x: at.x, y: at.y, badge: false };
  if (o.officeId) {
    return {
      ...base,
      kind: 'hq',
      label: `Your HQ, ${o.address}`,
      ink: s.meta.brandInk,
      monogram: s.meta.monogram,
      officeId: o.officeId,
      owned: true,
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

/** Pins for the city on screen, after the Layers settings, in stacking order. */
export function buildPins(s: GameState, map: CityMap, lots: Lot[]): PinSpec[] {
  const layers = s.settings.layers;
  const pins: PinSpec[] = [];
  const offices = layerOn(layers, 'branches');
  const dataCenters = layerOn(layers, 'dataCenters');
  if (offices || dataCenters) {
    const leaseOnly = layers[LEASE_ONLY_KEY] === true;
    const pending = pendingByBranch(s);
    for (const lot of lots) {
      if (lot.cityId !== map.cityId) continue;
      // Businesses (C5a) sit on the Businesses layer, below.
      if (lot.occupant?.type === 'business') continue;
      // Your data centers have their own layer (C2d); every other lot is a sales office or storefront.
      const dc = lot.occupant?.type === 'player' && !!s.dataCenters[lot.occupant.id];
      if (!(dc ? dataCenters : offices)) continue;
      if (leaseOnly && lot.occupant && !dc) continue;
      pins.push(lotPin(s, map, lot, pending));
    }
  }
  if (layerOn(layers, 'employers')) {
    for (const lot of lots) {
      const b = lot.occupant?.type === 'business' ? s.businesses[lot.occupant.id] : undefined;
      if (b && lot.cityId === map.cityId) pins.push(businessPin(s, map, lot, b));
    }
  }
  if (layerOn(layers, 'offices')) {
    for (const o of Object.values(s.world.officeListings))
      if (o.cityId === map.cityId) pins.push(officePin(s, map, o));
  }
  for (const site of Object.values(s.world.sites)) {
    if (site.cityId !== map.cityId) continue;
    // A seized, acquired or merged rival's head office leaves the map; a distressed one stays, faded.
    const status = site.kind === 'rivalHq' ? s.rivals[site.refId]?.status : undefined;
    if (status === 'seized' || status === 'acquired' || status === 'merged') continue;
    if (!layerOn(layers, siteLayer(site))) continue;
    const info = stage7Info(s, site);
    if (info && !info.visible) continue;
    pins.push(sitePin(s, map, site, info));
  }
  if (layerOn(layers, 'banks')) {
    const cb = centralBankPin(map);
    if (cb) pins.push(cb);
  }
  // Stage 9: club stadiums (Sports Teams layer).
  if (layerOn(layers, 'sportsTeams')) pins.push(...stadiumPins(s, map));
  // Stage 8: the airport is always on the map (SCREENS §18), whatever the Layers say.
  const ap = airportPin(map);
  if (ap) pins.push(ap);
  return pins.sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** A string that changes whenever any pin would look or act differently. */
export function pinsKey(pins: PinSpec[]): string {
  return pins
    .map(
      (p) =>
        `${p.id}|${p.kind}|${p.ink}|${p.monogram}|${p.label}|${p.muted ? 1 : 0}|${p.converting?.weeksLeft ?? ''}|${p.tag ?? ''}|${p.partner ? 1 : 0}|${p.owned ? 1 : 0}|${p.caption ?? ''}`,
    )
    .join(';');
}
