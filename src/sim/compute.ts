// The compute pool (stage C4a, SIMULATION §13.0). A global compute price index
// follows a chip cycle (glut, normal, shortage) the way the macro phases move
// rates. Each office's compute bill is counted in GPU-weeks; GPUs running in
// your own data centers serve that demand first (their cost is the power bill
// and lease), and the rest is bought at spot: spotPerGpuWeek × index.
import { COMPUTE, OUTAGE, SPOT } from '../config/balance';
import { ema } from './math';
import { runningGpus } from './dataCenters';
import { dealGpus } from './powerDeals';
import { projectGpus } from './projects';
import { pushEvent } from './events';
import { spend } from './ledger';
import { stream } from './rng';
import type { ComputeState, GameState } from './state';

export function newComputeState(): ComputeState {
  return {
    index: 1,
    phase: 'normal',
    weeksInPhase: 0,
    demandGpus: 0,
    ownedGpus: 0,
    history: [],
    rentedGpus: 0,
    lots: [],
    offers: [],
    offersRefreshWeek: -1,
    autoSpotBuy: true,
    spotTrail: 0,
    crunchWeeks: 0,
    outageWeeksLeft: 0,
    burstStigmaWeeks: 0,
    weekCharge: 0,
    weekCost: 0,
  };
}

/** Spot price of one GPU-week today. */
export function spotPrice(state: GameState): number {
  return COMPUTE.spotPerGpuWeek * state.compute.index;
}

/** GPUs you own: running in open data centers, plus power-deal and campus GPUs. */
export function ownedGpus(state: GameState): number {
  let gpus = 0;
  for (const dc of Object.values(state.dataCenters)) {
    if (dc.status === 'open') gpus += runningGpus(state, dc);
  }
  // Contracted GPUs from power deals at energy sites (C8a, §13.7a), and a
  // finished Gigawatt Campus (§16.14).
  return gpus + dealGpus(state) + projectGpus(state);
}

/** GPUs you have outside the spot market: data centers plus rented lots. */
export function capacityGpus(state: GameState): number {
  return state.compute.ownedGpus + state.compute.rentedGpus;
}

/** Share of last week's demand your data centers and GPU lots cover (0–1). */
export function ownedShare(state: GameState): number {
  const c = state.compute;
  const cap = capacityGpus(state);
  if (c.demandGpus <= 0) return cap > 0 ? 1 : 0;
  return Math.min(1, cap / c.demandGpus);
}

/** Headroom: (data-center + rented GPUs) ÷ demand. Null with no demand. */
export function headroom(state: GameState): number | null {
  const c = state.compute;
  return c.demandGpus > 0 ? capacityGpus(state) / c.demandGpus : null;
}

/** §13.0 (C4c): the most GPUs the clouds sell you at spot this week. */
export function spotLimit(state: GameState): number {
  const c = state.compute;
  const trailLimit = SPOT.baseGpus + SPOT.trailMult * c.spotTrail;
  return Math.min(trailLimit, SPOT.maxGpus) * SPOT.phaseMult[c.phase];
}

/** How last week's demand is met: own and rented GPUs, then spot, burst, and the unserved rest. */
export interface ComputeAllocation {
  demand: number;
  capacity: number;
  spot: number;
  burst: number;
  short: number;
  spotLimit: number;
  burstLimit: number;
}

export function allocation(state: GameState): ComputeAllocation {
  const c = state.compute;
  const capacity = capacityGpus(state);
  const gap = Math.max(0, c.demandGpus - capacity);
  const sLimit = spotLimit(state);
  const bLimit = SPOT.burstShare * sLimit;
  const spot = c.autoSpotBuy ? Math.min(gap, sLimit) : 0;
  const burst = c.autoSpotBuy ? Math.min(gap - spot, bLimit) : 0;
  return {
    demand: c.demandGpus,
    capacity,
    spot,
    burst,
    short: gap - spot - burst,
    spotLimit: sLimit,
    burstLimit: bLimit,
  };
}

/** Capacity crunch: unserved demand above SPOT.crunchFrom puts new sign-ups on a waitlist. */
export function waitlisted(state: GameState): boolean {
  const a = allocation(state);
  return a.demand > 0 && a.short / a.demand > SPOT.crunchFrom;
}

/** Churn multiplier while an outage runs. */
export function outageChurnMult(state: GameState): number {
  return state.compute.outageWeeksLeft > 0 ? OUTAGE.churnMult : 1;
}

/**
 * Multiplier from an office's compute at base prices to its internal charge
 * (C4c, like funds transfer pricing): every GPU-week at today's spot index,
 * wherever it really came from.
 */
