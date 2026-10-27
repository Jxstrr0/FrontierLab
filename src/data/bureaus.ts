// Training data and data vendor packages for the AI model (docs/CONTENT.md §13,
// stage C6a). Radar order: Reasoning, Speed, Breadth, Safety, Efficiency. The
// bank-era ids (bureau, cashflow, …, clearline_basic …) are kept so saves carry
// over; the names are the AI ones.
import { INTERNAL_HISTORY } from '../config/balance';
import type { Pentagon } from './types';

export interface DataInputSpec {
  id: string;
  name: string;
  profile: Pentagon;
  /** Licence cost per customer a year. */
  costPerCustomer: number;
  /** Customers the lab needs before the input can be used. */
  minCustomers?: number;
}

export const DATA_INPUTS: Record<string, DataInputSpec> = {
  bureau: { id: 'bureau', name: 'Web Crawl', profile: [6, 8, 4, 4, 7], costPerCustomer: 12 },
  cashflow: {
    id: 'cashflow',
    name: 'Licensed Books & Papers',
    profile: [8, 5, 7, 5, 7],
    costPerCustomer: 24,
  },
  altdata: {
    id: 'altdata',
    name: 'Forum & Social Data',
    profile: [5, 7, 9, 3, 4],
    costPerCustomer: 9,
  },
  // Reasoning rises from 4 to 9 with customers (SIMULATION §16.7).
  internal: {
    id: 'internal',
    name: 'Customer Feedback',
    profile: [4, 9, 6, 6, 7],
    costPerCustomer: 2,
    minCustomers: INTERNAL_HISTORY.minCustomers,
  },
  fraud: { id: 'fraud', name: 'Red-Team Data', profile: [5, 4, 4, 10, 6], costPerCustomer: 11 },
};

export interface BureauPackageSpec {
  id: string;
  name: string;
  bureau: string;
  mix: Record<string, number>;
  /** Licence cost per customer a year. */
  costPerCustomer: number;
}

export const BUREAU_PACKAGES: Record<string, BureauPackageSpec> = {
  clearline_basic: {
    id: 'clearline_basic',
    name: 'Clearline Web Base',
    bureau: 'Clearline',
    mix: { bureau: 1 },
    costPerCustomer: 12,
  },
  clearline_premium: {
    id: 'clearline_premium',
    name: 'Clearline Scholar',
    bureau: 'Clearline',
    mix: { bureau: 0.7, cashflow: 0.3 },
    costPerCustomer: 19.5,
  },
  northscore_inclusion: {
    id: 'northscore_inclusion',
    name: 'Northscore Open Voices',
    bureau: 'Northscore',
    mix: { bureau: 0.4, altdata: 0.6 },
    costPerCustomer: 13.5,
  },
  sentinel_fraudguard: {
    id: 'sentinel_fraudguard',
    name: 'Sentinel Guardrails',
    bureau: 'Sentinel Data',
    mix: { bureau: 0.6, fraud: 0.4 },
    costPerCustomer: 17,
  },
  truemark_complete: {
    id: 'truemark_complete',
    name: 'TrueMark Complete',
    bureau: 'TrueMark',
    mix: { bureau: 0.4, cashflow: 0.3, fraud: 0.3 },
    costPerCustomer: 26,
  },
};

export const DEFAULT_MODEL_ID = 'clearline_basic';

/** Data vendor offices by city id (CONTENT §13 "Vendor locations"). TrueMark: every XL city plus Sydney. */
export const BUREAU_CITIES: Record<string, string[]> = {
  Clearline: ['tor', 'nyc', 'lon'],
  Northscore: ['sas', 'cal', 'chi'],
  'Sentinel Data': ['sfo', 'fra', 'sin'],
  TrueMark: ['nyc', 'lon', 'tyo', 'syd'],
};

/** Data vendors with an office in a city. */
export function bureausIn(cityId: string): string[] {
  return Object.entries(BUREAU_CITIES)
    .filter(([, cities]) => cities.includes(cityId))
    .map(([bureau]) => bureau);
}
