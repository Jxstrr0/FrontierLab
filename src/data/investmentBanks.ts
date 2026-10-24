// Investment banks (docs/CONTENT.md §16): the advisers you deal with to raise
// capital, list your bank, trade and buy rivals. You never own one. Fee is the
// underwriting fee; the IPO pop range is the first-day rise their book-building
// delivers (SIMULATION §19.4). Cities CONTENT doesn't list borrow the nearest
// house in their country or region (decision log), so every city has one.

export interface InvestmentBankSpec {
  id: string;
  name: string;
  /** City ids with an office of this bank. */
  cities: string[];
  /** Underwriting fee as a decimal (0.0455 = 4.55%). */
  fee: number;
  /** First-day IPO pop range as decimals. */
  pop: [number, number];
}

export const INVESTMENT_BANKS: Record<string, InvestmentBankSpec> = {
  ashgrove: {
    id: 'ashgrove',
    name: 'Ashgrove Capital',
    cities: ['tor', 'cal', 'sas', 'mtl'],
    fee: 0.0455,
    pop: [0, 0.1],
  },
  whitlock: {
    id: 'whitlock',
    name: 'Whitlock & Rowe',
    cities: ['nyc', 'chi', 'sea'],
    fee: 0.0525,
    pop: [0.05, 0.2],
  },
  meridian: {
    id: 'meridian',
    name: 'Meridian Partners',
    cities: ['lon', 'par', 'fra', 'ams'],
    fee: 0.048,
    pop: [0, 0.15],
  },
  hollis: {
    id: 'hollis',
    name: 'Hollis Crane & Co.',
    cities: ['zur', 'sfo'],
    fee: 0.06,
    pop: [0.1, 0.25],
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Bridge Securities',
    cities: ['tyo', 'sin', 'hkg'],
    fee: 0.044,
    pop: [0, 0.1],
  },
  southerngate: {
    id: 'southerngate',
    name: 'Southern Gate Advisory',
    cities: ['syd', 'van'],
    fee: 0.047,
    pop: [0, 0.12],
  },
};

/** Investment banks with an office in a city. */
export function investmentBanksIn(cityId: string): string[] {
  return Object.values(INVESTMENT_BANKS)
    .filter((b) => b.cities.includes(cityId))
    .map((b) => b.id);
}
