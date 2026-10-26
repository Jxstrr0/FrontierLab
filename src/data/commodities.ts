// Commodities the Weekly Ledger follows (CONTENT §23.5): oil, gold, wheat,
// coffee and copper. Each has a start price (in home money), a weekly
// volatility, how it leans with the world economy (+1 rises in a boom, −1
// rises in a downturn, like gold) and the reasons the paper gives for a sharp
// week. Prices are flavour: nothing in the simulation reads them.

export interface CommoditySpec {
  id: string;
  name: string;
  /** "a barrel": completes "{price} {unit}". */
  unit: string;
  base: number;
  /** Weekly standard deviation of the log price. */
  vol: number;
  cycle: 1 | -1;
  reasons: { up: string[]; down: string[] };
}

export const COMMODITIES: CommoditySpec[] = [
  {
    id: 'oil',
    name: 'Oil',
    unit: 'a barrel',
    base: 78,
    vol: 0.035,
    cycle: 1,
    reasons: {
      up: ['as producers trim output', 'on a cold snap in the north', 'as factories run flat out'],
      down: ['as tankers queue offshore', 'on a mild winter', 'as producers pump more'],
    },
  },
  {
    id: 'gold',
    name: 'Gold',
    unit: 'an ounce',
    base: 2050,
    vol: 0.018,
    cycle: -1,
    reasons: {
      up: [
        'as nervous investors seek safety',
        'on buying by central banks',
        'as stock markets wobble',
      ],
      down: [
        'as investors chase shares instead',
        'on a strong home currency',
        'as calm returns to markets',
      ],
    },
  },
  {
    id: 'wheat',
    name: 'Wheat',
    unit: 'a bushel',
    base: 6.2,
    vol: 0.03,
    cycle: 1,
    reasons: {
      up: [
        'after a dry spell on the plains',
        'as flooding hits the harvest',
        'on strong export orders',
      ],
      down: ['on forecasts of a bumper harvest', 'as rain arrives in time', 'as stockpiles grow'],
    },
  },
  {
    id: 'coffee',
    name: 'Coffee',
    unit: 'a pound',
    base: 1.85,
    vol: 0.038,
    cycle: 1,
    reasons: {
      up: ['after frost hits the growers', 'as café chains stock up', 'on a shipping bottleneck'],
      down: ['on a record crop', 'as cafés report quieter mornings', 'as warehouses fill up'],
    },
  },
  {
    id: 'copper',
    name: 'Copper',
    unit: 'a pound',
    base: 4.1,
    vol: 0.028,
    cycle: 1,
    reasons: {
      up: [
        'as builders and carmakers order more',
        'after a mine strike',
        'on a wave of new power lines',
      ],
      down: ['as building slows', 'on rising stockpiles', 'as factory orders cool'],
    },
  },
];
