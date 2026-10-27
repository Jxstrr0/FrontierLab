// Wholesale funding types for the Treasury funding market (docs/CONTENT.md §12).
// Overnight and the central bank window are automatic; the market offers Term
// Interbank. Covered bonds (which needed mortgage cover) were removed in C3c.
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
