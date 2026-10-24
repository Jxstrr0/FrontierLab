// Startups (docs/CONTENT.md §18): the 20 seed startups, sector growth and
// margins, and name and description pools for startups generated later
// (SIMULATION §20). All names are original.
import type { Pentagon } from './types';
import type { SectorId } from './stocks';

export type StartupStageId = 'seed' | 'A' | 'B' | 'C' | 'D';

export interface StartupSectorSpec {
  id: string;
  label: string;
  /** Quarterly mean revenue growth μ (CONTENT §18). */
  mu: number;
  /** Net margin a mature company in the sector earns. */
  margin: number;
  /** Post-money ÷ annual revenue when a startup is generated. */
  psMultiple: number;
  /** Listed sector once it IPOs (src/data/stocks.ts). */
  marketSector: SectorId;
  /** One-line descriptions for generated startups. */
  blurbs: string[];
}

const sector = (s: StartupSectorSpec) => s;

export const STARTUP_SECTORS: Record<string, StartupSectorSpec> = {
  fintech: sector({
    id: 'fintech',
    label: 'Fintech',
    mu: 0.08,
    margin: 0.18,
    psMultiple: 12,
    marketSector: 'technology',
    blurbs: [
      'Instant payroll advances for shift workers',
      'Invoice financing that pays suppliers the same day',
      'A savings app that rounds up and invests the change',
    ],
  }),
  energy: sector({
    id: 'energy',
    label: 'Energy',
    mu: 0.06,
    margin: 0.12,
    psMultiple: 8,
    marketSector: 'energy',
    blurbs: [
      'Heat pumps leased to apartment blocks',
      'Community wind farms owned by their neighbours',
      'Geothermal wells for city districts',
    ],
  }),
  energyStorage: sector({
    id: 'energyStorage',
    label: 'Energy storage',
    mu: 0.06,
    margin: 0.12,
    psMultiple: 9,
    marketSector: 'energy',
    blurbs: [
      'Shipping-container batteries for solar farms',
      'Flywheels that steady the grid at peak hours',
    ],
  }),
  space: sector({
    id: 'space',
    label: 'Space',
    mu: 0.07,
    margin: 0.15,
    psMultiple: 15,
    marketSector: 'technology',
    blurbs: ['Weather satellites the size of a shoebox', 'Ground stations rented by the minute'],
  }),
  biotech: sector({
    id: 'biotech',
    label: 'Biotech',
    mu: 0.05,
    margin: 0.2,
    psMultiple: 14,
    marketSector: 'technology',
    blurbs: ['Enzymes that break down plastic packaging', 'Faster blood tests from a single drop'],
  }),
  robotics: sector({
    id: 'robotics',
    label: 'Robotics',
    mu: 0.07,
    margin: 0.14,
    psMultiple: 10,
    marketSector: 'technology',
    blurbs: ['Robot arms that cook in restaurant kitchens', 'Window-cleaning drones for towers'],
  }),
  healthtech: sector({
    id: 'healthtech',
    label: 'Healthtech',
    mu: 0.06,
    margin: 0.15,
    psMultiple: 10,
    marketSector: 'technology',
    blurbs: [
      'Home physio guided by your phone camera',
      'Clinic scheduling that ends waiting rooms',
    ],
  }),
  agtech: sector({
    id: 'agtech',
    label: 'Agtech',
    mu: 0.05,
    margin: 0.1,
    psMultiple: 7,
    marketSector: 'retail',
    blurbs: ['Vertical farms in old warehouses', 'Soil sensors that text the farmer'],
  }),
  agFintech: sector({
    id: 'agFintech',
    label: 'Agtech/Fintech',
    mu: 0.065,
    margin: 0.14,
    psMultiple: 9,
    marketSector: 'technology',
    blurbs: ['Crop insurance priced from satellite photos'],
  }),
  quantum: sector({
    id: 'quantum',
    label: 'Quantum',
    mu: 0.06,
    margin: 0.25,
    psMultiple: 25,
    marketSector: 'technology',
    blurbs: ['Quantum-safe encryption for payment networks'],
  }),
  proptech: sector({
    id: 'proptech',
    label: 'Proptech',
    mu: 0.05,
    margin: 0.1,
    psMultiple: 7,
    marketSector: 'realEstate',
    blurbs: ['Rent-to-own for first homes', 'Smart locks that run short lets by themselves'],
  }),
  consumer: sector({
    id: 'consumer',
    label: 'Consumer',
    mu: 0.06,
    margin: 0.1,
    psMultiple: 6,
    marketSector: 'retail',
    blurbs: ['Refillable cleaning products by post', 'Bikes rented by the month'],
  }),
  materials: sector({
    id: 'materials',
    label: 'Materials',
    mu: 0.05,
    margin: 0.12,
    psMultiple: 8,
    marketSector: 'auto',
    blurbs: ['Concrete that soaks up carbon as it sets', 'Packaging grown from mushrooms'],
  }),
  gaming: sector({
    id: 'gaming',
    label: 'Gaming',
    mu: 0.05,
    margin: 0.18,
    psMultiple: 8,
    marketSector: 'technology',
    blurbs: ['A city-builder played on the bus', 'Puzzle games that teach kids to code'],
  }),
  logistics: sector({
    id: 'logistics',
    label: 'Logistics',
    mu: 0.05,
    margin: 0.08,
    psMultiple: 5,
    marketSector: 'auto',
    blurbs: ['Cargo bikes for last-mile delivery', 'Shared warehouses booked by the shelf'],
  }),
  mobility: sector({
    id: 'mobility',
    label: 'Mobility',
    mu: 0.04,
    margin: 0.06,
    psMultiple: 5,
    marketSector: 'auto',
    blurbs: ['Electric minibuses on demand', 'Car sharing for apartment buildings'],
  }),
  cybersecurity: sector({
    id: 'cybersecurity',
    label: 'Cybersecurity',
    mu: 0.07,
    margin: 0.22,
    psMultiple: 14,
    marketSector: 'technology',
    blurbs: ['Phishing drills for small offices', 'Fraud scoring for online checkouts'],
  }),
};

