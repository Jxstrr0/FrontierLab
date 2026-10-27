// Data center parts (stage C2c, CONTENT §7.4): the three build slots of a data
// center. The GPU hall sets how many GPUs it holds and how long it takes to
// fit out; power caps how many of them run; cooling sets the PUE, the
// multiplier on the power bill. Prices are in the home price list's base
// units (listPrice applies the country index). Fictional names only.
export type DcSlot = 'hall' | 'power' | 'cooling';

export interface DcPart {
  id: string;
  slot: DcSlot;
  name: string;
  blurb: string;
  cost: number;
  /** GPU hall: GPUs it holds. Power: GPUs it can run. */
  gpus?: number;
  /** GPU hall: weeks to fit out. */
  weeks?: number;
  /** Cooling: power usage effectiveness (1 = no overhead). */
  pue?: number;
}

export const DC_SLOTS: DcSlot[] = ['hall', 'power', 'cooling'];

export const DC_SLOT_NAMES: Record<DcSlot, string> = {
  hall: 'GPU hall',
  power: 'Power',
  cooling: 'Cooling',
};

const parts: DcPart[] = [
  {
    id: 'hall_row',
    slot: 'hall',
    name: 'Row hall',
    blurb: 'A single hall of racks.',
    cost: 4_000_000,
    gpus: 2_000,
    weeks: 8,
  },
  {
    id: 'hall_twin',
    slot: 'hall',
    name: 'Twin hall',
    blurb: 'Two halls on a shared spine.',
    cost: 11_000_000,
    gpus: 6_000,
    weeks: 12,
  },
  {
    id: 'hall_campus',
    slot: 'hall',
    name: 'Campus hall',
    blurb: 'A full campus of halls.',
    cost: 26_000_000,
    gpus: 15_000,
    weeks: 16,
  },
  {
    id: 'hall_hyperscale',
    slot: 'hall',
    name: 'Hyperscale hall',
    blurb: 'Rows of halls the size of an airfield.',
    cost: 140_000_000,
    gpus: 60_000,
    weeks: 26,
  },
  {
    id: 'power_grid',
    slot: 'power',
    name: 'Grid feed',
    blurb: 'A feed from the local grid.',
    cost: 800_000,
    gpus: 3_000,
  },
  {
    id: 'power_substation',
    slot: 'power',
    name: 'Own substation',
    blurb: 'A substation of your own.',
    cost: 2_500_000,
    gpus: 8_000,
  },
  {
    id: 'power_tie',
    slot: 'power',
    name: 'Plant tie-in',
    blurb: 'A direct line to a power plant.',
    cost: 6_000_000,
    gpus: 20_000,
  },
  {
    id: 'power_plant',
    slot: 'power',
    name: 'Own power plant',
    blurb: 'A generating plant built for this site alone.',
    cost: 38_000_000,
    gpus: 80_000,
  },
  {
    id: 'cool_air',
    slot: 'cooling',
    name: 'Air handlers',
    blurb: 'Fans and chillers.',
    cost: 500_000,
    pue: 1.5,
  },
  {
    id: 'cool_liquid',
    slot: 'cooling',
    name: 'Liquid loops',
    blurb: 'Coolant piped to every rack.',
    cost: 2_000_000,
    pue: 1.25,
  },
  {
    id: 'cool_immersion',
    slot: 'cooling',
    name: 'Immersion tanks',
    blurb: 'Racks sunk in cooling fluid.',
    cost: 5_000_000,
    pue: 1.1,
  },
  {
    id: 'cool_twophase',
    slot: 'cooling',
    name: 'Two-phase cooling',
    blurb: 'Coolant that boils off the chips and condenses overhead.',
    cost: 18_000_000,
    pue: 1.04,
  },
];

export const DC_PARTS: Record<string, DcPart> = Object.fromEntries(parts.map((p) => [p.id, p]));

/** The parts for one slot, cheapest first. */
export const dcPartsFor = (slot: DcSlot): DcPart[] => parts.filter((p) => p.slot === slot);

export type DcBuild = Record<DcSlot, string>;

/** The cheapest build: a Row hall on a Grid feed with Air handlers. */
export const DEFAULT_DC_BUILD: DcBuild = {
  hall: 'hall_row',
  power: 'power_grid',
  cooling: 'cool_air',
};
