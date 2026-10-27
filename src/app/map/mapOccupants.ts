// What the map renderer draws on each lot and site (src/art/mapRenderer.ts):
// roof flags in your or a rival's ink, a business's vendor awning, your data
// center halls and the energy sites' substation yards, and leased offices.
// Read-only view of GameState.
import type { LotOccupant } from '../../art/mapRenderer';
import { FEATURES, type FeatureId } from '../../config/balance';
import type { GameState, Lot } from '../../sim/state';
import { vendorInk } from '../business/businessView';
import { isEnergySite } from '../../sim/powerDeals';

/**
 * Who is in each lot (and, with FEATURES.hq, which office buildings you lease
 * and what stands at each energy site), for the renderer's roof flags, awnings
 * and data center halls (src/art/mapRenderer.ts).
 */
export function occupantsOf(
  s: GameState,
  lots: Lot[],
  features: Record<FeatureId, boolean> = FEATURES,
): Record<string, LotOccupant> {
  const out: Record<string, LotOccupant> = {};
  for (const lot of lots) {
    const occ = lot.occupant;
    if (!occ) continue;
    if (occ.type === 'business') {
      // C5a: a business wears its AI vendor's awning; one with no vendor stays plain.
      const ink = vendorInk(s, s.businesses[occ.id]);
      if (ink) out[lot.id] = { type: 'business', ink };
      continue;
    }
    // Your data center stands as a low hall (C8c), not a storefront.
    if (occ.type === 'player' && s.dataCenters[occ.id]) {
      out[lot.id] = { type: 'player', ink: s.meta.brandInk, building: 'dataCenter' };
      continue;
    }
    // A converting branch still flies the old bank's colours (§19.8).
    out[lot.id] =
      occ.type === 'player'
        ? { type: 'player', ink: s.branches[occ.id]?.converting?.ink ?? s.meta.brandInk }
        : { type: 'rival', ink: s.rivals[occ.id]?.ink ?? '#5a5a5a' };
  }
  // Energy sites (C2d) draw a substation yard, with your hall once you build there (C8c).
  if (features.hq) {
    for (const site of Object.values(s.world.sites)) {
      if (site.cityId !== s.world.currentCityId || !isEnergySite(site)) continue;
      const dc = Object.values(s.dataCenters).some((d) => d.siteId === site.id);
      out[site.id] = dc
        ? { type: 'player', ink: s.meta.brandInk, building: 'dataCenter' }
        : { type: 'site', ink: '', building: 'energySite' };
    }
  }
  if (features.hq) {
    for (const o of Object.values(s.world.officeListings)) {
      if (o.officeId && o.cityId === s.world.currentCityId)
        out[o.id] = { type: 'player', ink: s.meta.brandInk };
    }
  }
  return out;
}

export function occupantsKey(o: Record<string, LotOccupant>): string {
  return Object.keys(o)
    .sort()
    .map((k) => `${k}:${o[k]!.type}:${o[k]!.ink}:${o[k]!.building ?? ''}`)
    .join(';');
}
