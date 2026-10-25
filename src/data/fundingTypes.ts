// Wholesale funding types for the Treasury funding market (docs/CONTENT.md §12).
// Overnight and the central bank window are automatic; the market offers the other two.
// Radar order: Cost, Term, Stability, Flexibility, Discretion (1–10).
import type { Pentagon } from './types';

export interface FundingTypeSpec {
  id: string;
  name: string;
  /** Rate basis: the policy rate or the country's long FTP rate. */
  basis: 'policy' | 'ftpLong';
  spread: number;
  /** Term range in weeks. */
  term: [number, number];
  /** Offer size range before scaling by max(1, deposits / 100M); none for automatic types. */
  size?: [number, number];
  radar: Pentagon;
  /** Weight when generating market offers; 0 = never offered (automatic only). */
  weight: number;
  /** Covered bonds need mortgages ≥ this × covered bonds outstanding (§13.6). */
  mortgageCover?: number;
  /** Can be repaid before maturity (flexibility ≥ 5). */
  earlyRepay: boolean;
}

export const FUNDING_TYPES: Record<string, FundingTypeSpec> = {
  overnight: {
    id: 'overnight',
    name: 'Overnight Interbank',
    basis: 'policy',
    spread: 0.002,
    term: [1, 1],
    radar: [8, 1, 3, 10, 8],
    weight: 0,
    earlyRepay: true,
  },
  // Term Interbank took in Brokered Deposits, and Covered Bond took in Senior
  // Bond (schema 15): two short-to-medium and long-term choices instead of four
  // near-twins. Each keeps the combined offer weight of the pair it replaced.
  term_interbank: {
    id: 'term_interbank',
    name: 'Term Interbank',
    basis: 'policy',
    spread: 0.005,
    term: [26, 104],
    size: [2e6, 50e6],
    radar: [7, 5, 5, 5, 7],
    weight: 8,
    earlyRepay: true,
  },
  covered_bond: {
    id: 'covered_bond',
    name: 'Covered Bond',
    basis: 'ftpLong',
    spread: 0.0085,
    term: [156, 520],
    size: [25e6, 500e6],
    radar: [5, 9, 9, 2, 9],
    weight: 4,
    mortgageCover: 1.25,
    earlyRepay: false,
  },
  cb_window: {
    id: 'cb_window',
    name: 'Central Bank Window',
    basis: 'policy',
    spread: 0.01,
    term: [1, 1],
    radar: [5, 1, 10, 10, 1],
    weight: 0,
    earlyRepay: true,
  },
};

export const COUNTERPARTIES: readonly string[] = [
  'Harbor Clearing Bank',
  'Meridian Treasury',
  'Atlas Money Markets',
  'Pinecrest Capital',
  'Northwind Securities',
  'Bellwether Funding',
  'Granite Bay Trust',
  'Cobalt Street Markets',
  'Ironbridge Capital',
  'Silverpine Partners',
];
