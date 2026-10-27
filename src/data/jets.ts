// Private jets (docs/CONTENT.md "Jets"): bought with personal cash at an
// airport. A jet flies free to any destination within its range (DESIGN §5.17).
export interface JetSpec {
  id: string;
  name: string;
  price: number;
  /** One-hop range in km; null = global. */
  rangeKm: number | null;
  blurb: string;
}

export const JETS: Record<string, JetSpec> = {
  corvid600: {
    id: 'corvid600',
    name: 'Corvid 600',
    price: 24_000_000,
    rangeKm: 6_000,
    blurb: 'A light business jet for hops across a continent.',
  },
  albatross8000: {
    id: 'albatross8000',
    name: 'Albatross 8000',
    price: 68_000_000,
    rangeKm: null,
    blurb: 'Long-range and lavish: any city on Earth without a stop.',
  },
  kite350: {
    id: 'kite350',
    name: 'Kite 350',
    price: 9_500_000,
    rangeKm: 3_500,
    blurb: 'A very light jet for short hops. Six seats and not much legroom.',
  },
  petrel7500: {
    id: 'petrel7500',
    name: 'Petrel 7500',
    price: 46_000_000,
    rangeKm: 11_000,
    blurb: 'Crosses an ocean in one go, with a bedroom at the back.',
  },
};
