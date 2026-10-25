// HQ brand campaigns and marketing agencies (docs/CONTENT.md §11, §16).
// Brand campaigns run weekly at city or country scope and raise city brand
// awareness b; agency packages are one-off boosts spread over their length.
import type { SegmentId } from './types';

export interface BrandCampaignSpec {
  id: string;
  name: string;
  scopes: ('city' | 'country')[];
  /** Weekly cost by scope. */
  costPerWeek: { city?: number; country?: number };
  /** Weekly gain to b in each city covered, by scope. */
  gainPerWeek: { city?: number; country?: number };
  /** Segment take-up multipliers while running. */
  segmentBoost?: Partial<Record<SegmentId, number>>;
  /** Needs a sports franchise in the city (Stage 9). */
  needsFranchise?: boolean;
}

export const BRAND_CAMPAIGNS: Record<string, BrandCampaignSpec> = {
  tv: {
    id: 'tv',
    name: 'TV Spots',
    scopes: ['city', 'country'],
    costPerWeek: { city: 25_000, country: 120_000 },
    gainPerWeek: { city: 0.02, country: 0.012 },
  },
  billboards: {
    id: 'billboards',
    name: 'Billboards',
    scopes: ['city'],
    costPerWeek: { city: 8_000 },
    gainPerWeek: { city: 0.012 },
  },
  podcasts: {
    id: 'podcasts',
    name: 'Podcast Ads',
    scopes: ['country'],
    costPerWeek: { country: 5_000 },
    gainPerWeek: { country: 0.006 },
    segmentBoost: { YP: 1.05 },
  },
  creators: {
    id: 'creators',
    name: 'Creator Partnerships',
    scopes: ['country'],
    costPerWeek: { country: 12_000 },
    gainPerWeek: { country: 0.01 },
    segmentBoost: { STU: 1.08, YP: 1.08 },
  },
  naming: {
    id: 'naming',
    name: 'Arena Naming Rights',
    scopes: ['city'],
    costPerWeek: { city: 40_000 },
    gainPerWeek: { city: 0.03 },
    needsFranchise: true,
  },
};

export interface AgencyPackageSpec {
  id: string;
  name: string;
  weeks: number;
  cost: number;
  /** Total brand boost in the chosen city, spread evenly over the weeks. */
  boost: number;
  /** Branch-rating bonus in that city, and for how long. */
  branchBonus?: { bonus: number; weeks: number };
}

export interface AgencySpec {
  id: string;
  name: string;
  packages: AgencyPackageSpec[];
}

export const AGENCIES: Record<string, AgencySpec> = {
  brightwell: {
    id: 'brightwell',
    name: 'Brightwell Creative',
    packages: [{ id: 'city_blitz', name: 'City Blitz', weeks: 8, cost: 180_000, boost: 0.25 }],
  },
  northwind_pike: {
    id: 'northwind_pike',
    name: 'Northwind & Pike',
    packages: [
      // The cheap starter package: a short push a founder can afford (renamed from
      // "Grand Opening Week" so it isn't mistaken for a new branch's own opening boost).
      { id: 'street_team', name: 'Street Team', weeks: 2, cost: 45_000, boost: 0.1 },
    ],
  },
  halcyon: {
    id: 'halcyon',
    name: 'Studio Halcyon',
    packages: [
      {
        id: 'prestige',
        name: 'Prestige Campaign',
        weeks: 12,
        cost: 420_000,
        boost: 0.3,
        branchBonus: { bonus: 0.1, weeks: 26 },
      },
    ],
  },
};

export const AGENCY_ORDER: readonly string[] = ['brightwell', 'northwind_pike', 'halcyon'];

/**
 * Agencies with an office in a city (CONTENT §16): all three in L and XL
 * cities, one in M cities (chosen by the city's place in the list), none in S.
 */
export function agenciesIn(city: { size: 'S' | 'M' | 'L' | 'XL' }, cityIndex: number): string[] {
  if (city.size === 'L' || city.size === 'XL') return [...AGENCY_ORDER];
  if (city.size === 'M') return [AGENCY_ORDER[cityIndex % AGENCY_ORDER.length]!];
  return [];
}
