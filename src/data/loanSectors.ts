// Loan Desk sectors and business names (docs/CONTENT.md §21).
// Pentagon order: Management, Track record, Market, Competitiveness, Financial health.
import type { DistrictId, Pentagon } from './types';

export interface LoanSectorSpec {
  id: string;
  name: string;
  amountMult: number;
  termYears: [number, number];
  profile: Pentagon;
  districts: DistrictId[];
  /** Business-type words that fit the sector, for generated names. */
  types: string[];
  /** Only offered in S/M cities. */
  smallCitiesOnly?: boolean;
}

export const LOAN_SECTORS: LoanSectorSpec[] = [
  {
    id: 'cafe',
    name: 'Café & restaurant',
    amountMult: 0.6,
    termYears: [3, 5],
    profile: [5, 4, 5, 4, 4],
    districts: ['downtown', 'university'],
    types: ['Bakery', 'Café', 'Brewing Co.'],
  },
  {
    id: 'retail',
    name: 'Retail shop',
    amountMult: 0.8,
    termYears: [3, 5],
    profile: [5, 5, 5, 5, 5],
    districts: ['downtown', 'midtown'],
    types: ['Outfitters', 'Design Studio'],
  },
  {
    id: 'construction',
    name: 'Construction',
    amountMult: 1.6,
    termYears: [2, 5],
    profile: [5, 6, 6, 5, 5],
    districts: ['suburbs', 'industrial'],
    types: ['Construction'],
  },
  {
    id: 'logistics',
    name: 'Logistics',
    amountMult: 1.4,
    termYears: [3, 7],
    profile: [6, 6, 6, 5, 5],
    districts: ['industrial'],
    types: ['Logistics'],
  },
  {
    id: 'clinic',
    name: 'Medical/dental clinic',
    amountMult: 1.2,
    termYears: [5, 7],
    profile: [7, 7, 6, 6, 7],
    districts: ['midtown', 'suburbs'],
    types: ['Dental', 'Clinic'],
  },
  {
    id: 'tech',
    name: 'Tech startup',
    amountMult: 1.0,
    termYears: [1, 3],
    profile: [6, 3, 8, 6, 3],
    districts: ['university', 'financial'],
    types: ['Robotics', 'Design Studio'],
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    amountMult: 2.0,
    termYears: [5, 7],
    profile: [6, 7, 5, 5, 6],
    districts: ['industrial'],
    types: ['Brewing Co.', 'Robotics'],
  },
  {
    id: 'farm',
    name: 'Farm & agri',
    amountMult: 1.5,
    termYears: [3, 7],
    profile: [6, 7, 5, 5, 5],
    districts: ['suburbs'],
    types: ['Farms'],
    smallCitiesOnly: true,
  },
  {
    id: 'professional',
    name: 'Professional services',
    amountMult: 0.7,
    termYears: [2, 4],
    profile: [7, 7, 5, 6, 7],
    districts: ['financial'],
    types: ['Law Group', 'Design Studio'],
  },
  {
    id: 'hotel',
    name: 'Hotel & hospitality',
    amountMult: 2.5,
    termYears: [5, 7],
    profile: [6, 6, 5, 5, 4],
    districts: ['waterfront', 'downtown'],
    types: ['Hotel'],
  },
];

export const BUSINESS_PREFIXES = [
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
];

/** Generic types usable by any sector when a district has no specific match. */
export const GENERIC_BUSINESS_TYPES = ['Auto Repair', 'Outfitters', 'Logistics'];
