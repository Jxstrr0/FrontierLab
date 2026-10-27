// GPU lot types for the Compute floor's GPU market (stage C4b, docs/CONTENT.md
// §12b): fixed-price reservations of rented GPUs. Longer terms buy a bigger
// discount on today's spot price but lock it in, which pays off when a chip
// shortage drives spot up and hurts in a glut.
// Radar order: Cost, Term, Reliability, Flexibility, Latency (1–10; higher is
// better for you).
import type { Pentagon } from './types';

export interface GpuLotSpec {
  id: string;
  name: string;
  termWeeks: number;
  /** Discount on the spot price at signing. */
  discount: number;
  /** GPU range before scaling by max(1, demand / GPU_MARKET.sizeScale). */
  gpus: [number, number];
  radar: Pentagon;
  /** Weight when generating market offers. */
  weight: number;
}

export const GPU_LOT_TYPES: Record<string, GpuLotSpec> = {
  reserved_6m: {
    id: 'reserved_6m',
    name: '6-month reservation',
    termWeeks: 26,
    discount: 0.1,
    gpus: [100, 800],
    radar: [5, 3, 7, 7, 6],
    weight: 5,
  },
  reserved_1y: {
    id: 'reserved_1y',
    name: '1-year reservation',
    termWeeks: 52,
    discount: 0.18,
    gpus: [200, 1_500],
    radar: [7, 6, 8, 4, 6],
    weight: 4,
  },
  reserved_3y: {
    id: 'reserved_3y',
    name: '3-year reservation',
    termWeeks: 156,
    discount: 0.28,
    gpus: [500, 4_000],
    radar: [9, 9, 8, 1, 6],
    weight: 2,
  },
};

/** Fictional GPU cloud providers. */
export const GPU_PROVIDERS: readonly string[] = [
  'Northbeam Cloud',
  'Halcyon Compute',
  'Stratus Forge',
  'Ironleaf Racks',
  'Cobalt Grid',
  'Lumen Hollow',
  'Tidewater Compute',
  'Saltmarsh Cloud',
  'Kestrel Silicon',
  'Bramblewood GPU',
];
