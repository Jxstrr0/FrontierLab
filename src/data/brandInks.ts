// The twelve brand inks a player can print their lab in (ART_DIRECTION §1.1):
// eight banknote colours and four sharper modern ones.
export interface BrandInk {
  hex: string;
  name: string;
}

export const BRAND_INKS: readonly BrandInk[] = [
  { hex: '#2C4A7A', name: 'Midnight Blue' },
  { hex: '#2F7D5B', name: 'Emerald' },
  { hex: '#8E2F3E', name: 'Garnet' },
  { hex: '#5A3E7A', name: 'Royal Purple' },
  { hex: '#A8643A', name: 'Copper' },
  { hex: '#4A5568', name: 'Slate' },
  { hex: '#A88A2E', name: 'Gold' },
  { hex: '#2A7A80', name: 'Teal' },
  { hex: '#22262D', name: 'Graphite' },
  { hex: '#1E5BD6', name: 'Circuit Blue' },
  { hex: '#4B2DB5', name: 'Ultraviolet' },
  { hex: '#B0176B', name: 'Magenta' },
];
