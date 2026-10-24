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
};

/** Dealer names (one dealer per city that has one). */
export const DEALER_NAMES = [
  'Prestige Motor House',
  'Grand Marque Autos',
  'Silverline Motors',
  'Crown & Chassis',
  'Meridian Motorworks',
  'Ashford Motor Gallery',
];
