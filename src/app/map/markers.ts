// The map's shape language (ART_DIRECTION §2 Pins, §7 Icons): every pin kind
// gets a silhouette players learn once, and every kind of place its own ink,
// glyph and short caption.
//   crest     — banks: your branches and HQ (brand ink), rival branches and head offices (ivory, their ink)
//   coin      — open branch locations: a small, quiet "$"
//   medallion — places you deal with: a round coin in the type's ink with an ivory glyph
//   tag       — buildings you rent or buy: a price tag in the type's ink
//   landmark  — the central bank, airport and stadium: a larger scalloped seal
// The same marker (shape, ink, glyph) is used wherever the type appears: map
// pins, clusters, the Layers legend and panel headers. Shape and glyph carry
// the meaning on their own, so colour is never the only cue.
import type { IconName } from '../../art/icons';
import { RIVAL_CAPTION_GENERIC_WORDS } from '../../config/mapView';
import type { MapLayerId } from '../../data/mapLayers';
import type { PinKind } from './pins';

export type MarkShape = 'crest' | 'coin' | 'medallion' | 'tag' | 'landmark';

/** A type marker: a place layer, plus vacation homes and the two landmarks. */
export type MarkerId =
  Exclude<MapLayerId, 'branches' | 'banks'> | 'vacationHomes' | 'centralBank' | 'airport';

export interface MarkerStyle {
  icon: IconName;
  /** The type's ink (a tokens.css custom property). */
  ink: string;
  /** Glyph and text colour on the ink (ivory unless the ink is light). */
  glyph?: string;
  /** Short caption under the pin at close zoom, and the legend's name. */
  caption: string;
  shape: 'medallion' | 'tag' | 'landmark';
}

export const MARKERS: Record<MarkerId, MarkerStyle> = {
  // A light brass tag with dark ink: "For lease" reads apart from every dark type ink.
  offices: {
    icon: 'office',
    ink: 'var(--type-office)',
    glyph: 'var(--vault-deep)',
    caption: 'Office',
    shape: 'tag',
  },
  realEstate: {
    icon: 'realEstate',
    ink: 'var(--type-real-estate)',
    caption: 'Property',
    shape: 'tag',
  },
  vacationHomes: {
    icon: 'villa',
    ink: 'var(--type-vacation-home)',
    caption: 'Vacation home',
    shape: 'tag',
  },
  creditBureaus: {
    icon: 'bureau',
    ink: 'var(--type-bureau)',
    caption: 'Credit bureau',
    shape: 'medallion',
  },
  investmentBanks: {
    icon: 'investmentBank',
    ink: 'var(--type-investment-bank)',
    caption: 'Investment bank',
    shape: 'medallion',
  },
  marketingAgencies: {
    icon: 'agency',
    ink: 'var(--type-agency)',
    caption: 'Marketing agency',
    shape: 'medallion',
  },
  conventions: {
    icon: 'convention',
    ink: 'var(--type-convention)',
    caption: 'Convention',
    shape: 'medallion',
  },
  lobbyingFirms: {
    icon: 'lobby',
    ink: 'var(--type-lobby)',
    caption: 'Lobbying firm',
    shape: 'medallion',
  },
  autoDealers: {
    icon: 'car',
    ink: 'var(--type-car-dealer)',
    caption: 'Car dealer',
    shape: 'medallion',
  },
  auctionHouses: {
    icon: 'gavel',
    ink: 'var(--type-auction)',
    caption: 'Auction house',
    shape: 'medallion',
  },
  universities: {
    icon: 'university',
    ink: 'var(--type-university)',
    caption: 'University',
    shape: 'medallion',
  },
  employers: {
    icon: 'employer',
    ink: 'var(--type-employer)',
    caption: 'Employer',
    shape: 'medallion',
  },
  sportsTeams: { icon: 'trophy', ink: 'var(--type-sports)', caption: 'Stadium', shape: 'landmark' },
  centralBank: {
    icon: 'dome',
    ink: 'var(--type-central-bank)',
    caption: 'Central bank',
    shape: 'landmark',
  },
  airport: { icon: 'plane', ink: 'var(--type-airport)', caption: 'Airport', shape: 'landmark' },
};

/** The type marker each non-bank pin kind wears. */
const KIND_MARKER: Partial<Record<PinKind, MarkerId>> = {
  office: 'offices',
  property: 'realEstate',
  vacationHome: 'vacationHomes',
  bureau: 'creditBureaus',
  investmentBank: 'investmentBanks',
  agency: 'marketingAgencies',
  conventionCenter: 'conventions',
  lobbyingFirm: 'lobbyingFirms',
  autoDealer: 'autoDealers',
  auctionHouse: 'auctionHouses',
  university: 'universities',
  employer: 'employers',
  stadium: 'sportsTeams',
  centralBank: 'centralBank',
  airport: 'airport',
};

export const markerOf = (kind: PinKind): MarkerId | undefined => KIND_MARKER[kind];

export function shapeOf(kind: PinKind): MarkShape {
  if (kind === 'mine' || kind === 'hq' || kind === 'rival' || kind === 'rivalHq') return 'crest';
  if (kind === 'lot') return 'coin';
  const m = KIND_MARKER[kind];
  return m ? MARKERS[m].shape : 'medallion';
}

/** Pins in your brand ink, lifted above the rest. */
const isYoursKind = (kind: PinKind): boolean => kind === 'mine' || kind === 'hq';

/**
 * Which pins may merge into one cluster at the far zoom: only like with like,
 * so a cluster can show what it holds. Landmarks never merge.
 */
export function clusterGroup(p: { id: string; kind: PinKind }): string {
  if (isYoursKind(p.kind)) return 'yours';
  const shape = shapeOf(p.kind);
  if (shape === 'crest') return 'rival';
  if (shape === 'coin') return 'lot';
  if (shape === 'landmark') return `landmark:${p.id}`;
  return shape;
}

/**
 * Stacking tiers: open locations lowest, then the wide price tags, places and
 * rivals, landmarks, and yours on top.
 */
export function stackTier(kind: PinKind): number {
  if (isYoursKind(kind)) return 4;
  const shape = shapeOf(kind);
  return shape === 'coin' ? 0 : shape === 'tag' ? 1 : shape === 'landmark' ? 3 : 2;
}

/** The colour a type's glyph and words are printed in on its ink. */
export const glyphInk = (id: MarkerId): string => MARKERS[id].glyph ?? 'var(--ivory)';

/** "Harbourline Bank" → "Harbourline", "Banque Lumière" → "Lumière": the caption under a rival's crest. */
export function rivalShortName(name: string): string {
  const generic = new Set(RIVAL_CAPTION_GENERIC_WORDS.map((w) => w.toLowerCase()));
  const words = name.split(/\s+/).filter(Boolean);
  const kept = words.filter((w) => !generic.has(w.toLowerCase()));
  return kept.length ? kept.join(' ') : name;
}

/** The short caption under a pin at close zoom ('' for none). */
export function captionOf(p: { kind: PinKind; caption?: string }): string {
  if (p.caption !== undefined) return p.caption;
  const m = KIND_MARKER[p.kind];
  return m ? MARKERS[m].caption : '';
}
