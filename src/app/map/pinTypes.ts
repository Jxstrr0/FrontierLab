// Map pin types (SCREENS §2, ART_DIRECTION §2): what kind of place a pin
// marks and everything the pin layer needs to draw and label it, plus the roof
// anchor every pin stands on. Built by pins.ts and sitePins.ts.
import type { CityMap } from '../../art/citygen';
import { roofAnchor } from '../../art/iso';
import type { CountryId } from '../../data/types';
import type { MapLayerId } from '../../data/mapLayers';

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
  | 'energySite'
  | 'university'
  | 'investmentBank'
  | 'property'
  | 'conventionCenter'
  | 'lobbyingFirm'
  | 'airport'
  | 'autoDealer'
  | 'auctionHouse'
  | 'vacationHome'
  | 'stadium'
  | 'business'
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
  /** Brass dot: Deal Desk proposal requests waiting (SCREENS §0.2). */
  badge: boolean;
  /** Oxblood dot: an unresolved incident at this branch (SCREENS §0.2). */
  alert?: boolean;
  branchId?: string;
  /** Your data center on this lot (C2c). */
  dataCenterId?: string;
  /** Your office in this building (kind 'hq'). */
  officeId?: string;
  /** Type icon for office, bureau and agency pins (offices also wear the For lease tag). */
  icon?: MapLayerId;
  /** The central bank pin's country. */
  countryId?: CountryId;
  /** Employer, university or car dealer you partner with: a brand-ink seal on the medallion (ink = brand ink). */
  partner?: boolean;
  /** A place you own (HQ, property, vacation home, club): a brand-ink crest with the type's glyph. */
  owned?: boolean;
  /** A failed rival's head office (distressed): drawn faded with a dashed ring. */
  muted?: boolean;
  /** Your acquired branch still converting (§19.8): old ink and monogram, with a progress ring. */
  converting?: { from: string; weeksLeft: number; progress: number };
  /** The business a business pin opens (stage C5a). */
  businessId?: string;
  /** The club a stadium pin opens (Stage 9). */
  clubId?: string;
  /** A short note under the medallion on Stage 7 sites ("For sale", "Open now"). */
  tag?: string;
  /** Caption under the pin at close zoom when not the type's own (a rival's short name). */
  caption?: string;
}

/** World position (zoom-1 px) of the roof of the building on this tile. */
export function pinAnchor(map: CityMap, tile: { x: number; y: number }) {
  const floors = map.floors[tile.y * map.tiles + tile.x] ?? 0;
  return roofAnchor(map.tiles, tile.x, tile.y, floors);
}
