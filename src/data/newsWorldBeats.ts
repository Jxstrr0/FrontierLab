// The Weekly Ledger's World desk and company desk content (CONTENT §23.1–23.2):
// which world story can run where and when (by the country's economy, its
// season and its climate), the number each story quotes, and the reasons the
// paper gives for a listed company's big share move. All invented.
import type { CountryId, Phase } from './types';
import type { SectorId } from './stocks';

/** A condition read from the country's economy (SIMULATION §24.1). */
export type BeatCondition = 'highInflation' | 'lowUnemployment' | 'housingUp' | 'housingDown';

export type WorldBeatIcon =
  'globe' | 'leaf' | 'plane' | 'spark' | 'person' | 'chart' | 'alert' | 'coin';

export interface WorldBeat {
  key: string;
  icon: WorldBeatIcon;
  /** Only in these phases (any when absent). */
  phases?: Phase[];
  /** Only in these months, 1–12 (any when absent). */
  months?: number[];
  /** Months in the southern hemisphere (SOUTHERN), when they differ. */
  monthsSouth?: number[];
  /** Only in these countries (any when absent). */
  countries?: CountryId[];
  when?: BeatCondition;
  /** Range for {n}. */
  n?: [number, number];
  /** Range for {money}, in start-of-game home money. */
  money?: [number, number];
  /** Relative chance among eligible beats (default 1). */
  weight?: number;
}

/** Countries whose seasons run six months off the north's. */
export const SOUTHERN: CountryId[] = ['AU'];

const COLD: CountryId[] = ['CA', 'US', 'UK', 'EA', 'CH', 'JP', 'RU'];
const GOOD: Phase[] = ['expansion', 'recovery'];
const BAD: Phase[] = ['slowdown', 'recession'];

export const WORLD_BEATS: WorldBeat[] = [
  // Weather and nature
  { key: 'WORLD_SNOWSTORM', icon: 'leaf', countries: COLD, months: [12, 1, 2], n: [25, 90] },
  {
    key: 'WORLD_HEATWAVE',
    icon: 'leaf',
    countries: ['CA', 'US', 'UK', 'EA', 'CH', 'JP', 'AU', 'RU'],
    months: [6, 7, 8],
    monthsSouth: [12, 1, 2],
    n: [34, 44],
  },
  {
    key: 'WORLD_TYPHOON',
    icon: 'leaf',
    countries: ['HK', 'JP'],
    months: [7, 8, 9, 10],
    n: [120, 210],
  },
  { key: 'WORLD_MONSOON', icon: 'leaf', countries: ['SG'], months: [11, 12, 1], n: [180, 420] },
  { key: 'WORLD_BUSHFIRE', icon: 'leaf', countries: ['AU'], months: [12, 1, 2], n: [800, 9000] },
  {
    key: 'WORLD_FLOOD',
    icon: 'leaf',
    countries: ['CA', 'US', 'UK', 'EA', 'AU', 'RU'],
    months: [3, 4, 5],
    monthsSouth: [9, 10, 11],
    n: [20, 140],
  },
  {
    key: 'WORLD_HARVEST',
    icon: 'leaf',
    months: [9, 10],
    monthsSouth: [3, 4],
    n: [6, 18],
    countries: ['CA', 'US', 'UK', 'EA', 'AU', 'RU'],
  },
  {
    key: 'WORLD_DROUGHT',
    icon: 'leaf',
    countries: ['CA', 'US', 'EA', 'AU'],
    months: [7, 8],
    monthsSouth: [1, 2],
    n: [22, 48],
  },
  {
    key: 'WORLD_AURORA',
    icon: 'spark',
    countries: ['CA', 'RU'],
    months: [10, 11, 12, 1, 2, 3],
    n: [4, 30],
  },
  { key: 'WORLD_BLOSSOM', icon: 'leaf', countries: ['JP'], months: [3, 4], n: [5, 12], weight: 2 },
  // Science and building
  { key: 'WORLD_TRANSIT', icon: 'spark', phases: GOOD, n: [8, 42] },
  { key: 'WORLD_BRIDGE', icon: 'spark', n: [40, 120] },
  {
    key: 'WORLD_SATELLITE',
    icon: 'spark',
    countries: ['CA', 'US', 'UK', 'EA', 'JP', 'RU'],
    n: [2, 9],
  },
  { key: 'WORLD_MEDICAL', icon: 'spark', n: [30, 70] },
  { key: 'WORLD_POWER', icon: 'spark', n: [55, 92] },
  { key: 'WORLD_DATACENTRE', icon: 'spark', phases: GOOD, n: [120, 600], money: [400e6, 2.5e9] },
  { key: 'WORLD_AIRPORT', icon: 'plane', phases: GOOD, n: [18, 70] },
  // Work and prices
  { key: 'WORLD_STRIKE', icon: 'alert', phases: BAD, n: [2, 9], weight: 2 },
  { key: 'WORLD_LAYOFFS', icon: 'alert', phases: ['recession'], n: [300, 2400], weight: 2 },
  { key: 'WORLD_HIRING', icon: 'chart', phases: ['expansion'], when: 'lowUnemployment', weight: 2 },
  { key: 'WORLD_PRICES', icon: 'chart', when: 'highInflation', weight: 3 },
  { key: 'WORLD_FACTORY', icon: 'chart', phases: GOOD, n: [200, 1800] },
  { key: 'WORLD_TRADE_DEAL', icon: 'globe', n: [40, 900] },
  { key: 'WORLD_SUMMIT', icon: 'globe', n: [12, 40] },
  { key: 'WORLD_TOURISM', icon: 'plane', phases: ['expansion'], n: [12, 88] },
  { key: 'WORLD_GLOOM', icon: 'chart', phases: ['recession'], n: [6, 20], weight: 2 },
  { key: 'WORLD_RENTS', icon: 'chart', when: 'housingUp', n: [6, 14] },
  { key: 'WORLD_BUILDING_SLOWS', icon: 'chart', when: 'housingDown', n: [8, 30] },
  // Everyday life
  { key: 'WORLD_FESTIVAL', icon: 'person', n: [40, 400] },
  { key: 'WORLD_MARATHON', icon: 'person', months: [4, 5, 9, 10, 11], n: [3, 9] },
  { key: 'WORLD_MUSEUM', icon: 'person', n: [12, 160] },
  { key: 'WORLD_LOTTERY', icon: 'coin', money: [8e6, 120e6] },
  { key: 'WORLD_ZOO', icon: 'leaf', n: [20, 50] },
  { key: 'WORLD_GOOD_NEWS', icon: 'person', n: [22, 61] },
  { key: 'WORLD_CHESS', icon: 'person', n: [13, 15] },
];

