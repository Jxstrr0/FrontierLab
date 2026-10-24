// Wording for the New Game choices: how a city's numbers read in plain language,
// each city's one-line flavour and what each difficulty means. Nothing here
// labels a city with a difficulty (DESIGN §5.2: the city sets the character).
import type { CitySize } from '../../data/cities';
import type { Difficulty } from '../../data/types';

/** The four cities the player can start in, in display order. */
export const START_CITY_IDS = ['sas', 'cal', 'tor', 'nyc'] as const;

/** Rent index (1.00 = Toronto-like) below which rents read as low, moderate, high. */
const RENT_BANDS = [
  { below: 0.7, word: 'low' },
  { below: 0.95, word: 'moderate' },
  { below: 1.3, word: 'high' },
] as const;
const RENT_TOP_WORD = 'very high';

export function rentWord(rentIndex: number): string {
  return RENT_BANDS.find((b) => rentIndex < b.below)?.word ?? RENT_TOP_WORD;
}

export const SIZE_WORD: Record<CitySize, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'Very large',
};

export const CITY_FLAVOUR: Record<string, string> = {
  sas: 'A quiet prairie market with kind rents, where every customer counts.',
  cal: 'Oil-patch money and a growing downtown, with room to find your feet.',
  tor: 'A deep market where the big banks are always watching every move.',
  nyc: 'The biggest stage there is: huge demand, towering rents, no mercy.',
};

export const DIFFICULTY_BLURB: Record<Difficulty, string> = {
  easy: 'More prospects walk in, rivals are gentler and fewer loans go bad.',
  normal: 'The intended balance. A fair fight.',
  hard: 'Fewer prospects, sharper rivals and a few more defaults.',
  expert: 'Lean demand, rivals at their best and real credit losses.',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  expert: 'Expert',
};

/** "$500K", "$1M", "$1.25M" for the starting cash choices. */
export function cashLabel(amount: number): string {
  return amount >= 1_000_000 ? `$${amount / 1_000_000}M` : `$${amount / 1_000}K`;
}
