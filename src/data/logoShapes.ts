// Logo shapes (CONTENT §7b): the outline of the bank's mark, chosen when you
// found the bank. The medallion in the top bar, the seal on every branch front
// and the plaque over the counter all take this shape. Names are original.
import type { LogoShape } from './types';

export interface LogoShapeSpec {
  id: LogoShape;
  name: string;
  description: string;
}

export const LOGO_SHAPES: readonly LogoShapeSpec[] = [
  { id: 'round', name: 'Coin', description: 'The classic round medallion.' },
  { id: 'shield', name: 'Shield', description: 'A heraldic shield, square-topped.' },
  { id: 'lozenge', name: 'Lozenge', description: 'A diamond set on its point.' },
  { id: 'hex', name: 'Hexagon', description: 'Six sides, flat top and bottom.' },
  { id: 'plaque', name: 'Plaque', description: 'A square with cut corners.' },
  { id: 'rosette', name: 'Rosette', description: 'A scalloped wax seal.' },
];

export const LOGO_SHAPE_IDS: readonly LogoShape[] = LOGO_SHAPES.map((l) => l.id);

/** The shape every bank wore before shapes existed (saves from before v20). */
export const DEFAULT_LOGO_SHAPE: LogoShape = 'round';
