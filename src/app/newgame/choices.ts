// Wording for the New Game choices: how a city's numbers read in plain language,
// each city's one-line flavour (how an AI lab would see it: talent, power, rents, rivals) and what each difficulty means. Nothing here
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
  sas: 'A small prairie tech town with the cheapest rents on the map. Few rival labs, so a lean team gets noticed.',
  cal: 'Oil-patch money turning to data centers, with cheap power, modest rents and room to find your feet.',
  van: 'Harbour-view offices and a deep bench of ML graduates, but pricey corners and picky customers.',
  tor: 'A research hub with famous labs of its own: deep talent, and rivals watching every launch.',
  mtl: 'A bilingual research city with loyal neighbourhoods, a strong academic pipeline and moderate rents.',
  nyc: 'The biggest stage there is: every enterprise customer in reach, rivals on every block, towering rents.',
  chi: 'A broad, steady market of insurers, retailers and manufacturers that buy on merit.',
  sfo: 'The heart of the AI scene: top talent and eager customers, at the highest rents and wages.',
  sea: 'A cloud-computing port town where new labs are still finding their footing and customers pay well.',
  lon: 'An old finance capital with every big enterprise in reach, and a rival lab on every corner.',
  par: 'Elegant boulevards and a proud research tradition: customers value a trusted name and careful safety.',
  fra: 'Europe’s enterprise hub: orderly, competitive and fair, with big banks and carmakers as customers.',
  ams: 'Canals, cyclists and fast fibre, with a market that rewards good service.',
  zur: 'Rich clients and the highest wages on the map: a small market with big contracts for careful labs.',
  tyo: 'A vast market of patient enterprise buyers and robotics know-how, where margins run thin.',
  syd: 'Sun, surf and a lively startup scene that keeps the Deal Desk busy.',
  sin: 'A tidy trading hub with high rents, higher standards and a government keen on AI.',
  hkg: 'Dense, fast and expensive: a harbour city where enterprise customers want results yesterday.',
  mos: 'A vast, crowded capital: packed streets, cheap talent and big domestic labs.',
  spb: 'Canals, palaces and a proud maths tradition in the north’s grand old port, where talent comes cheap.',
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
