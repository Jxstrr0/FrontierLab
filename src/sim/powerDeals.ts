// Data-centre and power deals at regional energy sites (stage C8a, SIMULATION
// §13.7a): the payroll partnership reworked for an AI lab. Pure formulas (fee,
// contracted GPUs, price, health, renewal) plus the weekly step: contracted
// GPUs follow the participation curve toward their target and join the compute
// pool, the lab pays for them take-or-pay, the fee amortizes, and the deal ends
// by termination or lapse with a 12-week runoff. Signing, renewing and
// releasing live in commands/powerDeals.ts.
import {
  PARTNER_BALANCE_STEP,
  PARTNER_HEALTH,
  PARTNER_RENEWAL,
  PARTNER_RUNOFF_WEEKS,
  POWER_DEAL,
} from '../config/balance';
import { CITIES, isRegional } from '../data/cities';
import { openDataCenters } from './dataCenters';
import { pushEvent } from './events';
import { postPnl, spend } from './ledger';
import { clamp, ema } from './math';
import { listLevel } from './nominal';
import { participation } from './partnerships';
import type { GameState, PowerDeal, Site } from './state';

/** A regional employer site: where power deals are signed. */
export function isEnergySite(site: Site | undefined): site is Site {
  return !!site && site.kind === 'employer' && !!site.employer && isRegional(site.cityId);
}

const employees = (site: Site) => site.employer?.employees ?? 0;
const countryOf = (cityId: string) => CITIES[cityId]?.country;

/** §13.7a: employees × feePerEmployee at today's price list in the site's country. */
export function powerDealFee(state: GameState, site: Site): number {
  return employees(site) * POWER_DEAL.feePerEmployee * listLevel(state, site.cityId);
}

/** Take-or-pay price per GPU-week, fixed at signing. */
export function powerDealPrice(state: GameState, site: Site): number {
  return POWER_DEAL.pricePerGpuWeek * listLevel(state, site.cityId);
}

/** §13.7a: employees × gpusPerEmployee × participation × (0.5 + 0.6 × health/100). */
export function dealGpuTarget(site: Site, part: number, health: number): number {
  const H = PARTNER_HEALTH;
  return (
    employees(site) *
    POWER_DEAL.gpusPerEmployee *
    part *
    (H.balanceBase + (H.balanceSlope * health) / 100)
  );
}

/** True with an open data center of yours in the site's country. */
export function hasDataCenterIn(state: GameState, cityId: string): boolean {
  const country = countryOf(cityId);
  return openDataCenters(state).some((dc) => countryOf(dc.cityId) === country);
}

/** §13.7a health target: base + a data center in the country − the safety-tier penalty. */
export function powerDealHealthTarget(state: GameState, site: Site): number {
  return (
    POWER_DEAL.healthBase +
    (hasDataCenterIn(state, site.cityId) ? POWER_DEAL.dataCenterBonus : 0) -
    POWER_DEAL.tierPenalty[state.company.tier]
  );
}

/** Renewal fee: today's signing fee × (1.5 − health/100), as for partnerships. */
export function powerDealRenewalFee(state: GameState, site: Site, d: PowerDeal): number {
  return powerDealFee(state, site) * (PARTNER_RENEWAL.base - d.health / 100);
}

export const dealElapsed = (state: GameState, d: PowerDeal) => state.clock.week - d.startWeek;

/** Renewal opens in the last year of the term. */
export function canRenewDeal(state: GameState, d: PowerDeal): boolean {
  return (
    d.status === 'active' && dealElapsed(state, d) >= d.termWeeks - PARTNER_RENEWAL.windowWeeks
  );
}

/** The active deal at a site, if any. */
export function activePowerDeal(state: GameState, siteId: string): PowerDeal | undefined {
  return Object.values(state.powerDeals).find((d) => d.siteId === siteId && d.status === 'active');
}

/** GPUs contracted under every deal (active or running off): part of owned compute. */
export function dealGpus(state: GameState): number {
  let gpus = 0;
  for (const d of Object.values(state.powerDeals)) gpus += d.gpus;
  return gpus;
}

/** This week's take-or-pay bill across every deal. */
export function dealWeeklyCost(state: GameState): number {
  let cost = 0;
  for (const d of Object.values(state.powerDeals)) cost += d.gpus * d.price;
  return cost;
}

// ─── Weekly step (tick step 4, before the compute tally) ──────────────────────

const siteName = (site: Site | undefined) => site?.employer?.name ?? site?.refId ?? '';

/** Ends a deal: the remaining fee is written off and the GPUs run off. */
export function startDealRunoff(
  state: GameState,
  d: PowerDeal,
  reason: 'terminated' | 'lapsed' | 'released',
): void {
  if (d.unamortized > 0) postPnl(state, 'amortization', d.unamortized);
  d.unamortized = 0;
  d.status = 'runoff';
  d.runoffWeeksLeft = PARTNER_RUNOFF_WEEKS;
  const site = state.world.sites[d.siteId];
  pushEvent(
    state,
    'POWER_DEAL_ENDED',
    { dealId: d.id, site: siteName(site), reason },
    reason === 'terminated' ? 2 : 3,
  );
}

function runActive(state: GameState, d: PowerDeal, site: Site): void {
  const t = dealElapsed(state, d);
  d.health = clamp(ema(d.health, powerDealHealthTarget(state, site), PARTNER_HEALTH.ema), 0, 100);
  const target = dealGpuTarget(site, participation(t, d.termWeeks), d.health);
  d.gpus += PARTNER_BALANCE_STEP * (target - d.gpus);

  // Straight-line amortization over the weeks left in the term (non-cash, §14.2).
  const weeksLeft = Math.max(1, d.termWeeks - t + 1);
  const amort = Math.min(d.unamortized, d.unamortized / weeksLeft);
  postPnl(state, 'amortization', amort);
  d.unamortized -= amort;

  d.lowHealthWeeks = d.health < PARTNER_HEALTH.terminateBelow ? d.lowHealthWeeks + 1 : 0;
  if (d.lowHealthWeeks >= PARTNER_HEALTH.terminateWeeks) startDealRunoff(state, d, 'terminated');
  else if (t >= d.termWeeks) startDealRunoff(state, d, 'lapsed');
}

/** Tick step 4: pay for last week's contracted GPUs, then move each deal along. */
export function runPowerDeals(state: GameState): void {
  for (const d of Object.values(state.powerDeals)) {
    spend(state, 'compute', d.gpus * d.price);
    const site = state.world.sites[d.siteId];
    if (d.status === 'active' && isEnergySite(site)) runActive(state, d, site);
    else if (d.status === 'active') startDealRunoff(state, d, 'terminated');
    if (d.status === 'runoff') {
      const left = Math.max(1, d.runoffWeeksLeft ?? 1);
      d.gpus -= d.gpus / left;
      d.runoffWeeksLeft = left - 1;
      if (d.runoffWeeksLeft <= 0) delete state.powerDeals[d.id];
    }
  }
}
