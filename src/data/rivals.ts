// Rival banks and strategy profiles (docs/CONTENT.md §15).
import type { CountryId } from './types';

export type Strategy = 'incumbent' | 'disruptor' | 'premium' | 'community';

export interface RivalSpec {
  id: string;
  name: string;
  strategy: Strategy;
  home: CountryId[];
  ink: string;
  ticker?: string;
}

const r = (s: RivalSpec) => s;

export const RIVALS: Record<string, RivalSpec> = {
  harbourline: r({
    id: 'harbourline',
    name: 'Harbourline Bank',
    strategy: 'incumbent',
    home: ['CA'],
    ink: '#1F3A5F',
    ticker: 'HBL',
  }),
  maplecrown: r({
    id: 'maplecrown',
    name: 'Maple Crown Financial',
    strategy: 'incumbent',
    home: ['CA'],
    ink: '#8E2C2C',
    ticker: 'MCF',
  }),
  prairiemutual: r({
    id: 'prairiemutual',
    name: 'Prairie Mutual',
    strategy: 'community',
    home: ['CA'],
    ink: '#B08A3E',
  }),
  nimbus: r({
    id: 'nimbus',
    name: 'Nimbus',
    strategy: 'disruptor',
    home: ['CA', 'US'],
    ink: '#2AA6B8',
  }),
  granville: r({
    id: 'granville',
    name: 'Granville Private',
    strategy: 'premium',
    home: ['CA'],
    ink: '#2B2B2B',
  }),
  libertyridge: r({
    id: 'libertyridge',
    name: 'Liberty Ridge Bank',
    strategy: 'incumbent',
    home: ['US'],
    ink: '#27466E',
    ticker: 'LRB',
  }),
  eastgate: r({
    id: 'eastgate',
    name: 'Eastgate Financial',
    strategy: 'incumbent',
    home: ['US'],
    ink: '#4A6B3A',
    ticker: 'EGF',
  }),
  copperfield: r({
    id: 'copperfield',
    name: 'Copperfield Federal',
    strategy: 'community',
    home: ['US'],
    ink: '#A8643A',
  }),
  fizz: r({ id: 'fizz', name: 'Fizz', strategy: 'disruptor', home: ['US', 'UK'], ink: '#E2557A' }),
  whitmore: r({
    id: 'whitmore',
    name: 'Whitmore Trust',
    strategy: 'premium',
    home: ['US'],
    ink: '#3B3355',
    ticker: 'WMT',
  }),
  kingsbury: r({
    id: 'kingsbury',
    name: 'Kingsbury & Co',
    strategy: 'incumbent',
    home: ['UK'],
    ink: '#2C3E66',
    ticker: 'KBY',
  }),
  thameside: r({
    id: 'thameside',
    name: 'Thameside Building Society',
    strategy: 'community',
    home: ['UK'],
    ink: '#3E7A6E',
  }),
  albion: r({
    id: 'albion',
    name: 'Albion Mutual',
    strategy: 'incumbent',
    home: ['UK'],
    ink: '#6B2D4A',
  }),
  belgrave: r({
    id: 'belgrave',
    name: 'Belgrave Private',
    strategy: 'premium',
    home: ['UK'],
    ink: '#1E1E28',
  }),
  lumiere: r({
    id: 'lumiere',
    name: 'Banque Lumière',
    strategy: 'incumbent',
    home: ['EA'],
    ink: '#7A2E46',
    ticker: 'BLU',
  }),
  rheinmark: r({
    id: 'rheinmark',
    name: 'Rheinmark Bank',
    strategy: 'incumbent',
    home: ['EA'],
    ink: '#34495E',
    ticker: 'RMB',
  }),
  oranjeburg: r({
    id: 'oranjeburg',
    name: 'Oranjeburg Bank',
    strategy: 'incumbent',
    home: ['EA'],
    ink: '#C0652A',
    ticker: 'OBG',
  }),
  volt: r({ id: 'volt', name: 'Volt', strategy: 'disruptor', home: ['EA'], ink: '#5B4BD6' }),
  alpenhaus: r({
    id: 'alpenhaus',
    name: 'Alpenhaus Privatbank',
    strategy: 'premium',
    home: ['CH'],
    ink: '#2F3B45',
    ticker: 'APH',
  }),
  helvetic: r({
    id: 'helvetic',
    name: 'Helvetic Cantonal',
    strategy: 'community',
    home: ['CH'],
    ink: '#B03A3A',
  }),
  sakuragi: r({
    id: 'sakuragi',
    name: 'Sakuragi Trust',
    strategy: 'incumbent',
    home: ['JP'],
    ink: '#A0425A',
    ticker: 'SKT',
  }),
  hoshino: r({
    id: 'hoshino',
    name: 'Hoshino Bank',
    strategy: 'incumbent',
    home: ['JP'],
    ink: '#2E3F78',
    ticker: 'HSB',
  }),
  komorebi: r({
    id: 'komorebi',
    name: 'Komorebi Pay',
    strategy: 'disruptor',
    home: ['JP'],
    ink: '#4E9A5A',
  }),
  southerncross: r({
    id: 'southerncross',
    name: 'Southern Cross Savings',
    strategy: 'incumbent',
    home: ['AU'],
    ink: '#22476B',
    ticker: 'SXS',
  }),
  wattle: r({
    id: 'wattle',
    name: 'Wattle Mutual',
    strategy: 'community',
    home: ['AU'],
    ink: '#C99A2E',
  }),
  tide: r({
    id: 'tide',
    name: 'Tide Money',
    strategy: 'disruptor',
    home: ['AU', 'SG'],
    ink: '#1E9BB0',
  }),
  lionport: r({
    id: 'lionport',
    name: 'Lionport Bank',
    strategy: 'incumbent',
    home: ['SG'],
    ink: '#9C2F2F',
    ticker: 'LPB',
  }),
  jadeharbour: r({
    id: 'jadeharbour',
    name: 'Jade Harbour Bank',
    strategy: 'incumbent',
    home: ['HK'],
    ink: '#2F7A6A',
    ticker: 'JHB',
  }),
  peak: r({
    id: 'peak',
    name: 'Peak Private',
    strategy: 'premium',
    home: ['HK', 'SG'],
    ink: '#3A3A4A',
  }),
  volgastate: r({
    id: 'volgastate',
    name: 'Volga State Bank',
    strategy: 'incumbent',
    home: ['RU'],
    ink: '#7A2430',
    ticker: 'VSB',
  }),
  birchcrest: r({
    id: 'birchcrest',
    name: 'Birchcrest Bank',
    strategy: 'incumbent',
    home: ['RU'],
    ink: '#3A5A40',
    ticker: 'BCB',
  }),
  komet: r({ id: 'komet', name: 'Komet', strategy: 'disruptor', home: ['RU'], ink: '#E0663A' }),
  ambermark: r({
    id: 'ambermark',
    name: 'Ambermark Private',
    strategy: 'premium',
    home: ['RU'],
    ink: '#4A3A5A',
  }),
  nevasavings: r({
    id: 'nevasavings',
    name: 'Neva Savings Union',
    strategy: 'community',
    home: ['RU'],
    ink: '#4A7A9A',
  }),
};

