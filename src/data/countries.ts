// Countries and central banks (docs/CONTENT.md §1). Starting values are fictional.
import type { CountryId, Rate } from './types';

export interface CountrySpec {
  id: CountryId;
  name: string;
  centralBank: string;
  startPolicy: Rate;
  neutral: Rate;
  /** Inflation target in percent (2.0 = 2%). */
  inflationTarget: number;
  corpTax: number;
  meetingWeeks: number[];
  peggedTo?: CountryId;
  pegSpread?: Rate;
}

export const COUNTRIES: Record<CountryId, CountrySpec> = {
  CA: {
    id: 'CA',
    name: 'Canada',
    centralBank: 'Bank of Canada',
    startPolicy: 0.0325,
    neutral: 0.0275,
    inflationTarget: 2.0,
    corpTax: 0.26,
    meetingWeeks: [4, 10, 17, 23, 30, 36, 43, 49],
  },
  US: {
    id: 'US',
    name: 'United States',
    centralBank: 'Federal Reserve',
    startPolicy: 0.045,
    neutral: 0.03,
    inflationTarget: 2.0,
    corpTax: 0.25,
    meetingWeeks: [5, 11, 18, 24, 31, 38, 44, 50],
  },
  UK: {
    id: 'UK',
    name: 'United Kingdom',
    centralBank: 'Bank of England',
    startPolicy: 0.0425,
    neutral: 0.03,
    inflationTarget: 2.0,
    corpTax: 0.25,
    meetingWeeks: [6, 12, 19, 25, 32, 37, 45, 51],
  },
  EA: {
    id: 'EA',
    name: 'Eurozone',
    centralBank: 'European Central Bank',
    startPolicy: 0.0275,
    neutral: 0.0225,
    inflationTarget: 2.0,
    corpTax: 0.25,
    meetingWeeks: [4, 9, 16, 23, 29, 37, 43, 50],
  },
  CH: {
    id: 'CH',
    name: 'Switzerland',
    centralBank: 'Swiss National Bank',
    startPolicy: 0.0125,
    neutral: 0.0125,
    inflationTarget: 1.0,
    corpTax: 0.18,
    meetingWeeks: [12, 25, 38, 51],
  },
  JP: {
    id: 'JP',
    name: 'Japan',
    centralBank: 'Bank of Japan',
    startPolicy: 0.0075,
    neutral: 0.01,
    inflationTarget: 2.0,
    corpTax: 0.3,
    meetingWeeks: [3, 11, 17, 25, 30, 38, 43, 51],
  },
  AU: {
    id: 'AU',
    name: 'Australia',
    centralBank: 'Reserve Bank of Australia',
    startPolicy: 0.036,
    neutral: 0.03,
    inflationTarget: 2.5,
    corpTax: 0.3,
    meetingWeeks: [7, 13, 20, 27, 33, 40, 46, 50],
  },
  SG: {
    id: 'SG',
    name: 'Singapore',
    centralBank: 'Monetary Authority of Singapore',
    startPolicy: 0.03,
    neutral: 0.025,
    inflationTarget: 2.0,
    corpTax: 0.17,
    meetingWeeks: [4, 17, 30, 43],
  },
  HK: {
    id: 'HK',
    name: 'Hong Kong',
    centralBank: 'Hong Kong Monetary Authority',
    // Pegged: copies the US rate plus a spread and skips its own rule (SIMULATION §4.4).
    startPolicy: 0.0475,
    neutral: 0.0325,
    inflationTarget: 2.0,
    corpTax: 0.165,
    meetingWeeks: [5, 11, 18, 24, 31, 38, 44, 50],
    peggedTo: 'US',
    pegSpread: 0.0025,
  },
};