/** Who won the lottery ("a {city} {job}"). */
export const WORLD_JOBS = [
  'nurse',
  'bus driver',
  'school cook',
  'electrician',
  'retired teacher',
  'florist',
  'postal worker',
  'baker',
  'night-shift cleaner',
  'taxi driver',
];

/** Why a listed company's shares moved ("jumps 8% {reason}"), by sector and direction. */
export const MOVER_REASONS: Record<SectorId, { up: string[]; down: string[] }> = {
  technology: {
    up: [
      'on a blockbuster product launch',
      'after winning a government cloud contract',
      'as orders for its chips surge',
    ],
    down: [
      'after a data breach',
      'as a key product slips to next year',
      'on a patent ruling against it',
    ],
  },
  energy: {
    up: ['as oil prices climb', 'after a big offshore find', 'on a new wind-farm contract'],
    down: ['after a refinery outage', 'as oil prices slip', 'on a costly pipeline delay'],
  },
  auto: {
    up: ['on record electric-car orders', 'after a big fleet deal', 'as a new model sells out'],
    down: ['after a safety recall', 'as a parts shortage halts a plant', 'on weak dealer sales'],
  },
  retail: {
    up: [
      'on strong holiday sales',
      'after a bumper loyalty-scheme launch',
      'as shoppers return to its stores',
    ],
    down: [
      'on a profit warning',
      'as shoppers trade down',
      'after a supplier dispute empties shelves',
    ],
  },
  realEstate: {
    up: [
      'after selling an office tower above book value',
      'as occupancy rises',
      'on a big new tenant',
    ],
    down: ['as a major tenant leaves', 'after writing down its offices', 'as rents soften'],
  },
  banking: {
    up: ['on talk of a takeover', 'after lifting its dividend', 'as lending margins widen'],
    down: [
      'after setting aside more for bad loans',
      'on a regulator’s rebuke',
      'as deposit costs rise',
    ],
  },
};

/** What a company unveils, by sector ("{company} unveils {product}"). */
export const LAUNCH_PRODUCTS: Record<SectorId, string[]> = {
  technology: ['a folding tablet', 'a home robot that does the laundry', 'a faster AI chip'],
  energy: ['a home battery pack', 'a floating solar farm', 'a hydrogen filling station'],
  auto: ['an electric pickup', 'a self-parking city car', 'a family hatchback with a 600 km range'],
  retail: ['a same-hour delivery service', 'a store with no checkouts', 'a budget own-brand range'],
  realEstate: ['a 70-storey tower plan', 'a car-free housing quarter', 'a waterfront market hall'],
  banking: [
    'an app with instant loans',
    'a card made from recycled plastic',
    'a no-fee savings account',
  ],
};
