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
    cityId: 'chi',
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
    cityId: 'par',
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
  laurentians: h({
    id: 'laurentians',
    name: 'Laurentian Ski Lodge',
    country: 'CA',
    cityId: 'mtl',
    price: 3_400_000,
    blurb: 'Timber beams, a long drive and a lift at the end of it.',
  }),
  doorcounty: h({
    id: 'doorcounty',
    name: 'Lake Shore Orchard House',
    country: 'US',
    cityId: 'chi',
    price: 5_200_000,
    blurb: 'A clapboard farmhouse among cherry trees on the lake.',
  }),
  bigsur: h({
    id: 'bigsur',
    name: 'Big Sur Cliff House',
    country: 'US',
    cityId: 'sfo',
    price: 24_000_000,
    blurb: 'Glass walls over the Pacific, fog included.',
  }),
  napa: h({
    id: 'napa',
    name: 'Napa Hillside Winery',
    country: 'US',
    cityId: 'sfo',
    price: 31_000_000,
    blurb: 'Forty acres of vines and a cellar that outlasts you.',
  }),
  sanjuan: h({
    id: 'sanjuan',
    name: 'San Juan Island Lodge',
    country: 'US',
    cityId: 'sea',
    price: 8_500_000,
    blurb: 'Cedar and stone, with orcas passing the dock.',
  }),
  cotswolds: h({
    id: 'cotswolds',
    name: 'Cotswold Manor House',
    country: 'UK',
    cityId: 'lon',
    price: 19_000_000,
    blurb: 'Honey-coloured stone, a walled garden and a leaky roof.',
  }),
  cornwall: h({
    id: 'cornwall',
    name: 'Cornish Harbour Cottage',
    country: 'UK',
    cityId: 'lon',
    price: 4_200_000,
    blurb: 'Whitewashed, with a slipway and a view of the boats.',
  }),
  frisian: h({
    id: 'frisian',
    name: 'Frisian Dune House',
    country: 'EA',
    cityId: 'ams',
    price: 7_800_000,
    blurb: 'Thatched roof, bicycles and a long empty beach.',
  }),
  blackforest: h({
    id: 'blackforest',
    name: 'Black Forest Hunting Lodge',
    country: 'EA',
    cityId: 'fra',
    price: 6_900_000,
    blurb: 'Dark timber, deep snow and a sauna in the woods.',
  }),
  sentosa: h({
    id: 'sentosa',
    name: 'Sentosa Cove Bungalow',
    country: 'SG',
    cityId: 'sin',
    price: 26_000_000,
    blurb: 'A waterfront bungalow with a berth for the yacht you do not own yet.',
  }),
  peak: h({
    id: 'peak',
    name: 'Peak Road Residence',
    country: 'HK',
    cityId: 'hkg',
    price: 58_000_000,
    blurb: 'Above the clouds on the busiest days, above the harbour on the rest.',
  }),
  rublyovka: h({
    id: 'rublyovka',
    name: 'Birch Forest Dacha',
    country: 'RU',
    cityId: 'mos',
    price: 12_000_000,
    blurb: 'A grand dacha behind a very tall fence.',
  }),
  karelia: h({
    id: 'karelia',
    name: 'Karelian Lake Retreat',
    country: 'RU',
    cityId: 'spb',
    price: 3_600_000,
    blurb: 'Pine, granite and a lake that freezes solid in January.',
  }),
};

export const homesIn = (cityId: string): HomeSpec[] =>
  Object.values(HOMES).filter((x) => x.cityId === cityId);
