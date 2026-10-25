// Stage 6 map buildings: the investment banks with an office in the city
// (Investment Banks layer, CONTENT §16), in the financial district. Seeded from
// the `sites6:{cityId}` stream so lots, offices and earlier sites never move,
// and placed on free street-facing tiles like hqSites.ts.
import { CITYGEN } from '../config/balance';
import { CITIES } from '../data/cities';
import { investmentBanksIn } from '../data/investmentBanks';
import { STREET_KINDS, STREET_NAMES } from '../data/names';
import { geometryFor, placeNear } from './cityPlacement';
import { stream } from './rng';
import type { GameState, Site } from './state';

/** Adds the city's investment bank offices. Safe to call once per city. */
export function generateCapitalMarketSites(state: GameState, cityId: string): void {
  const city = CITIES[cityId];
  if (!city) throw new Error(`Unknown city ${cityId}`);
  const rng = stream(state, `sites6:${cityId}`);
  const used = new Set<string>();
  const mark = (t: { x: number; y: number }) => used.add(`${t.x},${t.y}`);
  for (const lot of Object.values(state.world.lots)) if (lot.cityId === cityId) mark(lot.tile);
  for (const o of Object.values(state.world.officeListings)) if (o.cityId === cityId) mark(o.tile);
  for (const s of Object.values(state.world.sites)) if (s.cityId === cityId) mark(s.tile);

  const geo = geometryFor(state, cityId);
  for (const bankId of investmentBanksIn(cityId)) {
    const id = `site_${cityId}_investmentBank_${bankId}`;
    if (state.world.sites[id]) continue;
    const tile = placeNear(city, geo, 'financial', rng, used);
    const site: Site = {
      id,
      cityId,
      kind: 'investmentBank',
      refId: bankId,
      tile,
      district: 'financial',
      address: `${rng.int(1, CITYGEN.maxStreetNumber)} ${rng.pick(STREET_NAMES)} ${rng.pick(STREET_KINDS)}`,
      buildingSeed: rng.int(0, CITYGEN.maxSeed),
    };
    state.world.sites[id] = site;
  }
}
