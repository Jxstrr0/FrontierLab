// Vacation homes (docs/CONTENT.md §20 "Homes"): personal purchases, not
// rentals. Each stands on the map of a city in its region; its value tracks
// that country's house prices (SIMULATION §22). Saskatoon's and Calgary's are
// our additions so every start city has one.
import type { CountryId } from './types';

export interface HomeSpec {
  id: string;
  name: string;
  country: CountryId;
  /** The city whose map shows it. */
  cityId: string;
  price: number;
  blurb: string;
}

const h = (s: HomeSpec) => s;

export const HOMES: Record<string, HomeSpec> = {
  waskesiu: h({
    id: 'waskesiu',
    name: 'Lake Waskesiu Cabin',
    country: 'CA',
    cityId: 'sas',
    price: 1_600_000,
    blurb: 'A log cabin on a quiet northern lake.',
  }),
  bowvalley: h({
    id: 'bowvalley',
    name: 'Bow Valley Ranch',
    country: 'CA',
    cityId: 'cal',
    price: 3_900_000,
    blurb: 'Foothills acreage with a view of the peaks.',
  }),
  muskoka: h({
    id: 'muskoka',
    name: 'Muskoka Lake House',
    country: 'CA',
    cityId: 'tor',
    price: 4_800_000,
    blurb: 'Boathouse, dock and a granite shoreline.',
  }),
  whistler: h({
    id: 'whistler',
    name: 'Whistler Ski Chalet',
    country: 'CA',
    cityId: 'van',
    price: 6_500_000,
    blurb: 'Ski-in, ski-out, with a stone fireplace.',
  }),
  okanagan: h({
    id: 'okanagan',
    name: 'Okanagan Vineyard Estate',
    country: 'CA',
    cityId: 'van',
    price: 9_200_000,
    blurb: 'Twelve acres of vines above the lake.',
  }),
  hamptons: h({
    id: 'hamptons',
    name: 'Hamptons Beach Estate',
    country: 'US',
    cityId: 'nyc',
    price: 28_000_000,
    blurb: 'Shingle-style, on the dunes.',
  }),
  aspen: h({
    id: 'aspen',
    name: 'Aspen Ridge Retreat',
    country: 'US',
    cityId: 'sea',
    price: 14_000_000,
    blurb: 'Timber and glass on a mountain ridge.',
  }),
  cotedazur: h({
    id: 'cotedazur',
    name: "Côte d'Azur Villa",
    country: 'EA',
    cityId: 'par',
    price: 35_000_000,
    blurb: 'Terraced gardens over the sea.',
  }),
  como: h({
    id: 'como',
    name: 'Lake Como Villa',
    country: 'EA',
    cityId: 'fra',
    price: 22_000_000,
    blurb: 'A lakeside villa with its own landing.',
  }),
  alpine: h({
    id: 'alpine',
    name: 'Swiss Alpine Chalet',
    country: 'CH',
    cityId: 'zur',
    price: 18_000_000,
    blurb: 'Carved balconies and a glacier view.',
  }),
  kyoto: h({
    id: 'kyoto',
    name: 'Kyoto Garden House',
    country: 'JP',
    cityId: 'tyo',
    price: 6_000_000,
    blurb: 'A moss garden and a tea room.',
  }),
  byron: h({
    id: 'byron',
    name: 'Byron Bay Clifftop',
    country: 'AU',
    cityId: 'syd',
    price: 9_000_000,
    blurb: 'Whale-watching from the deck.',
  }),
};

export const homesIn = (cityId: string): HomeSpec[] =>
  Object.values(HOMES).filter((x) => x.cityId === cityId);
