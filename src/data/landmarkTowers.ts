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
  // More of the world's big cities (2026-10-31); Calgary and the smaller
  // starting cities stay without one.
  nyc: { address: 'Halyard Tower, 1 Corliss Plaza', floors: 22 },
  chi: { address: 'Lakemark Tower, 200 West Brenner', floors: 18 },
  sfo: { address: 'Fogline Tower, 1 Embark Street', floors: 16 },
  tor: { address: 'Northgate Tower, 1 Wexford Square', floors: 16 },
  par: { address: 'Tour Aurore, 1 Place Valcourt', floors: 16 },
  fra: { address: 'Mainturm Nord, 1 Kesselplatz', floors: 16 },
  tyo: { address: 'Hoshizora Tower, 1-1 Kaigan Kita', floors: 22 },
  hkg: { address: 'Junk Bay Tower, 1 Harbour Crescent', floors: 20 },
  sin: { address: 'Pelican Point Tower, 1 Marina Quay East', floors: 18 },
  syd: { address: 'Southerly Tower, 1 Wattle Wharf', floors: 16 },
};
