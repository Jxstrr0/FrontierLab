// The stock market's non-bank listed companies and sector returns
// (docs/CONTENT.md §17). Listed rival banks make up the Banking sector.
// Shares in millions in the table are stored in units here. Beta isn't in the
// content table; it comes from the sector (decision log). Exchanges are
// fictional, one per country.
import type { CountryId } from './types';
import type { Phase } from './types';

export type SectorId = 'banking' | 'technology' | 'energy' | 'auto' | 'retail' | 'realEstate';

export interface StockSpec {
  id: string;
  ticker: string;
  name: string;
  sector: Exclude<SectorId, 'banking'>;
  startPrice: number;
  shares: number;
  eps: number;
  growth: number;
  vol: number;
  divYield: number;
  /** Home exchange's country. */
  country: CountryId;
}

const M = 1_000_000;

export const STOCKS: Record<string, StockSpec> = {
  slvs: {
    id: 'slvs',
    ticker: 'SLVS',
    name: 'Silverline Semiconductors',
    sector: 'technology',
    startPrice: 142,
    shares: 820 * M,
    eps: 5.1,
    growth: 0.14,
    vol: 0.38,
    divYield: 0.004,
    country: 'US',
  },
  brlp: {
    id: 'brlp',
    ticker: 'BRLP',
    name: 'Brightloop Software',
    sector: 'technology',
    startPrice: 88,
    shares: 610 * M,
    eps: 2.4,
    growth: 0.18,
    vol: 0.34,
    divYield: 0,
    country: 'US',
  },
  orbn: {
    id: 'orbn',
    ticker: 'ORBN',
    name: 'Orbitra Networks',
    sector: 'technology',
    startPrice: 41,
    shares: 1100 * M,
    eps: 2.05,
    growth: 0.06,
    vol: 0.24,
    divYield: 0.026,
    country: 'CA',
  },
  cbai: {
    id: 'cbai',
    ticker: 'CBAI',
    name: 'Cobalt AI',
    sector: 'technology',
    startPrice: 230,
    shares: 400 * M,
    eps: 3.1,
    growth: 0.35,
    vol: 0.55,
    divYield: 0,
    country: 'US',
  },
  pxby: {
    id: 'pxby',
    ticker: 'PXBY',
    name: 'Pixelbay',
    sector: 'technology',
    startPrice: 19,
    shares: 900 * M,
    eps: 0.7,
    growth: 0.09,
    vol: 0.4,
    divYield: 0,
    country: 'JP',
  },
  nre: {
    id: 'nre',
    ticker: 'NRE',
    name: 'Northern Ridge Energy',
    sector: 'energy',
    startPrice: 58,
    shares: 1500 * M,
    eps: 5.2,
    growth: 0.02,
    vol: 0.3,
    divYield: 0.048,
    country: 'CA',
  },
  slcr: {
    id: 'slcr',
    ticker: 'SLCR',
    name: 'Solace Renewables',
    sector: 'energy',
    startPrice: 27,
    shares: 700 * M,
    eps: 0.9,
    growth: 0.16,
    vol: 0.42,
    divYield: 0.01,
    country: 'EA',
  },
  tdwp: {
    id: 'tdwp',
    ticker: 'TDWP',
    name: 'Tidewater Petroleum',
    sector: 'energy',
    startPrice: 73,
    shares: 1200 * M,
    eps: 7.4,
    growth: 0.01,
    vol: 0.32,
    divYield: 0.055,
    country: 'UK',
  },
  vntr: {
    id: 'vntr',
    ticker: 'VNTR',
    name: 'Vantor Motors',
    sector: 'auto',
    startPrice: 36,
    shares: 2000 * M,
    eps: 4.1,
    growth: 0.03,
    vol: 0.28,
    divYield: 0.034,
    country: 'US',
  },
  kslr: {
    id: 'kslr',
    ticker: 'KSLR',
    name: 'Kessler Automotive',
    sector: 'auto',
    startPrice: 112,
    shares: 450 * M,
    eps: 9.3,
    growth: 0.05,
    vol: 0.26,
    divYield: 0.029,
    country: 'EA',
  },
  lumn: {
    id: 'lumn',
    ticker: 'LUMN',
    name: 'Lumen Motors',
    sector: 'auto',
    startPrice: 64,
    shares: 900 * M,
    eps: 0.8,
    growth: 0.3,
    vol: 0.6,
    divYield: 0,
    country: 'US',
  },
  dbrk: {
    id: 'dbrk',
    ticker: 'DBRK',
    name: 'Daybreak Coffee Co.',
    sector: 'retail',
    startPrice: 94,
    shares: 1150 * M,
    eps: 3.6,
    growth: 0.08,
    vol: 0.22,
    divYield: 0.024,
    country: 'US',
  },
  hrth: {
    id: 'hrth',
    ticker: 'HRTH',
    name: 'Hearthside Markets',
    sector: 'retail',
    startPrice: 52,
    shares: 800 * M,
    eps: 3.2,
    growth: 0.04,
    vol: 0.18,
    divYield: 0.031,
    country: 'CA',
  },
  trhd: {
    id: 'trhd',
    ticker: 'TRHD',
    name: 'Trailhead Outfitters',
    sector: 'retail',
    startPrice: 33,
    shares: 300 * M,
    eps: 1.7,
    growth: 0.07,
    vol: 0.3,
    divYield: 0.015,
    country: 'CA',
  },
  gsqr: {
    id: 'gsqr',
    ticker: 'GSQR',
    name: 'Granite Square REIT',
    sector: 'realEstate',
    startPrice: 24,
    shares: 900 * M,
    eps: 1.4,
    growth: 0.03,
    vol: 0.2,
    divYield: 0.058,
    country: 'US',
  },
  hbfp: {
    id: 'hbfp',
    ticker: 'HBFP',
    name: 'Harbourfront Properties',
    sector: 'realEstate',
    startPrice: 47,
    shares: 350 * M,
    eps: 2.9,
    growth: 0.04,
    vol: 0.22,
    divYield: 0.041,
    country: 'AU',
  },
};

