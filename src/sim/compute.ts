// The compute pool (stage C4a, SIMULATION §13.0). A global compute price index
// follows a chip cycle (glut, normal, shortage) the way the macro phases move
// rates. Each office's compute bill is counted in GPU-weeks; GPUs running in
// your own data centers serve that demand first (their cost is the power bill
// and lease), and the rest is bought at spot: spotPerGpuWeek × index.
import { COMPUTE } from '../config/balance';
import { ema } from './math';
import { usableGpus } from './dataCenters';
import { stream } from './rng';
import type { ComputeState, GameState } from './state';

export function newComputeState(): ComputeState {
  return { index: 1, phase: 'normal', weeksInPhase: 0, demandGpus: 0, ownedGpus: 0, history: [] };
}

/** Spot price of one GPU-week today. */
export function spotPrice(state: GameState): number {
  return COMPUTE.spotPerGpuWeek * state.compute.index;
}

/** GPUs running in open data centers. */
export function ownedGpus(state: GameState): number {
  let gpus = 0;
  for (const dc of Object.values(state.dataCenters)) {
    if (dc.status === 'open') gpus += usableGpus(dc.build);
  }
  return gpus;
}

/** Share of last week's demand your own GPUs covered (0–1). */
export function ownedShare(state: GameState): number {
  const c = state.compute;
  if (c.demandGpus <= 0) return c.ownedGpus > 0 ? 1 : 0;
  return Math.min(1, c.ownedGpus / c.demandGpus);
}

/** Headroom: own capacity ÷ demand (C4b adds GPU lots). Null with no demand. */
export function headroom(state: GameState): number | null {
  const c = state.compute;
  return c.demandGpus > 0 ? c.ownedGpus / c.demandGpus : null;
}

/**
 * Multiplier from an office's compute at base prices to what it pays: only the
 * share your data centers didn't cover is bought, at the index. Uses last
 * week's pool, since this week's demand is known only once every office has run.
 */
export function computePriceFactor(state: GameState): number {
  return (1 - ownedShare(state)) * state.compute.index;
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
  for (const b of Object.values(state.branches)) {
    const row = b.pnl[b.pnl.length - 1];
    if (b.status === 'open' && row?.week === state.clock.week) demand += row.gpus ?? 0;
  }
  state.compute.demandGpus = demand;
  state.compute.ownedGpus = ownedGpus(state);
}
