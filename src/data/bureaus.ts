// Underwriting data inputs and credit bureau packages (docs/CONTENT.md §13).
// Radar order: Accuracy, Speed, Inclusion, FraudShield, Fairness.
import type { Pentagon } from './types';

export interface DataInputSpec {
  id: string;
  name: string;
  profile: Pentagon;
  costPerApp: number;
  /** Loans booked needed before the input can be used. */
  minLoansBooked?: number;
}

export const DATA_INPUTS: Record<string, DataInputSpec> = {
  bureau: { id: 'bureau', name: 'Bureau Score', profile: [6, 8, 4, 4, 7], costPerApp: 1.2 },
  cashflow: { id: 'cashflow', name: 'Cash-flow Data', profile: [8, 5, 7, 5, 7], costPerApp: 2.4 },
  altdata: { id: 'altdata', name: 'Alternative Data', profile: [5, 7, 9, 3, 4], costPerApp: 0.9 },
  // Accuracy rises from 4 to 9 with loans booked (SIMULATION §16.7).
  internal: {
    id: 'internal',
    name: 'Internal History',
    profile: [4, 9, 6, 6, 7],
    costPerApp: 0.2,
    minLoansBooked: 5000,
  },
  fraud: { id: 'fraud', name: 'Fraud Signals', profile: [5, 4, 4, 10, 6], costPerApp: 1.1 },
};

export interface BureauPackageSpec {
  id: string;
  name: string;
  bureau: string;
  mix: Record<string, number>;
  costPerApp: number;
}

export const BUREAU_PACKAGES: Record<string, BureauPackageSpec> = {
  clearline_basic: {
    id: 'clearline_basic',
    name: 'Clearline Basic Score',
    bureau: 'Clearline',
    mix: { bureau: 1 },
    costPerApp: 1.2,
  },
  clearline_premium: {
    id: 'clearline_premium',
    name: 'Clearline Premium Score',
    bureau: 'Clearline',
    mix: { bureau: 0.7, cashflow: 0.3 },
    costPerApp: 1.95,
  },
  northscore_inclusion: {
    id: 'northscore_inclusion',
    name: 'Northscore Inclusion+',
    bureau: 'Northscore',
    mix: { bureau: 0.4, altdata: 0.6 },
    costPerApp: 1.35,
  },
  sentinel_fraudguard: {
    id: 'sentinel_fraudguard',
    name: 'Sentinel FraudGuard',
    bureau: 'Sentinel Data',
    mix: { bureau: 0.6, fraud: 0.4 },
    costPerApp: 1.7,
  },
  truemark_complete: {
    id: 'truemark_complete',
    name: 'TrueMark Complete',
    bureau: 'TrueMark',
    mix: { bureau: 0.4, cashflow: 0.3, fraud: 0.3 },
    costPerApp: 2.6,
  },
};

export const DEFAULT_MODEL_ID = 'clearline_basic';

/** Credit bureau offices by city id (CONTENT §13 "Bureau locations"). TrueMark: every XL city plus Sydney. */
export const BUREAU_CITIES: Record<string, string[]> = {
  Clearline: ['tor', 'nyc', 'lon'],
  Northscore: ['sas', 'cal', 'chi'],
  'Sentinel Data': ['sfo', 'fra', 'sin'],
  TrueMark: ['nyc', 'lon', 'tyo', 'syd'],
};

/** Bureaus with an office in a city. */
export function bureausIn(cityId: string): string[] {
  return Object.entries(BUREAU_CITIES)
    .filter(([, cities]) => cities.includes(cityId))
    .map(([bureau]) => bureau);
}
