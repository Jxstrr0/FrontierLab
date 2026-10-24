// View helpers for the Marketing floor and agency panel (SCREENS §10, §15;
// SIMULATION §7, §16.10): the cities a campaign can target from HQ, which
// instance is already running, awareness rows by city and the wording for
// scopes and gains. Reads state but never changes it.
import { AGENCIES, BRAND_CAMPAIGNS, type BrandCampaignSpec } from '../../../data/brandCampaigns';
import { CITIES } from '../../../data/cities';
import { COUNTRIES } from '../../../data/countries';
import type { CountryId } from '../../../data/types';
import { brandGainByCity, campaignCities } from '../../../sim/hqMarketing';
import type { AgencyPackageRun, BrandCampaign, GameState } from '../../../sim/state';

export type Scope = 'city' | 'country';

export const SCOPE_LABEL: Record<Scope, string> = { city: 'City', country: 'Country' };

/**
 * The cities you can aim brand campaigns at (home, branch and office cities and
 * where you stand), with the one the picker opens on: where you are when it's
 * on the list, else home.
 */
export function targetCities(state: GameState): { ids: string[]; initial: string } {
  const ids = campaignCities(state);
  const here = state.world.currentCityId;
  return { ids, initial: ids.includes(here) ? here : (ids[0] ?? state.meta.homeCityId) };
}

/** The target id for a scope: the picked city, or its country. */
export function scopeTarget(cityId: string, scope: Scope): string {
  return scope === 'city' ? cityId : (CITIES[cityId]?.country ?? '');
}

/** Where else a campaign is running, as "Calgary, Canada" (empty when nowhere). */
export function runningElsewhere(
  state: GameState,
  campaignId: string,
  except: { scope: Scope; targetId: string },
): string {
  return state.marketing.campaigns
    .filter(
      (c) =>
        c.campaignId === campaignId &&
        !(c.scope === except.scope && c.targetId === except.targetId),
    )
    .map((c) => targetName(c.scope, c.targetId))
    .join(', ');
}

/** Display name for a campaign target (city or country id). */
export function targetName(scope: Scope, targetId: string): string {
  return scope === 'city'
    ? (CITIES[targetId]?.name ?? targetId)
    : (COUNTRIES[targetId as CountryId]?.name ?? targetId);
}

/** The running instance of a campaign at a scope and target, if any. */
export function runningAt(
  state: GameState,
  campaignId: string,
  scope: Scope,
  targetId: string,
): BrandCampaign | undefined {
  return state.marketing.campaigns.find(
    (c) => c.campaignId === campaignId && c.scope === scope && c.targetId === targetId,
  );
}

/** A weekly gain to b (0–1) as awareness points: 0.012 → "+1.2 pts". */
export function pointsText(gain: number): string {
  return `+${(gain * 100).toFixed(1)} pts`;
}

export interface AwarenessRow {
  cityId: string;
  name: string;
  /** Brand awareness b, 0–1. */
  awareness: number;
  /** This week's expected rise after saturation: gain × (1 − b) (SIMULATION §7). */
  rise: number;
}

/** Brand awareness for every simulated city, highest first. */
export function awarenessRows(state: GameState): AwarenessRow[] {
  const gains = brandGainByCity(state);
  return Object.values(state.world.cities)
    .map((c) => ({
      cityId: c.id,
      name: CITIES[c.id]?.name ?? c.id,
      awareness: c.brandAwareness,
      rise: (gains[c.id] ?? 0) * (1 - c.brandAwareness),
    }))
    .sort((a, b) => b.awareness - a.awareness || a.name.localeCompare(b.name));
}

/** Why a campaign can't start at all (before scope checks), or undefined. */
export function campaignBlocker(spec: BrandCampaignSpec): string | undefined {
  return spec.needsFranchise
    ? 'Needs a sports franchise in the city. Franchises arrive with the personal empire.'
    : undefined;
}

/** Names for an agency package run. */
export function runNames(run: AgencyPackageRun): { agency: string; pkg: string; city: string } {
  const agency = AGENCIES[run.agencyId];
  return {
    agency: agency?.name ?? run.agencyId,
    pkg: agency?.packages.find((p) => p.id === run.packageId)?.name ?? run.packageId,
    city: CITIES[run.cityId]?.name ?? run.cityId,
  };
}

/** Campaigns in display order (the data table's order). */
export const CAMPAIGN_ORDER: readonly string[] = Object.keys(BRAND_CAMPAIGNS);
