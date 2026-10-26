// Trophy assets (CONTENT §20 "Trophy assets"): the top tier of personal
// purchases, priced in billions at the start and charged at your home price
// list (SIMULATION §4.6, §22a). Every name is invented. `drift` is the yearly
// change in value on top of the price list; `upkeep` the yearly running cost
// as a share of value. The airline makes every flight free.

export interface TrophySpec {
  id: string;
  name: string;
  /** Short kind label shown on the card. */
  kind: string;
  price: number;
  drift: number;
  upkeep: number;
  blurb: string;
  /** What owning it does beyond its value. */
  perk?: 'freeFlights';
}

const t = (s: TrophySpec) => s;

export const TROPHIES: Record<string, TrophySpec> = {
  painting: t({
    id: 'painting',
    name: '“The Harbour at Dusk”',
    kind: 'Old master painting',
    price: 1_100_000_000,
    drift: 0.03,
    upkeep: 0.002,
    blurb: 'The last great canvas by the reclusive master Aurelio Vance, out of a private vault.',
  }),
  yacht: t({
    id: 'yacht',
    name: 'Seraphine',
    kind: 'Superyacht',
    price: 1_400_000_000,
    drift: -0.06,
    upkeep: 0.08,
    blurb: 'A 140-metre yacht with a helipad, a cinema and a crew of sixty.',
  }),
  island: t({
    id: 'island',
    name: 'Isla Corvina',
    kind: 'Private island',
    price: 2_200_000_000,
    drift: 0.02,
    upkeep: 0.01,
    blurb: 'White sand, a deep-water harbour and a villa for every guest.',
  }),
  vineyard: t({
    id: 'vineyard',
    name: 'Château Belmaret',
    kind: 'Wine estate',
    price: 1_000_000_000,
    drift: 0.025,
    upkeep: 0.02,
    blurb: 'Four hundred hectares of old vines and a cellar going back two centuries.',
  }),
  stadium: t({
    id: 'stadium',
    name: 'Copperfield Arena',
    kind: 'Stadium',
    price: 3_500_000_000,
    drift: 0.01,
    upkeep: 0.03,
    blurb: 'Sixty thousand seats, a retractable roof and your name above the gates.',
  }),
  airline: t({
    id: 'airline',
    name: 'Skylark Airways',
    kind: 'Airline',
    price: 5_500_000_000,
    drift: 0,
    upkeep: 0.04,
    blurb: 'A flag carrier with ninety jets. Every flight you take is on the house.',
    perk: 'freeFlights',
  }),
  tower: t({
    id: 'tower',
    name: 'Lanternspire',
    kind: 'Skyscraper',
    price: 7_000_000_000,
    drift: 0.015,
    upkeep: 0.015,
    blurb: 'The tallest tower on the skyline, with a private floor at the top.',
  }),
  station: t({
    id: 'station',
    name: 'Halcyon Orbital',
    kind: 'Space station module',
    price: 12_000_000_000,
    drift: -0.02,
    upkeep: 0.05,
    blurb: 'A private module on a commercial station, with a seat on every crew flight.',
  }),
};

/** Catalogue order: cheapest first. */
export const TROPHY_ORDER = Object.values(TROPHIES)
  .sort((a, b) => a.price - b.price)
  .map((x) => x.id);
