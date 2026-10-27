// Branch build options (docs/CONTENT.md §7). Exterior and lobby are fit-out
// (10-year depreciation); teller line, vault and ATM are equipment (5 years).

export type BuildSlot = 'exterior' | 'lobby' | 'teller' | 'vault' | 'atm';

export interface EquipmentSpec {
  id: string;
  slot: BuildSlot;
  name: string;
  description: string;
  quality: number;
  cost: number;
  /** Lobby: advisor offices. */
  advisorOffices?: number;
  /** Sales desks (`teller` slot): stations and interactions per station per week. */
  stations?: number;
  perStation?: number;
  productivityCoins?: number;
  /** Vault: security coins and safe deposit boxes. */
  security?: number;
  boxes?: number;
  /** ATM: interactions per week. */
  atmProductivity?: number;
}

const e = (s: EquipmentSpec) => s;

export const EQUIPMENT: Record<string, EquipmentSpec> = {
  ext_storefront: e({
    id: 'ext_storefront',
    slot: 'exterior',
    name: 'Plain Storefront',
    description: 'An awning and a big window.',
    quality: 1.5,
    cost: 45000,
  }),
  ext_brick: e({
    id: 'ext_brick',
    slot: 'exterior',
    name: 'Heritage Brick',
    description: 'Arched windows in old red brick.',
    quality: 2.5,
    cost: 70000,
  }),
  ext_glass: e({
    id: 'ext_glass',
    slot: 'exterior',
    name: 'Modern Glass',
    description: 'A clean grid of glass and steel mullions.',
    quality: 3.5,
    cost: 120000,
  }),
  ext_columns: e({
    id: 'ext_columns',
    slot: 'exterior',
    name: 'Classic Columns',
    description: 'A pediment on four stone columns.',
    quality: 4.5,
    cost: 210000,
  }),
  ext_deco: e({
    id: 'ext_deco',
    slot: 'exterior',
    name: 'Deco Tower Front',
    description: 'A stepped crown with a sunburst over the door.',
    quality: 5.0,
    cost: 340000,
  }),
  ext_lattice: e({
    id: 'ext_lattice',
    slot: 'exterior',
    name: 'Lattice Pavilion',
    description: 'A floating roof over a diagrid of glass, with a light wall by the door.',
    quality: 5.0,
    cost: 340000,
  }),

  lob_basic: e({
    id: 'lob_basic',
    slot: 'lobby',
    name: 'Basic Lobby',
    description: 'Chairs, a counter and a queue rope.',
    quality: 1.5,
    cost: 90000,
    advisorOffices: 0,
  }),
  lob_comfort: e({
    id: 'lob_comfort',
    slot: 'lobby',
    name: 'Comfort Lobby',
    description: 'Soft seating and one meeting room.',
    quality: 2.5,
    cost: 145000,
    advisorOffices: 1,
  }),
  lob_advice: e({
    id: 'lob_advice',
    slot: 'lobby',
    name: 'Demo Lounge',
    description: 'Two glass-walled meeting rooms.',
    quality: 3.5,
    cost: 220000,
    advisorOffices: 2,
  }),
  lob_marble: e({
    id: 'lob_marble',
    slot: 'lobby',
    name: 'Showcase Hall',
    description: 'Marble floors and three private meeting rooms.',
    quality: 4.5,
    cost: 340000,
    advisorOffices: 3,
  }),
  lob_private: e({
    id: 'lob_private',
    slot: 'lobby',
    name: 'Executive Briefing Suite',
    description: 'Four briefing rooms for your biggest customers.',
    quality: 5.0,
    cost: 520000,
    advisorOffices: 4,
  }),

  tel_counter: e({
    id: 'tel_counter',
    slot: 'teller',
    name: 'Two-Seat Counter',
    description: 'Two sales seats at a counter.',
    quality: 2,
    productivityCoins: 2,
    stations: 2,
    perStation: 70,
    cost: 24000,
  }),
  tel_standard: e({
    id: 'tel_standard',
    slot: 'teller',
    name: 'Standard Sales Floor',
    description: 'Three sales desks and a queue.',
    quality: 3,
    productivityCoins: 3,
    stations: 3,
    perStation: 80,
    cost: 48000,
  }),
  tel_pods: e({
    id: 'tel_pods',
    slot: 'teller',
    name: 'Service Pods',
    description: 'Three open pods, no glass.',
    quality: 4,
    productivityCoins: 3,
    stations: 3,
    perStation: 95,
    cost: 82000,
  }),
  tel_express: e({
    id: 'tel_express',
    slot: 'teller',
    name: 'Express Desks',
    description: 'Five quick desks for fast sign-ups.',
    quality: 3,
    productivityCoins: 5,
    stations: 5,
    perStation: 90,
    cost: 115000,
  }),
  tel_concierge: e({
    id: 'tel_concierge',
    slot: 'teller',
    name: 'Concierge Desks',
    description: 'Four sit-down desks with a greeter.',
    quality: 5,
    productivityCoins: 4,
    stations: 4,
    perStation: 110,
    cost: 160000,
  }),

  vlt_safe: e({
    id: 'vlt_safe',
    slot: 'vault',
    name: 'Floor Rack',
    description: 'One server rack in the back room.',
    quality: 1,
    security: 1,
    boxes: 0,
    cost: 18000,
  }),
  vlt_steel: e({
    id: 'vlt_steel',
    slot: 'vault',
    name: 'Machine Room',
    description: 'A small machine room with one rack.',
    quality: 3,
    security: 3,
    boxes: 150,
    cost: 55000,
  }),
  vlt_timelock: e({
    id: 'vlt_timelock',
    slot: 'vault',
    name: 'Glazed Machine Room',
    description: 'Two racks behind a glass wall.',
    quality: 4,
    security: 4,
    boxes: 300,
    cost: 95000,
  }),
  vlt_fortress: e({
    id: 'vlt_fortress',
    slot: 'vault',
    name: 'Showcase Machine Room',
    description: 'Three racks behind a wide glass wall.',
    quality: 5,
    security: 5,
    boxes: 600,
    cost: 180000,
  }),

  atm_none: e({
    id: 'atm_none',
    slot: 'atm',
    name: 'No Kiosk',
    description: 'Customers wait for a desk.',
    quality: 0,
    atmProductivity: 0,
    cost: 0,
  }),
  atm_wall: e({
    id: 'atm_wall',
    slot: 'atm',
    name: 'Wall Kiosk',
    description: 'One demo screen in the wall.',
    quality: 2,
    atmProductivity: 120,
    cost: 14000,
  }),
  atm_dual: e({
    id: 'atm_dual',
    slot: 'atm',
    name: 'Dual Kiosk',
    description: 'Two demo screens side by side.',
    quality: 3,
    atmProductivity: 240,
    cost: 28000,
  }),
  atm_smart: e({
    id: 'atm_smart',
    slot: 'atm',
    name: 'Self-Serve Kiosk',
    description: 'Signs customers up on the spot.',
    quality: 4,
    atmProductivity: 300,
    cost: 46000,
  }),
  atm_lobby: e({
    id: 'atm_lobby',
    slot: 'atm',
    name: '24/7 Demo Lobby',
    description: 'A lit vestibule open all night.',
    quality: 5,
    atmProductivity: 480,
    cost: 78000,
  }),
};

export interface BuildSpec {
  exterior: string;
  lobby: string;
  teller: string;
  vault: string;
  atm: string;
}

/** Reference builds from CONTENT §7. */
export const REFERENCE_BUILDS: Record<'basic' | 'mid' | 'premium', BuildSpec> = {
  basic: {
    exterior: 'ext_storefront',
    lobby: 'lob_basic',
    teller: 'tel_counter',
    vault: 'vlt_safe',
    atm: 'atm_none',
  },
  mid: {
    exterior: 'ext_brick',
    lobby: 'lob_comfort',
    teller: 'tel_standard',
    vault: 'vlt_steel',
    atm: 'atm_wall',
  },
  premium: {
    exterior: 'ext_columns',
    lobby: 'lob_marble',
    teller: 'tel_concierge',
    vault: 'vlt_timelock',
    atm: 'atm_lobby',
  },
};

export const BUILD_SLOTS: readonly BuildSlot[] = ['exterior', 'lobby', 'teller', 'vault', 'atm'];

/** Fit-out slots depreciate over 10 years; equipment over 5 (SIMULATION §14.2). */
export const isFitout = (slot: BuildSlot) => slot === 'exterior' || slot === 'lobby';
