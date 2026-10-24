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
};
