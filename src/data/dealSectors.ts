// Customer business sectors and names (docs/CONTENT.md §21b, stage C5a). The
// businesses on spare storefronts draw a sector from their district, a name
// from a prefix and one of the sector's business words, and a pentagon around
// the sector's profile.
// Pentagon order: AI readiness, Budget, Data sensitivity, Switching cost, Financial health.
import type { DistrictId, Pentagon } from './types';

export interface DealSectorSpec {
  id: string;
  name: string;
  /** Multiplies the size's yearly AI budget. */
  budgetMult: number;
  /** Contract length in quarters, min and max. */
  termQuarters: [number, number];
  profile: Pentagon;
  districts: DistrictId[];
  /** Business words that fit the sector, for generated names. */
  types: string[];
  /** Only found in S/M cities. */
  smallCitiesOnly?: boolean;
}

export const DEAL_SECTORS: DealSectorSpec[] = [
  {
    id: 'cafe',
    name: 'Café & restaurant',
    budgetMult: 0.5,
    termQuarters: [2, 4],
    profile: [3, 3, 3, 3, 4],
    districts: ['downtown', 'university'],
    types: ['Bakery', 'Café', 'Brewing Co.', 'Kitchen'],
  },
  {
    id: 'retail',
    name: 'Retail',
    budgetMult: 0.8,
    termQuarters: [2, 4],
    profile: [5, 5, 4, 4, 5],
    districts: ['downtown', 'midtown'],
    types: ['Outfitters', 'Goods', 'Market'],
  },
  {
    id: 'construction',
    name: 'Construction',
    budgetMult: 0.9,
    termQuarters: [4, 8],
    profile: [3, 5, 4, 5, 5],
    districts: ['suburbs', 'industrial'],
    types: ['Construction', 'Builders'],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    budgetMult: 1.3,
    termQuarters: [4, 8],
    profile: [6, 6, 4, 6, 5],
    districts: ['industrial'],
    types: ['Logistics', 'Freight'],
  },
  {
    id: 'clinic',
    name: 'Health care',
    budgetMult: 1.2,
    termQuarters: [4, 8],
    profile: [5, 6, 9, 7, 7],
    districts: ['midtown', 'suburbs'],
    types: ['Dental', 'Clinic', 'Health'],
  },
  {
    id: 'tech',
    name: 'Software',
    budgetMult: 1.6,
    termQuarters: [2, 4],
    profile: [9, 6, 5, 3, 4],
    districts: ['university', 'financial'],
    types: ['Robotics', 'Software', 'Labs'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    budgetMult: 1.4,
    termQuarters: [4, 8],
    profile: [5, 6, 6, 7, 6],
    districts: ['industrial'],
    types: ['Works', 'Fabrication', 'Robotics'],
  },
  {
    id: 'farm',
    name: 'Farm & agri',
    budgetMult: 0.7,
    termQuarters: [4, 8],
    profile: [3, 4, 3, 5, 5],
    districts: ['suburbs'],
    types: ['Farms', 'Growers'],
    smallCitiesOnly: true,
  },
  {
    id: 'professional',
    name: 'Professional services',
    budgetMult: 1.1,
    termQuarters: [4, 6],
    profile: [7, 7, 8, 5, 7],
    districts: ['financial'],
    types: ['Law Group', 'Partners', 'Advisory'],
  },
  {
    id: 'finance',
    name: 'Finance & insurance',
    budgetMult: 2.0,
    termQuarters: [4, 8],
    profile: [6, 8, 9, 7, 7],
    districts: ['financial', 'downtown'],
    types: ['Mutual', 'Insurance', 'Capital'],
  },
  {
    id: 'media',
    name: 'Media & design',
    budgetMult: 0.9,
    termQuarters: [2, 4],
    profile: [8, 5, 3, 3, 4],
    districts: ['downtown', 'university', 'waterfront'],
    types: ['Design Studio', 'Media', 'Press'],
  },
  {
    id: 'hotel',
    name: 'Hotel & hospitality',
    budgetMult: 1.0,
    termQuarters: [4, 6],
    profile: [4, 5, 5, 5, 4],
    districts: ['waterfront', 'downtown'],
    types: ['Hotel', 'Inn'],
  },
];

export const DEAL_SECTOR_BY_ID: Record<string, DealSectorSpec> = Object.fromEntries(
  DEAL_SECTORS.map((s) => [s.id, s]),
);

/** Anchor accounts (employers) take this sector for their pentagon and term. */
export const ANCHOR_SECTOR: DealSectorSpec = {
  id: 'anchor',
  name: 'Major employer',
  budgetMult: 1,
  termQuarters: [8, 12],
  profile: [5, 8, 7, 8, 7],
  districts: [],
  types: [],
};

/** First words of generated business names (all fictional and generic). */
export const BUSINESS_NAME_PREFIXES = [
  'Northline',
  'Maple',
  'Riverside',
  'Summit',
  'Harbour',
  'Golden Prairie',
  'Blue Spruce',
  'Ironwood',
  'Lakeside',
  'Cedar',
  'Union',
  'Granite',
  'Bright Path',
  'Old Mill',
  'Copper Kettle',
  'Westbrook',
  'Foxglove',
  'Kestrel',
  'Lantern',
  'Meridian',
  'Oakhaven',
  'Pinecrest',
  'Quarry Lane',
  'Redwing',
  'Saltmarsh',
  'Tidewater',
  'Willowmere',
  'Ashgrove',
];