export function internalComputePrice(state: GameState): number {
  return state.compute.index;
}

/** What spot and burst GPUs cost this week, at the index (burst at its premium). */
export function spotCost(state: GameState, a: ComputeAllocation = allocation(state)): number {
  return (a.spot + a.burst * SPOT.burstPremium) * spotPrice(state);
}

/** Weekly bill of every active GPU lot. */
export function lotsWeeklyCost(state: GameState): number {
  return state.compute.lots.reduce((sum, l) => sum + l.gpus * l.price, 0);
}

/**
 * Pool cost as a multiple of spot (C4c): what the lab pays for the GPUs it
 * buys and rents, per GPU-week of demand, against the internal price. Below
 * 1 the pool is saving money; data-center costs are on their own lines.
 */
export function poolCostFactor(state: GameState): number {
  const c = state.compute;
  if (c.weekCharge <= 0) return 0;
  return c.weekCost / c.weekCharge;
}

/** Tick step 1 (after the macro): the chip cycle moves the index. */
export function updateComputeIndex(state: GameState): void {
  const c = state.compute;
  const rng = stream(state, 'compute');
  c.weeksInPhase += 1;
  if (c.weeksInPhase >= COMPUTE.minPhaseWeeks) {
    let roll = rng.next();
    for (const tr of COMPUTE.transitions[c.phase]) {
      roll -= tr.p;
      if (roll < 0) {
        c.phase = tr.to;
        c.weeksInPhase = 0;
        break;
      }
    }
  }
  const [lo, hi] = COMPUTE.clamp;
  const next = ema(c.index, COMPUTE.targets[c.phase], COMPUTE.ema) + rng.normal(0, COMPUTE.sigma);
  c.index = Math.min(hi, Math.max(lo, next));
  c.history.push(c.index);
  if (c.history.length > COMPUTE.historyWeeks)
    c.history.splice(0, c.history.length - COMPUTE.historyWeeks);
}

/** Tick step 4 (after the offices): this week's demand and running GPUs, for next week's prices. */
export function tallyCompute(state: GameState): void {
  let demand = 0;
  let charged = 0;
  for (const b of Object.values(state.branches)) {
    const row = b.pnl[b.pnl.length - 1];
    if (row?.week !== state.clock.week) continue;
    charged += row.lines.compute;
    if (b.status === 'open') demand += row.gpus ?? 0;
  }
  state.compute.demandGpus = demand;
  state.compute.weekCharge = charged;
  state.compute.ownedGpus = ownedGpus(state);
  // DESIGN §5.18: weeks in a row that owned GPUs alone covered every GPU-week of demand.
  const c = state.compute;
  c.ownedStreak = demand > 0 && c.ownedGpus >= demand ? (c.ownedStreak ?? 0) + 1 : 0;
}

/**
 * Tick step 4 (after the tally, C4c): with this week's demand, pay for the spot
 * and burst GPUs and the active lots, booking the gap to the offices' internal
 * charges on the compute line; then update the spot trail, burst stigma,
 * capacity crunch and outages.
 */
export function settleCompute(state: GameState): void {
  const c = state.compute;
  const a = allocation(state);
  const bank = state.meta.bankName;
  c.weekCost = spotCost(state, a) + lotsWeeklyCost(state);
  spend(state, 'compute', c.weekCost - c.weekCharge);
  c.spotTrail = ema(c.spotTrail, a.spot + a.burst, SPOT.trailEma);
  if (a.burst > 0) {
    if (c.burstStigmaWeeks <= 0) pushEvent(state, 'COMPUTE_BURST', { bank, gpus: a.burst }, 2);
    c.burstStigmaWeeks = SPOT.stigmaWeeks;
  } else if (c.burstStigmaWeeks > 0) c.burstStigmaWeeks -= 1;

  if (waitlisted(state)) {
    if (c.crunchWeeks === 0) pushEvent(state, 'COMPUTE_CRUNCH', { bank }, 1);
    c.crunchWeeks += 1;
  } else if (c.crunchWeeks > 0) {
    c.crunchWeeks = 0;
    pushEvent(state, 'COMPUTE_CRUNCH_ENDED', { bank }, 2);
  }
  if (c.crunchWeeks >= OUTAGE.afterWeeks) {
    if (c.outageWeeksLeft <= 0) pushEvent(state, 'COMPUTE_OUTAGE', { bank }, 1);
    c.outageWeeksLeft = OUTAGE.weeks;
  } else if (c.outageWeeksLeft > 0) c.outageWeeksLeft -= 1;
}
