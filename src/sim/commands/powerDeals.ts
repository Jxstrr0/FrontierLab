// Power-deal commands (stage C8a, SIMULATION §13.7a): sign a data-centre and
// power deal at a regional energy site, renew it in its last year, or release it.
import { PARTNER_CONTRACT_WEEKS, PARTNER_HEALTH } from '../../config/balance';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash } from '../ledger';
import {
  activePowerDeal,
  canRenewDeal,
  isEnergySite,
  powerDealFee,
  powerDealPrice,
  powerDealRenewalFee,
  startDealRunoff,
} from '../powerDeals';
import { pauseBlock } from '../safety';
import type { GameState, PowerDeal } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Why a deal can't be signed at this site right now, or undefined if it can. */
export function powerDealBlocker(state: GameState, siteId: string): string | undefined {
  const site = state.world.sites[siteId];
  if (!isEnergySite(site)) return 'Power deals are signed at regional energy sites.';
  if (activePowerDeal(state, siteId)) return 'You already have a power deal here.';
  if (site.cityId !== state.world.currentCityId)
    return 'Travel to the energy site to sign a power deal.';
  const paused = pauseBlock(state);
  if (paused) return paused;
  const fee = powerDealFee(state, site);
  if (state.company.cash < fee) return `Not enough cash: you need ${money(fee)}.`;
  return undefined;
}

/** Signs a deal: the fee leaves corporate cash and becomes an intangible (§13.7a). */
export function signPowerDeal(state: GameState, siteId: string): CommandResult<{ dealId: string }> {
  const blocker = powerDealBlocker(state, siteId);
  if (blocker) return fail(blocker);
  const site = state.world.sites[siteId]!;
  const fee = powerDealFee(state, site);
  const d: PowerDeal = {
    id: newId(state, 'pdeal'),
    siteId,
    startWeek: state.clock.week,
    termWeeks: PARTNER_CONTRACT_WEEKS,
    fee,
    unamortized: fee,
    gpus: 0,
    price: powerDealPrice(state, site),
    health: PARTNER_HEALTH.start,
    lowHealthWeeks: 0,
    status: 'active',
  };
  state.powerDeals[d.id] = d;
  postCash(state, -fee, 'investing');
  pushEvent(
    state,
    'POWER_DEAL_SIGNED',
    { dealId: d.id, siteId, site: site.employer?.name ?? site.refId, fee },
    3,
  );
  return ok({ dealId: d.id });
}

/** Renews for another full term in the last year, re-priced at today's list. */
export function renewPowerDeal(state: GameState, dealId: string): CommandResult<{ fee: number }> {
  const d = state.powerDeals[dealId];
  const site = d && state.world.sites[d.siteId];
  if (!d || !isEnergySite(site) || d.status !== 'active') return fail('That deal has ended.');
  if (!canRenewDeal(state, d)) return fail('Renewal opens in the last year of the contract.');
  const fee = powerDealRenewalFee(state, site, d);
  if (state.company.cash < fee) return fail(`Not enough cash: you need ${money(fee)}.`);
  postCash(state, -fee, 'investing');
  d.termWeeks += PARTNER_CONTRACT_WEEKS;
  d.fee += fee;
  d.unamortized += fee;
  d.price = powerDealPrice(state, site);
  pushEvent(
    state,
    'POWER_DEAL_RENEWED',
    { dealId: d.id, site: site.employer?.name ?? site.refId, fee },
    4,
  );
  return ok({ fee });
}

/** Ends a deal early: the GPUs run off over 12 weeks and the fee is written off. */
export function releasePowerDeal(state: GameState, dealId: string): CommandResult {
  const d = state.powerDeals[dealId];
  if (!d || d.status !== 'active') return fail('That deal has already ended.');
  startDealRunoff(state, d, 'released');
  return ok();
}
