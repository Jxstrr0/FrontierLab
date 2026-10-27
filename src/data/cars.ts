// Cars (docs/CONTENT.md §20 "Cars", fictional marques) sold at car dealers,
// and the dealers themselves: one per M/L/XL city (our assumption).
export interface CarSpec {
  id: string;
  name: string;
  price: number;
  /** Classics gain value; everything else loses it (SIMULATION §22). */
  classic?: boolean;
  limited?: boolean;
  blurb: string;
}

const c = (s: CarSpec) => s;

export const CARS: Record<string, CarSpec> = {
  kestrel: c({
    id: 'kestrel',
    name: 'Kestrel Roadster',
    price: 95_000,
    blurb: 'Light, nimble and open to the sky.',
  }),
  lumen: c({
    id: 'lumen',
    name: 'Lumen Apex EV',
    price: 180_000,
    blurb: 'Silent, and quicker than it has any right to be.',
  }),
  ridgeline: c({
    id: 'ridgeline',
    name: 'Ridgeline Spectre',
    price: 240_000,
    blurb: 'A luxury SUV for every season.',
  }),
  montclair: c({
    id: 'montclair',
    name: 'Montclair GT Spider',
    price: 310_000,
    blurb: 'A grand tourer with a folding roof.',
  }),
  arcadia: c({
    id: 'arcadia',
    name: 'Arcadia Veloce V12',
    price: 420_000,
    blurb: 'Twelve cylinders and a hand-stitched cabin.',
  }),
  valkyr: c({
    id: 'valkyr',
    name: 'Valkyr Hypercar',
    price: 3_200_000,
    limited: true,
    blurb: 'One of 99. The waiting list is longer.',
  }),
  castellan: c({
    id: 'castellan',
    name: 'Castellan 1962 Classic',
    price: 2_100_000,
    classic: true,
    blurb: 'Concours-restored; it only appreciates.',
  }),
  tamsin: c({
    id: 'tamsin',
    name: 'Tamsin City Hatch',
    price: 38_000,
    blurb: 'Small, cheap and easy to park. Nobody will be impressed.',
  }),
  halcyon: c({
    id: 'halcyon',
    name: 'Halcyon Estate Hybrid',
    price: 72_000,
    blurb: 'Room for the family, the dog and a rack of servers.',
  }),
  osprey: c({
    id: 'osprey',
    name: 'Osprey Touring Saloon',
    price: 130_000,
    blurb: 'Quiet, comfortable and anonymous, which some founders prefer.',
  }),
  stratus: c({
    id: 'stratus',
    name: 'Stratus Coupe EV',
    price: 215_000,
    blurb: 'Sleek, fast and recharges in the time it takes to drink a coffee.',
  }),
  brennock: c({
    id: 'brennock',
    name: 'Brennock Overland',
    price: 275_000,
    blurb: 'A hand-built off-roader that will never see mud.',
  }),
  vespera: c({
    id: 'vespera',
    name: 'Vespera Strada',
    price: 560_000,
    blurb: 'Mid-engined, carbon-bodied and loud enough to annoy the neighbours.',
  }),
  pellegrin: c({
    id: 'pellegrin',
    name: 'Pellegrin 1955 Barchetta',
    price: 4_800_000,
    classic: true,
    limited: true,
    blurb: 'One of twelve built for a coastal road race. Still wears its number.',
  }),
};

/** Dealer names (one dealer per city that has one). */
export const DEALER_NAMES = [
  'Prestige Motor House',
  'Grand Marque Autos',
  'Silverline Motors',
  'Crown & Chassis',
  'Meridian Motorworks',
  'Ashford Motor Gallery',
  'Harbourfront Motors',
  'Kingsway Prestige Cars',
  'Belvedere Automobiles',
  'Northstar Motor Company',
  'Stonebridge Classics',
  'Lakeside Luxury Motors',
  'The Carriage House',
  'Summit Auto Salon',
  'Regent Street Motors',
  'Pinnacle Performance Cars',
  'Oakwood Motor Exchange',
  'Westgate Marques',
  'Foxhall Motors',
  'Citadel Automotive',
];
