// Conventions calendar (docs/CONTENT.md §19): one event per host city each
// year, announced in the Ledger four weeks before and open for four weeks
// (CONVENTIONS in balance.ts). Calgary's Foothills Founders Fair is our
// addition so every starting city has one before travel arrives (Stage 8).

export interface ConventionSpec {
  id: string;
  name: string;
  cityId: string;
  /** Week of the year it opens (1–52). */
  week: number;
  /** The convention centre's name on the map. */
  venue: string;
}

export const CONVENTIONS_CALENDAR: ConventionSpec[] = [
  {
    id: 'alpineWealth',
    name: 'Alpine Wealth Forum',
    cityId: 'zur',
    week: 3,
    venue: 'Seefeld Congress Hall',
  },
  {
    id: 'fintechForward',
    name: 'Fintech Forward',
    cityId: 'tor',
    week: 15,
    venue: 'Lakeshore Convention Centre',
  },
  {
    id: 'bigAppleVenture',
    name: 'Big Apple Venture Days',
    cityId: 'nyc',
    week: 19,
    venue: 'Hudson Exhibition Hall',
  },
  {
    id: 'ledgerSummit',
    name: 'Ledger Summit',
    cityId: 'lon',
    week: 24,
    venue: 'Thameside Conference Centre',
  },
  {
    id: 'foothillsFounders',
    name: 'Foothills Founders Fair',
    cityId: 'cal',
    week: 28,
    venue: 'Bow Valley Exhibition Hall',
  },
  {
    id: 'prairieInnovation',
    name: 'Prairie Innovation Expo',
    cityId: 'sas',
    week: 33,
    venue: 'Riverbend Convention Centre',
  },
  {
    id: 'bayCapital',
    name: 'Bay Capital Week',
    cityId: 'sfo',
    week: 38,
    venue: 'Bayview Pavilion',
  },
  {
    id: 'harbourTech',
    name: 'Harbour Tech',
    cityId: 'syd',
    week: 41,
    venue: 'Harbourside Exhibition Centre',
  },
  {
    id: 'asiaMoney',
    name: 'Asia Money Forum',
    cityId: 'sin',
    week: 45,
    venue: 'Marina Garden Expo',
  },
];

/** Default venue name for an L or XL city without an event of its own. */
export const DEFAULT_VENUE = (city: string) => `${city} Convention Centre`;

export const conventionIn = (cityId: string): ConventionSpec | undefined =>
  CONVENTIONS_CALENDAR.find((c) => c.cityId === cityId);