export interface SeedStartup {
  name: string;
  sector: string;
  founded: number;
  stage: StartupStageId;
  pentagon: Pentagon;
  postMoney: number;
  description: string;
}

/** CONTENT §18 seed list. Pentagon: Management, Product maturity, Market size, Competitiveness, Financial health. */
export const SEED_STARTUPS: SeedStartup[] = [
  {
    name: 'Ledgerly',
    sector: 'fintech',
    founded: 2025,
    stage: 'A',
    pentagon: [6, 5, 7, 6, 4],
    postMoney: 18e6,
    description: "AI bookkeeping that closes a small business's books overnight",
  },
  {
    name: 'Paywave',
    sector: 'fintech',
    founded: 2024,
    stage: 'B',
    pentagon: [7, 6, 7, 5, 5],
    postMoney: 60e6,
    description: 'Tap-to-pay terminals for street vendors and markets',
  },
  {
    name: 'Quillvault',
    sector: 'fintech',
    founded: 2026,
    stage: 'seed',
    pentagon: [5, 3, 5, 6, 3],
    postMoney: 4e6,
    description: 'Digital wills and estate vaults for families',
  },
  {
    name: 'GreenGrid Solar',
    sector: 'energy',
    founded: 2023,
    stage: 'C',
    pentagon: [7, 7, 8, 6, 5],
    postMoney: 240e6,
    description: 'Rooftop solar on subscription, no upfront cost',
  },
  {
    name: 'TideTurbine',
    sector: 'energy',
    founded: 2025,
    stage: 'A',
    pentagon: [6, 4, 6, 7, 3],
    postMoney: 22e6,
    description: 'Micro tidal turbines for coastal towns',
  },
  {
    name: 'Orbital Freight',
    sector: 'space',
    founded: 2022,
    stage: 'C',
    pentagon: [8, 6, 8, 6, 4],
    postMoney: 520e6,
    description: 'Reusable cargo capsules for low orbit',
  },
  {
    name: 'BioHarbor',
    sector: 'biotech',
    founded: 2024,
    stage: 'B',
    pentagon: [6, 5, 7, 6, 4],
    postMoney: 85e6,
    description: 'Lab-grown collagen for medicine and cosmetics',
  },
  {
    name: 'Cartwheel Robotics',
    sector: 'robotics',
    founded: 2023,
    stage: 'B',
    pentagon: [7, 6, 7, 5, 5],
    postMoney: 110e6,
    description: 'Warehouse picking robots that learn new shelves in a day',
  },
  {
    name: 'Nimbus Health',
    sector: 'healthtech',
    founded: 2025,
    stage: 'A',
    pentagon: [6, 5, 6, 5, 4],
    postMoney: 30e6,
    description: 'Walk-in telehealth booths in pharmacies',
  },
  {
    name: 'Fieldnote AI',
    sector: 'agtech',
    founded: 2024,
    stage: 'A',
    pentagon: [6, 5, 6, 6, 4],
    postMoney: 26e6,
    description: 'Drones that spot crop disease before it spreads',
  },
  {
    name: 'QuantaCore',
    sector: 'quantum',
    founded: 2021,
    stage: 'C',
    pentagon: [8, 5, 9, 7, 3],
    postMoney: 900e6,
    description: 'Error-corrected qubits in a fridge-sized machine',
  },
  {
    name: 'Stackhouse',
    sector: 'proptech',
    founded: 2023,
    stage: 'B',
    pentagon: [6, 6, 7, 5, 5],
    postMoney: 95e6,
    description: 'Factory-built apartment modules stacked in weeks',
  },
  {
    name: 'Wavelength Audio',
    sector: 'consumer',
    founded: 2025,
    stage: 'seed',
    pentagon: [5, 4, 5, 5, 4],
    postMoney: 6e6,
    description: 'Earbuds that tune themselves to your hearing',
  },
  {
    name: 'Ferrous Labs',
    sector: 'materials',
    founded: 2022,
    stage: 'B',
    pentagon: [7, 5, 8, 6, 4],
    postMoney: 140e6,
    description: 'Low-carbon steel from hydrogen furnaces',
  },
  {
    name: 'Driftwood Games',
    sector: 'gaming',
    founded: 2025,
    stage: 'seed',
    pentagon: [6, 4, 5, 5, 4],
    postMoney: 5e6,
    description: 'A small studio making cozy co-op games',
  },
  {
    name: 'Coldchain One',
    sector: 'logistics',
    founded: 2024,
    stage: 'A',
    pentagon: [6, 6, 6, 5, 5],
    postMoney: 28e6,
    description: 'Solar-powered cold storage for vaccines and food',
  },
  {
    name: 'MetroGlide',
    sector: 'mobility',
    founded: 2023,
    stage: 'B',
    pentagon: [5, 6, 6, 4, 3],
    postMoney: 70e6,
    description: 'Shared e-scooters with swappable batteries',
  },
  {
    name: 'Polar Batteries',
    sector: 'energyStorage',
    founded: 2022,
    stage: 'C',
    pentagon: [7, 6, 8, 6, 4],
    postMoney: 380e6,
    description: 'Sodium-ion batteries for grid storage',
  },
  {
    name: 'Clarion Security',
    sector: 'cybersecurity',
    founded: 2023,
    stage: 'B',
    pentagon: [7, 7, 7, 6, 6],
    postMoney: 120e6,
    description: 'Identity verification built for banks',
  },
  {
    name: 'Harvest Ledger',
    sector: 'agFintech',
    founded: 2025,
    stage: 'A',
    pentagon: [6, 5, 6, 6, 5],
    postMoney: 20e6,
    description: 'A marketplace that finances farmers against future harvests',
  },
];

