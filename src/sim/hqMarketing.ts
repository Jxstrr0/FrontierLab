// HQ marketing (SIMULATION §7, §16.10; CONTENT §11): brand campaigns that run
// weekly per city or country and raise city brand awareness b, agency packages
// that spread a one-off boost over their length, and the Prestige package's
// Branch-rating bonus. Runs in tick step 8 (corporate items).
import { BRAND_CAMPAIGNS, type BrandCampaignSpec } from '../data/brandCampaigns';
import { CITIES } from '../data/cities';
import { SEGMENTS, type SegmentId } from '../data/types';
import { pushEvent } from './events';
import { campaignMult } from './hq';
import { spend } from './ledger';
import { clamp } from './math';
import { listPrice } from './nominal';
import type { BrandCampaign, GameState } from './state';

export function hasMarketingFloor(state: GameState): boolean {
  return state.departments.marketing !== undefined;
}

/** Agencies with an office in a city (from the map's sites), in map order. */
export function agenciesInCity(state: GameState, cityId: string): string[] {
  return Object.values(state.world.sites)
    .filter((s) => s.kind === 'agency' && s.cityId === cityId)
    .map((s) => s.refId)
    .filter((id, i, all) => all.indexOf(id) === i);
}

/** A city brand campaigns can reach: generated (you've been there) and not a regional site. */
const campaignCity = (state: GameState, cityId: string): boolean =>
  !!state.world.cities[cityId] && !CITIES[cityId]?.regional;

/**
 * Cities a brand campaign can target from HQ, wherever you stand (DESIGN §5.2):
 * your home city, every city with one of your branches or offices, and the
 * city you're in, in that order and without repeats.
 */
export function campaignCities(state: GameState): string[] {
  const ids = [
    state.meta.homeCityId,
    ...Object.values(state.branches)
      .filter((b) => b.status !== 'closed')
      .map((b) => b.cityId),
    ...Object.values(state.offices).map((o) => o.cityId),
    state.world.currentCityId,
  ];
  return ids.filter((id, i) => ids.indexOf(id) === i && campaignCity(state, id));
}

/** Why a campaign can't target a city or country, or undefined when it can. */
export function campaignTargetBlock(
  state: GameState,
  scope: 'city' | 'country',
  targetId: string,
): string | undefined {
  if (scope === 'city') {
    return campaignCity(state, targetId) ? undefined : 'Pick a city you have flown to.';
  }
  const reached = Object.keys(state.world.cities).some(
    (id) => CITIES[id]?.country === targetId && campaignCity(state, id),
  );
  return reached ? undefined : 'Pick a country where you have flown to a city.';
}

/** Simulated cities a campaign covers: one city, or every simulated city in a country. */
export function coveredCities(state: GameState, c: BrandCampaign): string[] {
  if (c.scope === 'city') return state.world.cities[c.targetId] ? [c.targetId] : [];
  return Object.keys(state.world.cities)
    .filter((id) => CITIES[id]?.country === c.targetId)
    .sort();
}

/** Weekly cost of a campaign at its scope (CONTENT §11), at today's home price list (§4.6). */
export function brandCampaignCost(
  state: GameState,
  spec: BrandCampaignSpec,
  scope: 'city' | 'country',
): number {
  return listPrice(state, spec.costPerWeek[scope] ?? 0);
}

/** An agency package's price at today's home price list (§4.6). */
export function agencyPackagePrice(state: GameState, pkg: { cost: number }): number {
  return listPrice(state, pkg.cost);
}

/** Weekly cost of every running brand campaign, or only those of one scope. */
export function brandCampaignsWeeklyCost(state: GameState, scope?: 'city' | 'country'): number {
  return state.marketing.campaigns.reduce((sum, c) => {
    if (scope && c.scope !== scope) return sum;
    const spec = BRAND_CAMPAIGNS[c.campaignId];
    return sum + (spec ? brandCampaignCost(state, spec, c.scope) : 0);
  }, 0);
}

/**
 * This week's gain to b per city, before the (1 − b) saturation: brand
 * campaigns × campaignMult (Marketing coverage), plus agency packages, which
 * need no staff (§16.10).
 */
export function brandGainByCity(state: GameState): Record<string, number> {
  const gains: Record<string, number> = {};
  const mult = campaignMult(state);
  for (const c of state.marketing.campaigns) {
    const gain = BRAND_CAMPAIGNS[c.campaignId]?.gainPerWeek[c.scope] ?? 0;
    for (const cityId of coveredCities(state, c)) {
      gains[cityId] = (gains[cityId] ?? 0) + gain * mult;
    }
  }
  for (const p of state.marketing.packages) {
    if (p.weeksLeft > 0) gains[p.cityId] = (gains[p.cityId] ?? 0) + p.boostPerWeek;
  }
  return gains;
}

/**
 * Segment multipliers from brand campaigns covering a city (CONTENT §11), applied
 * to the new-customer mix like branch campaign boosts (§7). The boost above 1 is
 * scaled by Marketing coverage, as every campaign effect is (CONTENT §9).
 */
export function brandSegmentMults(state: GameState, cityId: string): Record<SegmentId, number> {
  const out = { STU: 1, YP: 1, FAM: 1, RET: 1, BIZ: 1 } as Record<SegmentId, number>;
  if (state.marketing.campaigns.length === 0) return out;
  const mult = campaignMult(state);
  for (const c of state.marketing.campaigns) {
    const boost = BRAND_CAMPAIGNS[c.campaignId]?.segmentBoost;
    if (!boost || !coveredCities(state, c).includes(cityId)) continue;
    for (const s of SEGMENTS) out[s] *= 1 + ((boost[s] ?? 1) - 1) * mult;
  }
  return out;
}

/** Branch-rating bonus in a city from a Prestige package (CONTENT §11). */
export function cityBrandBonus(state: GameState, cityId: string): number {
  const b = state.marketing.cityBonus[cityId];
  return b && b.weeksLeft > 0 ? b.bonus : 0;
}

/** Tick step 8: pay brand campaigns, raise b, and run down packages and bonuses. */
export function runBrandMarketing(state: GameState): void {
  const m = state.marketing;
  // Campaigns need the Marketing floor (§16.4 gating): releasing it stops them.
  if (m.campaigns.length > 0 && !hasMarketingFloor(state)) {
    for (const c of m.campaigns) {
      pushEvent(state, 'BRAND_CAMPAIGN_ENDED', { campaignId: c.campaignId, reason: 'noFloor' }, 4);
    }
    m.campaigns = [];
  }
  spend(state, 'marketing', brandCampaignsWeeklyCost(state));

  // §7: b += gain × (1 − b), the same saturating shape as branch awareness.
  for (const [cityId, gain] of Object.entries(brandGainByCity(state))) {
    const city = state.world.cities[cityId];
    if (!city || gain <= 0) continue;
    city.brandAwareness = clamp(city.brandAwareness + gain * (1 - city.brandAwareness), 0, 1);
  }

  for (const p of m.packages) p.weeksLeft -= 1;
  m.packages = m.packages.filter((p) => p.weeksLeft > 0);
  for (const [cityId, b] of Object.entries(m.cityBonus)) {
    b.weeksLeft -= 1;
    if (b.weeksLeft <= 0) delete m.cityBonus[cityId];
  }
}
