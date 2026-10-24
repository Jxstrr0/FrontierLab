// Map layers (DESIGN §3.1 "Map layers", SCREENS §2): the 14 pin types the
// Layers sheet can show or hide. A layer is listed once the FEATURES flag of
// the stage that builds its system is on; toggles persist in settings.layers.
import { FEATURES, type FeatureId } from '../config/balance';

export const MAP_LAYER_IDS = [
  'branches',
  'offices',
  'realEstate',
  'creditBureaus',
  'banks',
  'investmentBanks',
  'marketingAgencies',
  'conventions',
  'lobbyingFirms',
  'sportsTeams',
  'autoDealers',
  'auctionHouses',
  'universities',
  'employers',
] as const;
export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

export interface MapLayerSpec {
  id: MapLayerId;
  label: string;
  /** The stage flag that brings this layer's buildings onto the map. */
  feature: FeatureId;
}

export const MAP_LAYERS: readonly MapLayerSpec[] = [
  // Your branches, rival branches and open branch locations ($ pins).
  { id: 'branches', label: 'Branches', feature: 'cityMap' },
  { id: 'offices', label: 'Offices', feature: 'hq' },
  { id: 'realEstate', label: 'Real Estate', feature: 'investments' },
  { id: 'creditBureaus', label: 'Credit Bureaus', feature: 'hq' },
  { id: 'banks', label: 'Banks', feature: 'competition' },
  { id: 'investmentBanks', label: 'Investment Banks', feature: 'capitalMarkets' },
  { id: 'marketingAgencies', label: 'Marketing Agencies', feature: 'hq' },
  { id: 'conventions', label: 'Conventions', feature: 'investments' },
  { id: 'lobbyingFirms', label: 'Lobbying Firms', feature: 'investments' },
  { id: 'sportsTeams', label: 'Sports Teams', feature: 'personalEmpire' },
  { id: 'autoDealers', label: 'Auto Dealers', feature: 'personalEmpire' },
  { id: 'auctionHouses', label: 'Auction Houses', feature: 'personalEmpire' },
  { id: 'universities', label: 'Universities', feature: 'competition' },
  { id: 'employers', label: 'Employers', feature: 'competition' },
];

/** Settings key for the Branches layer's "Available only" sub-filter (off by default). */
export const LEASE_ONLY_KEY = 'branches.leaseOnly';

/** Layers whose systems exist in this build. */
export function availableLayers(features: Record<FeatureId, boolean> = FEATURES): MapLayerSpec[] {
  return MAP_LAYERS.filter((l) => features[l.feature]);
}

/** Whether a layer is shown: layers are on unless the player switched them off. */
export const layerOn = (layers: Record<string, boolean>, id: MapLayerId): boolean =>
  layers[id] !== false;
