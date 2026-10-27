// Landmark towers (CONTENT §9, owner's ask 2026-10-27): one giant office
// building for lease in a city's Financial District, tall enough to hold every
// HQ department under one roof. Keyed by city id; names are fictional.

export interface LandmarkTowerSpec {
  /** Shown as the listing's address. */
  address: string;
  /** Leasable floors (open plan, 32 desks each). */
  floors: number;
}

export const LANDMARK_TOWERS: Record<string, LandmarkTowerSpec> = {
  lon: { address: 'Kestrel Tower, 1 Fenmarch Square', floors: 20 },
  mos: { address: 'Polaris Tower, 1 Severny Prospect', floors: 18 },
};
