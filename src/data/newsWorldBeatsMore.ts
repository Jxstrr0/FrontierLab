// More World desk beats (CONTENT §23.1, added 2026-10-26): crime and courts,
// science, travel and food, culture and odd news, plus the invented titles
// they quote ({title}: books, games, shows, species, dishes). Merged into
// WORLD_BEATS by newsWorldBeats.ts; templates in ledgerTemplatesGlobeMore.ts.
import type { WorldBeat } from './newsWorldBeats';

/** Invented names a beat can quote as {title}. */
export const TITLE_POOLS = {
  book: [
    'The Lighthouse Accounts',
    'Salt and Silver',
    'A Winter in Halden',
    'The Cartographer’s Daughter',
    'Nine Bridges',
    'What the River Kept',
  ],
  game: ['Starfall Harbour', 'Kingdom of Gears', 'Moss & Mortar', 'Neon Ferryman', 'Tidewalkers'],
  show: ['The Clockmaker’s Opera', 'Paper Moons', 'A Night at the Arcade', 'The Glass Orchard'],
  species: [
    'a blue-striped tree frog',
    'a glow-in-the-dark mushroom',
    'a pocket-sized gecko',
    'a deep-sea anglerfish',
    'a singing mouse',
  ],
  dish: [
    'smoked maple ramen',
    'saffron dumplings',
    'a seven-course tasting menu',
    'fermented plum tarts',
  ],
  animal: ['a penguin', 'a goat', 'an alpaca', 'a tortoise', 'a peacock'],
  vegetable: ['pumpkin', 'cabbage', 'marrow', 'sunflower', 'radish'],
  record: [
    'the longest pizza',
    'the most people dancing in a square',
    'the biggest snow sculpture',
    'the longest bench',
  ],
} as const;

export type TitlePool = keyof typeof TITLE_POOLS;

export const MORE_BEATS: WorldBeat[] = [
  // Crime and courts
  { key: 'WORLD_HEIST', icon: 'alert', money: [2e6, 40e6] },
  { key: 'WORLD_FORGERY', icon: 'alert', n: [12, 80] },
  { key: 'WORLD_SCAM_ALERT', icon: 'alert', n: [800, 9000] },
  { key: 'WORLD_COURT', icon: 'alert', n: [3, 9] },
  { key: 'WORLD_SMUGGLING', icon: 'alert', money: [1e6, 25e6] },
  // Science
  { key: 'WORLD_SPECIES', icon: 'leaf', pool: 'species' },
  { key: 'WORLD_COMET', icon: 'spark', n: [2, 9] },
  { key: 'WORLD_AI', icon: 'spark', n: [70, 99] },
  { key: 'WORLD_FOSSIL', icon: 'spark', n: [65, 240] },
  { key: 'WORLD_OCEAN', icon: 'spark', n: [4, 11] },
  { key: 'WORLD_TELESCOPE', icon: 'spark', n: [12, 40] },
  // Travel and food
  { key: 'WORLD_RESTAURANT', icon: 'person', pool: 'dish', n: [3, 14] },
  {
    key: 'WORLD_FOOD_FEST',
    icon: 'person',
    months: [6, 7, 8, 9],
    monthsSouth: [12, 1, 2, 3],
    n: [20, 180],
  },
  { key: 'WORLD_LIVEABLE', icon: 'globe', n: [2, 9] },
  { key: 'WORLD_TOWER', icon: 'spark', phases: ['expansion'], n: [62, 110] },
  { key: 'WORLD_ROUTE', icon: 'plane', phases: ['expansion', 'recovery'], n: [9, 17] },
  // Culture
  { key: 'WORLD_BESTSELLER', icon: 'person', pool: 'book', n: [1, 4] },
  { key: 'WORLD_GAME_LAUNCH', icon: 'spark', pool: 'game', n: [2, 12] },
  { key: 'WORLD_THEATRE', icon: 'person', pool: 'show', n: [200, 1500] },
  { key: 'WORLD_STREET_ART', icon: 'person', n: [20, 60] },
  { key: 'WORLD_ORCHESTRA', icon: 'person', n: [60, 140] },
  // Odd news
  {
    key: 'WORLD_BIG_VEG',
    icon: 'leaf',
    pool: 'vegetable',
    months: [8, 9, 10],
    monthsSouth: [2, 3, 4],
    n: [180, 1100],
  },
  { key: 'WORLD_ESCAPEE', icon: 'leaf', pool: 'animal', n: [2, 30] },
  { key: 'WORLD_RECORD_TRY', icon: 'person', pool: 'record', n: [300, 4000] },
  { key: 'WORLD_CENTENARIAN', icon: 'person', n: [100, 109] },
  { key: 'WORLD_PIGEON', icon: 'leaf', n: [300, 1800] },
];