export interface StrategyProfile {
  /** Price offsets from the default rule, as decimals (pp). Fees are a % multiplier. */
  savings: number;
  gic: number;
  loans: number;
  mortgage: number;
  cardApr: number;
  fees: number;
  /** Quality profile: Rates, Products, Service, Branch. */
  quality: [number, number, number, number];
  app: number;
}

export const STRATEGY_PROFILES: Record<Strategy, StrategyProfile> = {
  incumbent: {
    savings: -0.002,
    gic: -0.001,
    loans: 0.002,
    mortgage: 0.001,
    cardApr: 0.01,
    fees: 0.1,
    quality: [2.8, 3.6, 3.2, 3.6],
    app: 3.6,
  },
  disruptor: {
    savings: 0.006,
    gic: 0.0025,
    loans: -0.003,
    mortgage: -0.001,
    cardApr: -0.02,
    fees: -0.6,
    quality: [4.3, 3.4, 3.0, 2.5],
    app: 4.6,
  },
  premium: {
    savings: -0.004,
    gic: -0.0015,
    loans: 0.005,
    mortgage: 0.002,
    cardApr: 0.02,
    fees: 0.4,
    quality: [2.4, 4.0, 4.4, 4.6],
    app: 4.0,
  },
  community: {
    savings: 0.0015,
    gic: 0.001,
    loans: -0.0025,
    mortgage: -0.0015,
    cardApr: -0.015,
    fees: -0.2,
    quality: [3.6, 3.0, 4.0, 3.0],
    app: 2.8,
  },
};

/** Senior seats below the CEO on every rival's team (SIMULATION §18.1). */
export const RIVAL_BENCH_TITLES = ['CFO', 'COO', 'CRO'] as const;

/** How each bench seat reads on the rival's HQ panel. */
export const RIVAL_BENCH_LABEL: Record<string, string> = {
  CFO: 'Chief financial officer',
  COO: 'Chief operating officer',
  CRO: 'Chief risk officer',
};

/** Total rival branches at start by city size (CONTENT §15). Disruptors get 1–2 each. */
export const RIVAL_BRANCHES_BY_SIZE: Record<'S' | 'M' | 'L' | 'XL', [number, number]> = {
  S: [3, 5],
  M: [6, 10],
  L: [10, 16],
  XL: [16, 24],
};