export const SECTORS: { id: SectorId; label: string }[] = [
  { id: 'banking', label: 'AI labs' },
  { id: 'technology', label: 'Technology' },
  { id: 'energy', label: 'Energy' },
  { id: 'auto', label: 'Auto' },
  { id: 'retail', label: 'Retail' },
  { id: 'realEstate', label: 'Real estate' },
];

/** Sector μ by phase, annual (CONTENT §17). */
export const SECTOR_MU: Record<SectorId, Record<Phase, number>> = {
  technology: { expansion: 0.12, slowdown: 0, recession: -0.22, recovery: 0.25 },
  energy: { expansion: 0.06, slowdown: 0.02, recession: -0.15, recovery: 0.12 },
  auto: { expansion: 0.07, slowdown: -0.03, recession: -0.25, recovery: 0.2 },
  retail: { expansion: 0.06, slowdown: 0.01, recession: -0.1, recovery: 0.1 },
  realEstate: { expansion: 0.05, slowdown: 0, recession: -0.14, recovery: 0.09 },
  banking: { expansion: 0.08, slowdown: -0.02, recession: -0.24, recovery: 0.22 },
};

/** Market beta by sector (assumption: cyclicals above 1, defensives below). */
export const SECTOR_BETA: Record<SectorId, number> = {
  technology: 1.3,
  energy: 0.9,
  auto: 1.2,
  retail: 0.8,
  realEstate: 0.7,
  banking: 1.1,
};

/** The cap-weighted index of every listed company (SIMULATION §19.1). */
export const MARKET_INDEX_NAME = 'Inference Composite';

/** Fictional stock exchanges, one per country. */
export const EXCHANGES: Record<CountryId, string> = {
  CA: 'Maple Exchange',
  US: 'Union Exchange',
  UK: 'Thames Exchange',
  EA: 'Rhine Bourse',
  CH: 'Alpine Exchange',
  JP: 'Sakura Exchange',
  AU: 'Coral Exchange',
  SG: 'Lion City Exchange',
  HK: 'Pearl Exchange',
  RU: 'Neva Exchange',
};
