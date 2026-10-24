// The eight brand inks a player can print their bank in (ART_DIRECTION §1.1).
export interface BrandInk {
  hex: string;
  name: string;
}

export const BRAND_INKS: readonly BrandInk[] = [
  { hex: '#2C4A7A', name: 'Vault Blue' },
  { hex: '#2F7D5B', name: 'Emerald' },
  { hex: '#8E2F3E', name: 'Garnet' },
  { hex: '#5A3E7A', name: 'Royal Purple' },
  { hex: '#A8643A', name: 'Copper' },
  { hex: '#4A5568', name: 'Slate' },
  { hex: '#A88A2E', name: 'Gold' },
  { hex: '#2A7A80', name: 'Teal' },
];
