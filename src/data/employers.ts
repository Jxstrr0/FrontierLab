// Employers and universities (docs/CONTENT.md §14, §16): employer types with
// staff counts and income multipliers, the named employers some cities have,
// and the university names. Generation picks 2–4 employers per city (City Hall
// always, a port in waterfront cities) plus one university.
import type { DistrictId } from './types';

export interface EmployerType {
  id: string;
  label: string;
  employees: number;
  incomeMult: number;
  /** Where on the map it stands. */
  district: DistrictId;
}

export const EMPLOYER_TYPES: Record<string, EmployerType> = {
  hospital: {
    id: 'hospital',
    label: 'Hospital',
    employees: 2000,
    incomeMult: 1.1,
    district: 'midtown',
  },
  university: {
    id: 'university',
    label: 'University',
    employees: 3500,
    incomeMult: 1.0,
    district: 'university',
  },
  autoPlant: {
    id: 'autoPlant',
    label: 'Auto Plant',
    employees: 2500,
    incomeMult: 1.0,
    district: 'industrial',
  },
  techCampus: {
    id: 'techCampus',
    label: 'Tech Campus',
    employees: 1800,
    incomeMult: 1.6,
    district: 'downtown',
  },
  cityHall: {
    id: 'cityHall',
    label: 'City Hall',
    employees: 5000,
    incomeMult: 1.05,
    district: 'downtown',
  },
  port: {
    id: 'port',
    label: 'Port Authority',
    employees: 1500,
    incomeMult: 1.0,
    district: 'waterfront',
  },
  /** Regional sites before the audit fixes used one shared type; kept so older saves still read. */
  resourceCamp: {
    id: 'resourceCamp',
    label: 'Resource Camp',
    employees: 3000,
    incomeMult: 1.5,
    district: 'industrial',
  },
  oilSands: {
    id: 'oilSands',
    label: 'Oil Sands Camp',
    employees: 4000,
    incomeMult: 1.6,
    district: 'industrial',
  },
  ironMine: {
    id: 'ironMine',
    label: 'Iron Ore Mine',
    employees: 3000,
    incomeMult: 1.7,
    district: 'industrial',
  },
  shaleField: {
    id: 'shaleField',
    label: 'Shale Field Services',
    employees: 2500,
    incomeMult: 1.5,
    district: 'industrial',
  },
  potashMine: {
    id: 'potashMine',
    label: 'Potash Mine',
    employees: 1200,
    incomeMult: 1.4,
    district: 'industrial',
  },
};

/** Types any city can draw from after City Hall and the port. */
export const COMMON_EMPLOYER_TYPES = ['hospital', 'autoPlant', 'techCampus'] as const;

/** City-specific employers that replace one random pick: cityId → [type, name]. */
export const NAMED_EMPLOYERS: Record<string, [string, string][]> = {
  sas: [['potashMine', 'Prairie Potash Co.']],
};

/**
 * Name patterns per type; {city} is replaced by the city name. Most patterns
 * carry the city (2026-10-31) so the same plant or campus doesn't stand in
 * every city on the map.
 */
export const EMPLOYER_NAMES: Record<string, string[]> = {
  hospital: [
    '{city} General Hospital',
    '{city} Health Centre',
    '{city} Royal Infirmary',
    '{city} Children’s Hospital',
    '{city} Memorial Hospital',
    "St. Brendan's Hospital",
    'Mercy Vale Hospital',
    'Harbourlight Medical Centre',
  ],
  autoPlant: [
    'Kestrel Motors {city} Assembly',
    'Halberd Auto Works',
    'Corvane Motor Plant',
    '{city} Motor Works',
    'Vantor Electric {city} Plant',
    'Ridgeline Trucks Assembly',
    'Solenne Automotive {city}',
    'Tallis Battery Works',
  ],
  techCampus: [
    'Lattice Labs Campus',
    'Northstar Software Park',
    'Quillon Systems Campus',
    '{city} Science Park',
    'Brightwire {city} Campus',
    'Orrery Cloud Campus',
    '{city} Digital Quarter',
    'Pellucid Devices Campus',
  ],
  cityHall: ['{city} City Hall'],
  port: ['Port of {city} Authority'],
  potashMine: ['Prairie Potash Co.'],
};

/** Employers per city (CONTENT §14 "Generation"). */
export const EMPLOYERS_PER_CITY = [2, 4] as const;

/** Named universities; other cities get a generated name. */
export const NAMED_UNIVERSITIES: Record<string, string> = {
  sas: 'Prairie State University',
  tor: 'Kingsley University',
  cal: 'Bow River University',
  van: 'Pacific Crest University',
  nyc: 'Hudson Polytechnic',
};

export const UNIVERSITY_PATTERNS = ['University of {city}', '{city} Institute of Technology'];

/** Average yearly pay at income mult 1 and city incomeIndex 1 (shown on the employer panel). */
export const BASE_ANNUAL_INCOME = 58_000;
