// House styles (CONTENT §7a, ART_DIRECTION §3): the look every one of your
// branch fronts shares, chosen when you found the bank. A style dresses each
// exterior option with its own name sign, lamps, planters and flag, so two
// banks on the same street never look alike. Names and descriptions are original.
import type { HouseStyle } from './types';

export interface HouseStyleSpec {
  id: HouseStyle;
  name: string;
  description: string;
}

export const HOUSE_STYLES: readonly HouseStyleSpec[] = [
  {
    id: 'heritage',
    name: 'Old Exchange',
    description: 'Gilt letters on a dark fascia, carriage lanterns and clipped box trees.',
  },
  {
    id: 'deco',
    name: 'Jazz Age',
    description: 'A stepped sign with chevrons, globe lamps and tall urns.',
  },
  {
    id: 'modern',
    name: 'Clean Line',
    description: 'Slim lower-case letters, light bars and a long trough of grasses.',
  },
  {
    id: 'garden',
    name: 'Market Street',
    description: 'A rounded painted sign, hanging lanterns and pots of flowers.',
  },
  {
    id: 'civic',
    name: 'Civic Stone',
    description: 'Capitals cut into stone, lamp standards and classical urns.',
  },
];

export const HOUSE_STYLE_IDS: readonly HouseStyle[] = HOUSE_STYLES.map((h) => h.id);
