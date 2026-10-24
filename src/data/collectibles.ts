// Collectibles and auction houses (docs/CONTENT.md §20 "Collectibles", §16
// "Auction houses"). Estimates are the house's pre-sale figure; authenticity is
// hidden until appraised (SIMULATION §22).
export interface CollectibleSpec {
  id: string;
  name: string;
  estimate: number;
  category:
    'sports' | 'art' | 'coins' | 'sculpture' | 'watches' | 'memorabilia' | 'books' | 'antiques';
}

const k = (s: CollectibleSpec) => s;

export const COLLECTIBLES: Record<string, CollectibleSpec> = {
  gameball: k({
    id: 'gameball',
    name: '1987 Championship Game Ball, signed',
    estimate: 450_000,
    category: 'sports',
  }),
  merchant: k({
    id: 'merchant',
    name: 'Portrait of a Merchant Banker, oil, 1890s',
    estimate: 3_800_000,
    category: 'art',
  }),
  sovereign: k({
    id: 'sovereign',
    name: 'First-Strike Gold Sovereign, 1817',
    estimate: 1_200_000,
    category: 'coins',
  }),
  liberty: k({
    id: 'liberty',
    name: 'Bronze "Liberty in Flight", deco sculpture',
    estimate: 2_600_000,
    category: 'sculpture',
  }),
  chronograph: k({
    id: 'chronograph',
    name: '1950s Racing Chronograph',
    estimate: 1_600_000,
    category: 'watches',
  }),
  lunar: k({
    id: 'lunar',
    name: 'Annotated Lunar Flight Plan',
    estimate: 2_200_000,
    category: 'memorabilia',
  }),
  plate: k({
    id: 'plate',
    name: 'Original Banknote Engraving Plate, 1923',
    estimate: 950_000,
    category: 'memorabilia',
  }),
  morrow: k({
    id: 'morrow',
    name: 'Rookie card of "Jack Morrow", mint',
    estimate: 5_200_000,
    category: 'sports',
  }),
  jadeseal: k({
    id: 'jadeseal',
    name: 'Imperial Jade Seal, 19th c.',
    estimate: 1_900_000,
    category: 'antiques',
  }),
  firsted: k({
    id: 'firsted',
    name: 'Signed First Edition of a classic detective novel',
    estimate: 380_000,
    category: 'books',
  }),
  mantel: k({
    id: 'mantel',
    name: 'Deco Mantel Clock by "Atelier Vautrin"',
    estimate: 640_000,
    category: 'antiques',
  }),
  helmet: k({
    id: 'helmet',
    name: 'Prototype Racing Helmet, 1970s',
    estimate: 520_000,
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
};

export const auctionHouseIn = (cityId: string): AuctionHouseSpec | undefined =>
  Object.values(AUCTION_HOUSES).find((a) => a.cities.includes(cityId));
