// Map layers (DESIGN §3.1 "Map layers", SCREENS §2): the 16 pin types the
// Layers sheet can show or hide; toggles persist in settings.layers.
export const MAP_LAYER_IDS = [
  'branches',
  'dataCenters',
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
  'energySites',
] as const;
export type MapLayerId = (typeof MAP_LAYER_IDS)[number];

export interface MapLayerSpec {
  id: MapLayerId;
  label: string;
}

export const MAP_LAYERS: readonly MapLayerSpec[] = [
  // Your sales offices, rival offices and open storefronts ($ pins). Id kept for saved toggles.
  { id: 'branches', label: 'Sales Offices' },
  // Stage C2d: your data centers on storefront lots, and the regional energy sites.
  { id: 'dataCenters', label: 'Data Centers' },
  { id: 'offices', label: 'Offices' },
  { id: 'realEstate', label: 'Real Estate' },
  { id: 'creditBureaus', label: 'Data Vendors' },
  { id: 'banks', label: 'Rival Labs' },
  { id: 'investmentBanks', label: 'Investment Banks' },
  { id: 'marketingAgencies', label: 'Marketing Agencies' },
  { id: 'conventions', label: 'Conferences' },
  { id: 'lobbyingFirms', label: 'Lobbying Firms' },
  { id: 'sportsTeams', label: 'Sports Teams' },
  { id: 'autoDealers', label: 'Auto Dealers' },
  { id: 'auctionHouses', label: 'Auction Houses' },
  { id: 'universities', label: 'Universities' },
  // C5a: customer businesses and the anchor employers. Id kept for saved toggles.
  { id: 'employers', label: 'Businesses' },
  { id: 'energySites', label: 'Energy Sites' },
];

/** Settings key for the Sales Offices layer's "Available only" sub-filter (off by default). */
export const LEASE_ONLY_KEY = 'branches.leaseOnly';

/** Whether a layer is shown: layers are on unless the player switched them off. */
export const layerOn = (layers: Record<string, boolean>, id: MapLayerId): boolean =>
  layers[id] !== false;
