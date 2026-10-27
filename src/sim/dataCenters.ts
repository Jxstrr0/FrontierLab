// Data centers (stage C2c, SIMULATION §9.9): a second building kind beside the
// sales office. Each holds a GPU hall, a power feed that caps how many of its
// GPUs run, and cooling that sets the power bill's PUE. After an 8–16 week
// fit-out it opens; each week it pays power and rent. Until its compute joins
// the pool (C4) its payoff is latency: sales offices in its city, or in cities
// close to it, get a Service lift.
import { DATA_CENTER, POWER_DEAL } from '../config/balance';
import { CITIES, isRegional } from '../data/cities';
import { DC_PARTS, type DcBuild } from '../data/dataCenters';
import { pushEvent } from './events';
import { cityDistanceKm } from './geo';
import { gpuDerate } from './incident/effects';
import { spend } from './ledger';
import type { DataCenter, GameState } from './state';

/** GPUs the hall holds. */
export function hallGpus(build: DcBuild): number {
  return DC_PARTS[build.hall]?.gpus ?? 0;
}

/** GPUs that run: the hall, capped by the power feed (§9.9). */
export function usableGpus(build: DcBuild): number {
  return Math.min(hallGpus(build), DC_PARTS[build.power]?.gpus ?? 0);
}

/** GPUs really running today: the usable count less any fire derate (CONTENT §22, DC_FIRE). */
export function runningGpus(state: GameState, dc: DataCenter): number {
  return Math.round(usableGpus(dc.build) * (1 - gpuDerate(state, dc.id)));
}

export function pueOf(build: DcBuild): number {
  return DC_PARTS[build.cooling]?.pue ?? 1;
}

/** Power index: cheap at an energy site, the city's cost index elsewhere. */
export function powerIndex(cityId: string): number {
  if (isRegional(cityId)) return DATA_CENTER.energySitePower;
  return CITIES[cityId]?.costIndex ?? 1;
}

/** Weekly power bill: running GPUs × the per-GPU price × PUE × the power index (§9.9). */
export function powerBill(build: DcBuild, cityId: string): number {
  return usableGpus(build) * DATA_CENTER.powerPerGpuWeek * pueOf(build) * powerIndex(cityId);
}

/**
 * Power-bill multiplier for a data center in `cityId`: POWER_DEAL.powerDiscount
 * with an active power deal in its country (C8a, §13.7a), else 1.
 */
export function dealPowerMult(state: GameState, cityId: string): number {
  const country = CITIES[cityId]?.country;
  for (const d of Object.values(state.powerDeals)) {
    const site = state.world.sites[d.siteId];
    if (d.status === 'active' && site && CITIES[site.cityId]?.country === country)
      return POWER_DEAL.powerDiscount;
  }
  return 1;
}

/** This week's power bill for one of your data centers: only the GPUs running, with any power-deal discount. */
export function dataCenterPowerBill(state: GameState, dc: DataCenter): number {
  const share = usableGpus(dc.build) > 0 ? runningGpus(state, dc) / usableGpus(dc.build) : 0;
  return powerBill(dc.build, dc.cityId) * share * dealPowerMult(state, dc.cityId);
}

/** Weeks a hall takes to fit out. */
export function hallWeeks(build: DcBuild): number {
  return DC_PARTS[build.hall]?.weeks ?? 0;
}

/** Data centers that are open and running GPUs. */
export function openDataCenters(state: GameState): DataCenter[] {
  return Object.values(state.dataCenters).filter(
    (d) => d.status === 'open' && usableGpus(d.build) > 0,
  );
}

/**
 * Service lift for sales offices in `cityId` (§9.9): the best of
 * DATA_CENTER.liftSameCity for an open data center in the city and
 * DATA_CENTER.liftNear for one within DATA_CENTER.nearKm.
 */
export function latencyLift(state: GameState, cityId: string): number {
  let lift = 0;
  for (const dc of openDataCenters(state)) {
    if (dc.cityId === cityId) return DATA_CENTER.liftSameCity;
    if (cityDistanceKm(dc.cityId, cityId) <= DATA_CENTER.nearKm) lift = DATA_CENTER.liftNear;
  }
  return lift;
}

/** Tick step 4 (before the sales offices): fit-outs count down, open ones pay power and rent. */
export function runDataCenters(state: GameState): void {
  for (const dc of Object.values(state.dataCenters)) {
    spend(state, 'rent', dc.lease.weeklyRent);
    if (dc.status === 'fitout') {
      dc.weeksLeft = Math.max(0, dc.weeksLeft - 1);
      if (dc.weeksLeft > 0) continue;
      dc.status = 'open';
      // A hall upgrade refits an open data center; it reopens rather than opens.
      const refit = dc.openedWeek !== undefined;
      dc.openedWeek ??= state.clock.week;
      pushEvent(
        state,
        'DATA_CENTER_OPENED',
        { dataCenterId: dc.id, name: dc.name, city: dc.cityId, gpus: usableGpus(dc.build), refit },
        2,
        dc.id,
      );
    }
    // Fit-outs draw no power; only a running hall pays the bill.
    if (dc.status === 'open') spend(state, 'equipment', dataCenterPowerBill(state, dc));
  }
}
