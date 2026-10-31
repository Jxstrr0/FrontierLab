// The CTO's Compute delegation (SIMULATION §17.2, post-C8): each week, with a
// Compute floor, reserve GPU lots from the floor's market until the GPUs you
// have outside spot (data centers, power deals, fit-outs about to open and
// rented lots) cover the share of last week's demand you dial
// (executives.computeCover). Terms follow the chip cycle, and no offer priced
// at or above spot is taken. Runs from executives.ts each week; the dial's
// tagline reads computeCoverPlan without changing anything.
import { CTO_COMPUTE, GPU_MARKET } from '../config/balance';
import { rentGpus } from './commands/compute';
import { capacityGpus, spotPrice } from './compute';
import { usableGpus } from './dataCenters';
import { hasTreasuryFloor } from './gpuMarket';
import type { ChipPhase, GameState, GpuOffer } from './state';

/** GPUs outside spot, counting data centers still in fit-out. */
export function plannedCapacity(state: GameState): number {
  let fitout = 0;
  for (const dc of Object.values(state.dataCenters)) {
    if (dc.status === 'fitout') fitout += usableGpus(dc.build);
  }
  return capacityGpus(state) + fitout;
}

/** Offers in the order the CTO takes them for this chip phase. */
export function offerOrder(offers: readonly GpuOffer[], phase: ChipPhase): GpuOffer[] {
  const byTerm = phase === 'glut' ? -1 : phase === 'shortage' ? 1 : 0;
  return [...offers].sort(
    (a, b) => byTerm * (a.termWeeks - b.termWeeks) || a.price - b.price || (a.id < b.id ? -1 : 1),
  );
}

export interface CoverPlan {
  /** False without a Compute floor. */
  active: boolean;
  demand: number;
  capacity: number;
  /** GPUs the cover target asks for. */
  target: number;
  /** The reservations the CTO would make now: offer id and GPUs. */
  takes: { offerId: string; gpus: number; price: number; termWeeks: number }[];
}

/** What the CTO would reserve right now for a cover target. Changes nothing. */
export function computeCoverPlan(state: GameState, cover: number): CoverPlan {
  const c = state.compute;
  const demand = c.demandGpus;
  const capacity = plannedCapacity(state);
  const target = cover * demand;
  const plan: CoverPlan = { active: hasTreasuryFloor(state), demand, capacity, target, takes: [] };
  let gap = target - capacity;
  if (!plan.active || demand <= 0 || gap < CTO_COMPUTE.slack * demand) return plan;
  const spot = spotPrice(state);
  for (const o of offerOrder(c.offers, c.phase)) {
    if (o.price >= spot || o.expiresWeek < state.clock.week) continue;
    const gpus = Math.min(o.gpus, Math.floor(gap / GPU_MARKET.sizeStep) * GPU_MARKET.sizeStep);
    if (gpus < GPU_MARKET.sizeStep) break;
    plan.takes.push({ offerId: o.id, gpus, price: o.price, termWeeks: o.termWeeks });
    gap -= gpus;
  }
  return plan;
}

/** The weekly routine: make the reservations the plan calls for. */
export function ctoCompute(state: GameState): void {
  const plan = computeCoverPlan(state, state.executives.computeCover);
  for (const t of plan.takes) rentGpus(state, t.offerId, t.gpus);
}
