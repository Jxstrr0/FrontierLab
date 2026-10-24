// Districts (docs/CONTENT.md §3): foot traffic, rent, demographics, income.
import type { DistrictId, SegmentMix } from './types';

export interface DistrictSpec {
  id: DistrictId;
  name: string;
  footTraffic: number;
  baseRent: number;
  mix: SegmentMix;
  income: number;
  homeowners: number;
  /** Market rent, $ per m² per year (real estate, Stage 7). */
  marketRent: number;
}

export const DISTRICT_SPECS: Record<DistrictId, DistrictSpec> = {
  financial: {
    id: 'financial',
    name: 'Financial District',
    footTraffic: 14000,
    baseRent: 3200,
    mix: { STU: 0.05, YP: 0.4, FAM: 0.1, RET: 0.05, BIZ: 0.4 },
    income: 1.4,
    homeowners: 0.35,
    marketRent: 780,
  },
  downtown: {
    id: 'downtown',
    name: 'Downtown',
    footTraffic: 18000,
    baseRent: 2200,
    mix: { STU: 0.15, YP: 0.4, FAM: 0.15, RET: 0.1, BIZ: 0.2 },
    income: 1.1,
    homeowners: 0.3,
    marketRent: 620,
  },
  midtown: {
    id: 'midtown',
    name: 'Midtown',
    footTraffic: 9000,
    baseRent: 1300,
    mix: { STU: 0.1, YP: 0.3, FAM: 0.35, RET: 0.15, BIZ: 0.1 },
    income: 1.0,
    homeowners: 0.55,
    marketRent: 420,
  },
  university: {
    id: 'university',
    name: 'University',
    footTraffic: 11000,
    baseRent: 900,
    mix: { STU: 0.55, YP: 0.25, FAM: 0.08, RET: 0.05, BIZ: 0.07 },
    income: 0.7,
    homeowners: 0.2,
    marketRent: 340,
  },
  suburbs: {
    id: 'suburbs',
    name: 'Suburbs',
    footTraffic: 6000,
    baseRent: 750,
    mix: { STU: 0.05, YP: 0.15, FAM: 0.5, RET: 0.25, BIZ: 0.05 },
    income: 1.05,
    homeowners: 0.75,
    marketRent: 260,
  },
  industrial: {
    id: 'industrial',
    name: 'Industrial',
    footTraffic: 3000,
    baseRent: 500,
    mix: { STU: 0.03, YP: 0.2, FAM: 0.25, RET: 0.07, BIZ: 0.45 },
    income: 0.9,
    homeowners: 0.5,
    marketRent: 180,
  },
  waterfront: {
    id: 'waterfront',
    name: 'Waterfront',
    footTraffic: 10000,
    baseRent: 1800,
    mix: { STU: 0.05, YP: 0.35, FAM: 0.2, RET: 0.3, BIZ: 0.1 },
    income: 1.5,
    homeowners: 0.6,
    marketRent: 700,
  },
};
