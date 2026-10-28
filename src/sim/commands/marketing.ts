// HQ marketing commands (SIMULATION §16.10, CONTENT §11, SCREENS §10 and §15):
// start and stop brand campaigns (Marketing floor required) in any city or
// country you've reached, from anywhere, and buy agency packages at a
// marketing agency's office in the city you're in (no floor needed).
import { AGENCIES, BRAND_CAMPAIGNS } from '../../data/brandCampaigns';
import { CITIES } from '../../data/cities';
import { pushEvent } from '../events';
import { clubIn, ownsClubIn } from '../franchise';
import {
  agenciesInCity,
  agencyPackagePrice,
  campaignTargetBlock,
  hasMarketingFloor,
} from '../hqMarketing';
import { newId } from '../ids';
import { spend } from '../ledger';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

export interface BrandCampaignOrder {
  campaignId: string;
  scope: 'city' | 'country';
  /** City id for city scope, country id for country scope. */
  targetId: string;
}

/** Starts a brand campaign; its weekly cost is paid at each weekly tick. */
export function startBrandCampaign(
  state: GameState,
  order: BrandCampaignOrder,
): CommandResult<{ id: string }> {
  if (!hasMarketingFloor(state)) return fail('Brand campaigns need a Marketing floor at HQ.');
  const spec = BRAND_CAMPAIGNS[order.campaignId];
  if (!spec) return fail('That campaign is not available.');
  if (spec.needsFranchise && !ownsClubIn(state, order.targetId))
    return fail(`${spec.name} needs a sports franchise you own in the city.`);
  if (!spec.scopes.includes(order.scope))
    return fail(`${spec.name} runs per ${spec.scopes.join(' or ')}, not per ${order.scope}.`);
  const where = campaignTargetBlock(state, order.scope, order.targetId);
  if (where) return fail(where);
  const running = state.marketing.campaigns.some(
    (c) =>
      c.campaignId === order.campaignId && c.scope === order.scope && c.targetId === order.targetId,
  );
  if (running) return fail(`${spec.name} is already running there.`);
  const id = newId(state, 'bc');
  state.marketing.campaigns.push({
    id,
    campaignId: order.campaignId,
    scope: order.scope,
    targetId: order.targetId,
    startWeek: state.clock.week,
  });
  // CONTENT §11: naming rights make the paper.
  const club = spec.needsFranchise ? clubIn(state, order.targetId) : undefined;
  if (club) pushEvent(state, 'NAMING_RIGHTS', { clubId: club, cityId: order.targetId }, 1);
  return ok({ id });
}

export function stopBrandCampaign(state: GameState, id: string): CommandResult {
  const before = state.marketing.campaigns.length;
  state.marketing.campaigns = state.marketing.campaigns.filter((c) => c.id !== id);
  if (state.marketing.campaigns.length === before) return fail('That campaign is not running.');
  return ok();
}

export interface AgencyOrder {
  agencyId: string;
  packageId: string;
  cityId: string;
}

/** Buys an agency package for a city: paid now, boost spread evenly over its weeks (§16.10). */
export function buyAgencyPackage(
  state: GameState,
  order: AgencyOrder,
): CommandResult<{ id: string }> {
  const agency = AGENCIES[order.agencyId];
  const pkg = agency?.packages.find((p) => p.id === order.packageId);
  if (!agency || !pkg) return fail('That package is not available.');
  if (!agenciesInCity(state, order.cityId).includes(agency.id))
    return fail(`${agency.name} has no office in ${CITIES[order.cityId]?.name ?? 'that city'}.`);
  // DESIGN §5.17: visiting a building means being in its city.
  if (order.cityId !== state.world.currentCityId)
    return fail(
      `You need to be in ${CITIES[order.cityId]?.name ?? 'that city'} to visit the agency.`,
    );
  const price = agencyPackagePrice(state, pkg);
  if (price > state.company.cash)
    return fail(
      `${pkg.name} costs ${money(state, price)}; you have ${money(state, state.company.cash)}.`,
    );
  spend(state, 'marketing', price);
  const id = newId(state, 'ap');
  state.marketing.packages.push({
    id,
    agencyId: agency.id,
    packageId: pkg.id,
    cityId: order.cityId,
    weeksLeft: pkg.weeks,
    weeksTotal: pkg.weeks,
    boostPerWeek: pkg.boost / pkg.weeks,
  });
  if (pkg.branchBonus) {
    const current = state.marketing.cityBonus[order.cityId];
    state.marketing.cityBonus[order.cityId] = {
      bonus: Math.max(pkg.branchBonus.bonus, current?.bonus ?? 0),
      weeksLeft: Math.max(pkg.branchBonus.weeks, current?.weeksLeft ?? 0),
    };
  }
  return ok({ id });
}
