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
  pennant: k({
    id: 'pennant',
    name: '1931 Pennant-Winning Bat, cracked',
    estimate: 310_000,
    blurb:
      'The bat that won a pennant, split along the grain and taped back together by the batboy.',
    category: 'sports',
  }),
  skates: k({
    id: 'skates',
    name: 'Olympic Gold Skates, 1964',
    estimate: 420_000,
    blurb:
      'A pair of worn leather speed skates said to have crossed the line first in the 1964 final.',
    category: 'sports',
  }),
  jersey: k({
    id: 'jersey',
    name: 'Game-Worn Jersey of "Lena Forsberg"',
    estimate: 690_000,
    blurb: 'The sweater worn through a record-breaking season, grass stains and all.',
    category: 'sports',
  }),
  harbour: k({
    id: 'harbour',
    name: '"Harbour at Dusk", oil, 1920s',
    estimate: 2_100_000,
    blurb: 'A luminous dockside scene by a painter of the Northern school, in its original frame.',
    category: 'art',
  }),
  abstract: k({
    id: 'abstract',
    name: 'Untitled abstract, acrylic, 1961',
    estimate: 4_400_000,
    blurb: 'Three bars of colour on a white field, from the studio of a celebrated minimalist.',
    category: 'art',
  }),
  portraitgirl: k({
    id: 'portraitgirl',
    name: 'Portrait of a Girl with a Lantern, 1780s',
    estimate: 2_900_000,
    blurb: 'Candlelit and quietly painted, attributed to a fashionable court portraitist.',
    category: 'art',
  }),
  woodblock: k({
    id: 'woodblock',
    name: 'Woodblock Print of a Snowy Bridge, 1830s',
    estimate: 720_000,
    blurb: 'An early impression of a famous winter view, its colours barely faded.',
    category: 'art',
  }),
  doubleeagle: k({
    id: 'doubleeagle',
    name: 'Pattern Double Eagle, 1879',
    estimate: 2_800_000,
    blurb: 'A trial strike for a gold coin that never entered production, one of perhaps nine.',
    category: 'coins',
  }),
  tetradrachm: k({
    id: 'tetradrachm',
    name: 'Silver Tetradrachm, 4th c. BC',
    estimate: 240_000,
    blurb: 'An owl on the reverse, a helmeted goddess on the obverse, and a very good strike.',
    category: 'coins',
  }),
  guinea: k({
    id: 'guinea',
    name: 'Proof Five-Guinea Piece, 1703',
    estimate: 1_050_000,
    blurb:
      "Struck from gold taken in a famous naval action, with the fleet's name beneath the bust.",
    category: 'coins',
  }),
  dancer: k({
    id: 'dancer',
    name: 'Bronze "Dancer with Veil", 1920s',
    estimate: 1_700_000,
    blurb: 'A gilt and patinated bronze dancer on an onyx plinth, cast in Paris.',
    category: 'sculpture',
  }),
  horse: k({
    id: 'horse',
    name: 'Marble Horse Fragment, Roman',
    estimate: 3_300_000,
    blurb: 'The head and neck of a marble horse, once part of a chariot group.',
    category: 'sculpture',
  }),
  mobile: k({
    id: 'mobile',
    name: 'Painted Steel Mobile, 1958',
    estimate: 2_200_000,
    blurb: 'Seven painted plates on wire, turning slowly in the slightest draught.',
    category: 'sculpture',
  }),
  perpetual: k({
    id: 'perpetual',
    name: 'Perpetual Calendar Wristwatch, 1941',
    estimate: 2_400_000,
    blurb: 'A steel perpetual calendar with moon phase, one of fewer than ten known.',
    category: 'watches',
  }),
  pocketwatch: k({
    id: 'pocketwatch',
    name: 'Minute-Repeating Pocket Watch, 1890s',
    estimate: 880_000,
    blurb: 'Gold hunter case, minute repeater, and a chime that still rings clear.',
    category: 'watches',
  }),
  diver: k({
    id: 'diver',
    name: 'Military Dive Watch, 1950s',
    estimate: 460_000,
    blurb: 'Issued to a navy diving unit, its bezel ghosted grey and its service number intact.',
    category: 'watches',
  }),
  keyboard: k({
    id: 'keyboard',
    name: 'Prototype Keyboard from the First Chatbot Lab, 1966',
    estimate: 290_000,
    blurb:
      'A battered terminal keyboard said to have typed the first transcripts of a famous conversation program.',
    category: 'memorabilia',
  }),
  ticket: k({
    id: 'ticket',
    name: 'Ticket Stub from the First Transatlantic Flight',
    estimate: 350_000,
    blurb:
      'A passenger stub from the inaugural scheduled crossing, creased and signed by the captain.',
    category: 'memorabilia',
  }),
  telegram: k({
    id: 'telegram',
    name: 'Telegram Announcing a Famous Armistice',
    estimate: 410_000,
    blurb: 'The original telegraph form, pencilled by the operator who received the news.',
    category: 'memorabilia',
  }),
  spacesuit: k({
    id: 'spacesuit',
    name: 'Training Glove from a Lunar Programme',
    estimate: 1_400_000,
    blurb: 'A pressure glove used in training, its fingertips worn silver from the simulator.',
    category: 'memorabilia',
  }),
  atlas: k({
    id: 'atlas',
    name: 'Hand-Coloured World Atlas, 1620s',
    estimate: 1_900_000,
    blurb: 'Sea monsters, compass roses and a continent drawn mostly from hope.',
    category: 'books',
  }),
  poems: k({
    id: 'poems',
    name: 'Manuscript Notebook of a Romantic Poet',
    estimate: 2_700_000,
    blurb: 'Forty pages of drafts with crossings-out that are more famous than the finished verse.',
    category: 'books',
  }),
  folio: k({
    id: 'folio',
    name: 'Early Printed Folio of Collected Plays',
    estimate: 5_600_000,
    blurb: 'A complete folio with a few pages supplied from another copy, as most are.',
    category: 'books',
  }),
  comic: k({
    id: 'comic',
    name: 'First Issue of "Captain Meridian", 1939',
    estimate: 1_100_000,
    blurb: 'The debut of a caped hero, graded fine, with the newsstand crease still visible.',
    category: 'books',
  }),
  globe: k({
    id: 'globe',
    name: 'Library Globe on a Mahogany Stand, 1790s',
    estimate: 760_000,
    blurb: 'A terrestrial globe showing a coastline nobody had finished mapping.',
    category: 'antiques',
  }),
  cabinet: k({
    id: 'cabinet',
    name: 'Lacquer Cabinet with Gilt Mounts, 1700s',
    estimate: 1_300_000,
    blurb: 'A black and gold lacquer cabinet on a carved stand, with every drawer still locking.',
    category: 'antiques',
  }),
  tapestry: k({
    id: 'tapestry',
    name: 'Hunting Tapestry, 16th c.',
    estimate: 2_050_000,
    blurb: 'Hounds, horsemen and a forest of millefleurs, a little faded on the left.',
    category: 'antiques',
  }),
  chandelier: k({
    id: 'chandelier',
    name: 'Crystal Chandelier from a Grand Hotel',
    estimate: 590_000,
    blurb: 'Three hundred drops of cut crystal that lit a ballroom for ninety years.',
    category: 'antiques',
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