/** Round names by the stage a startup is in before the round. */
export const ROUND_NAMES: Record<StartupStageId, string> = {
  seed: 'Series A',
  A: 'Series B',
  B: 'Series C',
  C: 'Series D',
  D: 'Series E',
};
export const STAGE_ORDER: StartupStageId[] = ['seed', 'A', 'B', 'C', 'D'];

/** Post-money range for a newly generated startup by stage. */
export const GENERATED_POST_MONEY: Record<StartupStageId, [number, number]> = {
  seed: [3e6, 8e6],
  A: [15e6, 40e6],
  B: [50e6, 150e6],
  C: [150e6, 500e6],
  D: [400e6, 1200e6],
};

/** Name pools for generated startups: prefix + suffix ("Cobalt Labs"). */
export const STARTUP_NAME_PREFIXES = [
  'Alder',
  'Beacon',
  'Bright',
  'Cinder',
  'Cobalt',
  'Delta',
  'Ember',
  'Fable',
  'Granite',
  'Harbor',
  'Juniper',
  'Kestrel',
  'Lumen',
  'Meadow',
  'North',
  'Otter',
  'Pine',
  'Quartz',
  'Rivet',
  'Slate',
  'Tandem',
  'Umber',
  'Vela',
  'Willow',
  'Yarrow',
  'Zephyr',
];
export const STARTUP_NAME_SUFFIXES = [
  'Labs',
  'Works',
  'AI',
  'Systems',
  'Bio',
  'Grid',
  'Robotics',
  'Health',
  'Pay',
  'Logic',
  'Dynamics',
  'Foundry',
  'Motion',
  'Field',
];
