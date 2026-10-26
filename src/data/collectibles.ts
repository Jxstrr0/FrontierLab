// Collectibles and auction houses (docs/CONTENT.md §20 "Collectibles", §16
// "Auction houses"). Estimates are the house's pre-sale figure; authenticity is
// hidden until appraised (SIMULATION §22).
export interface CollectibleSpec {
  id: string;
  name: string;
  estimate: number;
  /** One line for the lot's Details sheet. */
  blurb: string;
  category:
    'sports' | 'art' | 'coins' | 'sculpture' | 'watches' | 'memorabilia' | 'books' | 'antiques';
}

const k = (s: CollectibleSpec) => s;

export const COLLECTIBLES: Record<string, CollectibleSpec> = {
  gameball: k({
    id: 'gameball',
    name: '1987 Championship Game Ball, signed',
    estimate: 450_000,
    blurb: 'The ball from the final whistle of a famous title game, signed by the whole roster.',
    category: 'sports',
  }),
  merchant: k({
    id: 'merchant',
    name: 'Portrait of a Merchant Banker, oil, 1890s',
    estimate: 3_800_000,
    blurb:
      'A sombre oil of a top-hatted financier at his ledger, attributed to a fashionable portraitist.',
    category: 'art',
  }),
  sovereign: k({
    id: 'sovereign',
    name: 'First-Strike Gold Sovereign, 1817',
    estimate: 1_200_000,
    blurb:
      'One of a handful of first-day strikes, with the crisp edge of a coin that never circulated.',
    category: 'coins',
  }),
  liberty: k({
    id: 'liberty',
    name: 'Bronze "Liberty in Flight", deco sculpture',
    estimate: 2_600_000,
    blurb:
      'A winged figure in patinated bronze on a stepped marble base, cast in the high deco years.',
    category: 'sculpture',
  }),
  chronograph: k({
    id: 'chronograph',
    name: '1950s Racing Chronograph',
    estimate: 1_600_000,
    blurb: 'A steel racing chronograph with a tachymeter bezel and its original strap.',
    category: 'watches',
  }),
  lunar: k({
    id: 'lunar',
    name: 'Annotated Lunar Flight Plan',
    estimate: 2_200_000,
    blurb: 'A crew copy of a flight plan, its margins filled with pencilled notes from orbit.',
    category: 'memorabilia',
  }),
  plate: k({
    id: 'plate',
    name: 'Original Banknote Engraving Plate, 1923',
    estimate: 950_000,
    blurb:
      'The steel intaglio plate for a 1923 high-denomination note, cancelled with a single line.',
    category: 'memorabilia',
  }),
  morrow: k({
    id: 'morrow',
    name: 'Rookie card of "Jack Morrow", mint',
    estimate: 5_200_000,
    blurb:
      "The rookie card of the league's most celebrated centre, graded mint by a leading service.",
    category: 'sports',
  }),
  jadeseal: k({
    id: 'jadeseal',
    name: 'Imperial Jade Seal, 19th c.',
    estimate: 1_900_000,
    blurb: 'A carved jade seal with a crouching lion knop, from a court workshop.',
    category: 'antiques',
  }),
  firsted: k({
    id: 'firsted',
    name: 'Signed First Edition of a classic detective novel',
    estimate: 380_000,
    blurb: 'A first printing in its original jacket, inscribed by the author to a friend.',
    category: 'books',
  }),
  mantel: k({
    id: 'mantel',
    name: 'Deco Mantel Clock by "Atelier Vautrin"',
    estimate: 640_000,
    blurb:
      'Black marble and gilt bronze, with a sunburst dial and a movement that still keeps time.',
    category: 'antiques',
  }),
  helmet: k({
    id: 'helmet',
    name: 'Prototype Racing Helmet, 1970s',
    estimate: 520_000,
    blurb: 'A prototype shell worn in testing, scuffed and stickered, with its visor intact.',
    category: 'sports',
  }),
};

export interface AuctionHouseSpec {
  id: string;
  name: string;
  cities: string[];
  /** Chance a lot is counterfeit (hidden until appraised). */
  fakeOdds: number;
}

export const AUCTION_HOUSES: Record<string, AuctionHouseSpec> = {
  marlowe: { id: 'marlowe', name: 'Marlowe & Finch', cities: ['lon', 'nyc'], fakeOdds: 0.04 },
  harrowgate: {
    id: 'harrowgate',
    name: 'Harrowgate Auctions',
    cities: ['tor', 'chi'],
    fakeOdds: 0.08,
  },
  kanazawa: { id: 'kanazawa', name: 'Kanazawa Auctions', cities: ['tyo', 'hkg'], fakeOdds: 0.06 },
  sokolov: { id: 'sokolov', name: 'Sokolov & Lind', cities: ['mos', 'spb'], fakeOdds: 0.09 },
};

export const auctionHouseIn = (cityId: string): AuctionHouseSpec | undefined =>
  Object.values(AUCTION_HOUSES).find((a) => a.cities.includes(cityId));
