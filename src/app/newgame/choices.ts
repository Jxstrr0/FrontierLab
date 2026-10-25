// Wording for the New Game choices: how a city's numbers read in plain language,
// each city's one-line flavour and what each difficulty means. Nothing here
// labels a city with a difficulty (DESIGN §5.2: the city sets the character).
import { CITIES, START_CITIES, type CitySize } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import type { CountryId, Difficulty } from '../../data/types';
import { toCurrency } from '../format/format';

export type StartRegion = 'ca' | 'us' | 'eu' | 'ap';

/** The city step's region tabs and the countries in each, in display order. */
const REGIONS: { id: StartRegion; label: string; countries: CountryId[] }[] = [
  { id: 'ca', label: 'Canada', countries: ['CA'] },
  { id: 'us', label: 'U.S.', countries: ['US'] },
  { id: 'eu', label: 'Europe', countries: ['UK', 'EA', 'CH', 'RU'] },
  { id: 'ap', label: 'Asia-Pacific', countries: ['JP', 'AU', 'SG', 'HK'] },
];

export const REGION_OPTIONS = REGIONS.map((r) => ({ value: r.id, label: r.label }));

/** Start cities in one region, in CITIES order. */
export function citiesIn(region: StartRegion): string[] {
  const countries = REGIONS.find((r) => r.id === region)?.countries ?? [];
  return START_CITIES.filter((id) => countries.includes(CITIES[id]!.country));
}

/** The region tab a start city sits under. */
export function regionOf(cityId: string): StartRegion {
  const country = CITIES[cityId]?.country;
  return REGIONS.find((r) => country && r.countries.includes(country))?.id ?? 'ca';
}

/** Euro-area cities read as their own country, not "Eurozone". */
const EURO_NATION: Record<string, string> = {
  par: 'France',
  fra: 'Germany',
  ams: 'Netherlands',
};

/** "Canada", "United Kingdom", "France" for a city's card. */
export function nationOf(cityId: string): string {
  const city = CITIES[cityId];
  if (!city) return '';
  return EURO_NATION[cityId] ?? COUNTRIES[city.country].name;
}

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
  van: 'Harbour views, pricey corners and savers who expect a lot.',
  tor: 'A deep market where the big banks are always watching every move.',
  mtl: 'A bilingual city of loyal neighbourhoods and moderate rents.',
  nyc: 'The biggest stage there is: huge demand, towering rents, no mercy.',
  chi: 'Steady trade and broad neighbourhoods in a market that plays fair.',
  sfo: 'Tech money everywhere, but every storefront costs a fortune.',
  sea: 'A fast-growing port where new arrivals are still picking a bank.',
  lon: 'An old money capital with rivals on every corner.',
  par: 'Elegant boulevards and careful savers who value a good name.',
  fra: 'The continent’s banking desk: orderly, competitive and fair.',
  ams: 'Canals, cyclists and a market that rewards good service.',
  zur: 'Rich clients and low rates: deposits come cheap, but loans earn little.',
  tyo: 'A vast market of patient savers where margins run thin.',
  syd: 'Sun, surf and a housing market that keeps the loan desk busy.',
  sin: 'A tidy trading hub with high rents and higher standards.',
  hkg: 'Dense, fast and expensive: a harbour city that never sleeps.',
  mos: 'A vast, crowded capital: packed streets, high rates and big state banks.',
  spb: 'Canals, palaces and thrifty savers in the north’s grand old port.',
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

/** "$600K", "$1.2M", "¥135M" for the starting cash choices, in the chosen currency. */
export function cashLabel(amount: number, sym = '$'): string {
  const v = toCurrency(amount, sym);
  const short = (x: number) => String(Number(x.toFixed(2)));
  if (v >= 1e9) return `${sym}${short(v / 1e9)}B`;
  return v >= 1e6 ? `${sym}${short(v / 1e6)}M` : `${sym}${short(v / 1e3)}K`;
}

/** How the currency choice reads under its control. */
export const CURRENCY_NAME: Record<string, string> = {
  $: 'Dollars',
  C$: 'Canadian dollars',
  '£': 'Pounds',
  '€': 'Euros',
  '¥': 'Yen',
};
