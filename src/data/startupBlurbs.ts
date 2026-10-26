// Description templates for generated startups (CONTENT §18): each sector has
// offers and the customers they serve, combined as "{offer} for {customer}".
// With six of each, a sector has 36 descriptions before the handwritten ones
// in STARTUP_SECTORS, so a pipeline rarely shows the same line twice.

export interface BlurbParts {
  offers: readonly string[];
  customers: readonly string[];
}

export const STARTUP_BLURBS: Record<string, BlurbParts> = {
  fintech: {
    offers: [
      'Instant pay advances',
      'Same-day invoice financing',
      'A round-up savings app',
      'Shared spending cards',
      'Cheap cross-border transfers',
      'Bookkeeping on autopilot',
    ],
    customers: [
      'shift workers',
      'small suppliers',
      'first-time savers',
      'young families',
      'freelancers',
      'corner shops',
    ],
  },
  energy: {
    offers: [
      'Leased heat pumps',
      'Rooftop solar on subscription',
      'Neighbourhood wind turbines',
      'Smart meters that sell power back',
      'Geothermal heating',
      'Off-grid power kits',
    ],
    customers: [
      'apartment blocks',
      'farm co-ops',
      'school districts',
      'small towns',
      'warehouses',
      'island communities',
    ],
  },
  energyStorage: {
    offers: [
      'Grid batteries',
      'Second-life car batteries',
      'Thermal heat stores',
      'Backup power packs',
      'Flow batteries',
      'Stored power on demand',
    ],
    customers: [
      'utilities',
      'hospitals',
      'data centres',
      'solar farms',
      'remote mines',
      'housing estates',
    ],
  },
  space: {
    offers: [
      'Small satellite launches',
      'Crop imaging from orbit',
      'In-orbit refuelling',
      'Ground-station time',
      'Tracking of orbital debris',
      'Satellite internet',
    ],
    customers: [
      'weather services',
      'farm insurers',
      'shipping lines',
      'research labs',
      'telecom carriers',
      'remote villages',
    ],
  },
  biotech: {
    offers: [
      'Gene tests',
      'Lab-grown tissue',
      'Faster antibody screening',
      'Rare-disease therapies',
      'Cell-based treatments',
      'Microbiome treatments',
    ],
    customers: [
      'children’s hospitals',
      'cancer clinics',
      'drug makers',
      'vets',
      'research hospitals',
      'older patients',
    ],
  },
  robotics: {
    offers: [
      'Picking robots',
      'Inspection drones',
      'Robot arms on rent',
      'Self-driving forklifts',
      'Cleaning robots',
      'Harvest robots',
    ],
    customers: [
      'warehouses',
      'bridges and tunnels',
      'small factories',
      'distribution centres',
      'hospitals',
      'orchards',
    ],
  },
  healthtech: {
    offers: [
      'Video doctor visits',
      'Remote heart monitors',
      'Prescription delivery',
      'Shift scheduling software',
      'At-home blood tests',
      'Physio by app',
    ],
    customers: [
      'rural patients',
      'care homes',
      'busy parents',
      'nurses',
      'athletes',
      'people with diabetes',
    ],
  },
  agtech: {
    offers: [
      'Vertical farms',
      'Soil sensors',
      'Drip irrigation controls',
      'Weed-spotting drones',
      'Seed breeding',
      'Greenhouse climate control',
    ],
    customers: [
      'city grocers',
      'grain farmers',
      'vineyards',
      'dairy herds',
      'orchards',
      'market gardens',
    ],
  },
  agFintech: {
    offers: [
      'Crop-backed loans',
      'Weather insurance',
      'Equipment leasing',
      'Harvest-time payments',
      'Land rental marketplaces',
      'Co-op accounting',
    ],
    customers: [
      'smallholders',
      'family farms',
      'cattle ranchers',
      'fruit growers',
      'grain co-ops',
      'young farmers',
    ],
  },
  quantum: {
    offers: [
      'Quantum computing time',
      'Quantum-safe encryption',
      'Quantum sensors',
      'Molecule simulation',
      'Route optimisation',
      'Error-corrected chips',
    ],
    customers: [
      'banks',
      'drug researchers',
      'airlines',
      'chemical makers',
      'logistics firms',
      'universities',
    ],
  },
  proptech: {
    offers: [
      'Rent-to-own homes',
      'Online letting agents',
      'Building energy audits',
      'Shared office passes',
      'Instant home valuations',
      'Repair booking',
    ],
    customers: [
      'first-time buyers',
      'landlords',
      'office towers',
      'remote workers',
      'home sellers',
      'tenants',
    ],
  },
  consumer: {
    offers: [
      'Refillable cleaning products',
      'Meal kits',
      'Secondhand clothing',
      'Plant-based snacks',
      'Pet food by subscription',
      'Repair-friendly furniture',
    ],
    customers: [
      'busy households',
      'students',
      'new parents',
      'dog owners',
      'city flats',
      'gift buyers',
    ],
  },
  materials: {
    offers: [
      'Low-carbon cement',
      'Recycled carbon fibre',
      'Bio-based plastics',
      'Lighter steel alloys',
      'Self-healing coatings',
      'Wood composites',
    ],
    customers: [
      'builders',
      'carmakers',
      'packaging firms',
      'shipyards',
      'bridge builders',
      'furniture makers',
    ],
  },
  gaming: {
    offers: [
      'Cosy farming games',
      'Mobile puzzle games',
      'Tabletop game apps',
      'Esports coaching',
      'Game-making tools',
      'Music rhythm games',
    ],
    customers: [
      'commuters',
      'families',
      'board game clubs',
      'teen players',
      'indie studios',
      'casual players',
    ],
  },
  logistics: {
    offers: [
      'Same-day courier routes',
      'Cold-chain trucking',
      'Parcel lockers',
      'Freight booking software',
      'Cargo bikes',
      'Port scheduling',
    ],
    customers: [
      'online shops',
      'pharmacies',
      'apartment blocks',
      'importers',
      'city restaurants',
      'shipping lines',
    ],
  },
  mobility: {
    offers: [
      'Electric scooter fleets',
      'Car sharing',
      'On-demand minibuses',
      'E-bike subscriptions',
      'Charging networks',
      'Electric delivery vans',
    ],
    customers: [
      'commuters',
      'suburbs',
      'university towns',
      'office parks',
      'apartment garages',
      'grocers',
    ],
  },
  cybersecurity: {
    offers: [
      'Phishing tests',
      'Password-free logins',
      'Breach insurance scoring',
      'Network monitoring',
      'Fraud detection',
      'Secure backups',
    ],
    customers: [
      'small businesses',
      'hospitals',
      'local councils',
      'law firms',
      'online shops',
      'credit unions',
    ],
  },
};
