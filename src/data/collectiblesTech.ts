// Computing-era collectibles (CONTENT §20, 2026-10-31): lots from the history
// of machines that think, for an AI founder's shelf. Merged into COLLECTIBLES.
// Every item and maker is invented.
import type { CollectibleSpec } from './collectibles';

export const TECH_COLLECTIBLES: Record<string, CollectibleSpec> = {
  wafer: {
    id: 'wafer',
    name: 'Wafer from the First Teraflop Chip, 1996',
    estimate: 680_000,
    blurb:
      'A full silicon wafer of the chip that first ran a trillion sums a second, in its shipping case.',
    category: 'memorabilia',
  },
  chessdeck: {
    id: 'chessdeck',
    name: 'Punch-Card Deck of an Early Chess Program, 1958',
    estimate: 420_000,
    blurb: 'Two thousand cards, rubber-banded in order. It lost every game, gracefully.',
    category: 'memorabilia',
  },
  lecture: {
    id: 'lecture',
    name: 'Handwritten Notes for a Founding Lecture on Learning Machines',
    estimate: 1_400_000,
    blurb:
      'Pencilled diagrams of a network that learns from its mistakes, decades before it worked.',
    category: 'books',
  },
  robotarm: {
    id: 'robotarm',
    name: 'Prototype Robot Arm from a University Lab, 1971',
    estimate: 560_000,
    blurb: 'Hydraulic, slow and proud. It stacked its first blocks on live television.',
    category: 'antiques',
  },
};
