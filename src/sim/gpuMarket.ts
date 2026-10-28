// The GPU market on the Compute floor (stage C4b, SIMULATION §13.0): GPU cloud
// providers offer reservations of rented GPUs at a fixed weekly price, a
// discount on today's spot price for locking in a term. Offers refresh every
// GPU_MARKET.refreshWeeks while you have the floor, counted like funding
// offers. Rented GPUs join your own data centers in covering office demand,
// and every active lot is billed to the compute line each week.
import { GPU_MARKET, SPOT } from '../config/balance';
import { GPU_LOT_TYPES, GPU_PROVIDERS, type GpuLotSpec } from '../data/gpuLots';
import { spotPrice } from './compute';
import { hasTreasuryFloor, offerCount } from './fundingMarket';
import { newId } from './ids';
import { noise, roundToStep } from './math';
import { stream } from './rng';
import type { GameState, GpuOffer } from './state';

/** Compute floor coverage k′ (1 while requirements don't apply). */
function floorCoverage(state: GameState): number {
  return state.hq.coverage.treasury?.kPrime ?? 1;
}

/** §13.0: the price per GPU-week a type would carry today, before noise. */
export function gpuLotPrice(state: GameState, spec: GpuLotSpec): number {
  const short = 1 - Math.min(1, floorCoverage(state));
  const stigma = state.compute.burstStigmaWeeks > 0 ? SPOT.stigmaMarkup : 0;
  return (
    spotPrice(state) *
    (1 - spec.discount) *
    (1 + GPU_MARKET.understaffedMarkup * short) *
    (1 + stigma)
  );
}

function generateOffer(state: GameState): GpuOffer {
  const rng = stream(state, 'gpuMarket');
  const spec = rng.pickWeighted(
    Object.values(GPU_LOT_TYPES).map((t) => ({ item: t, weight: t.weight })),
  );
  const [lo, hi] = spec.gpus;
  const scale = Math.max(1, state.compute.demandGpus / GPU_MARKET.sizeScale);
  const gpus = Math.max(
    GPU_MARKET.sizeStep,
    roundToStep(rng.range(lo, hi) * scale, GPU_MARKET.sizeStep),
  );
  return {
    id: newId(state, 'go'),
    type: spec.id,
    provider: rng.pick(GPU_PROVIDERS),
    gpus,
    price: gpuLotPrice(state, spec) * noise(rng, GPU_MARKET.priceNoise),
    termWeeks: spec.termWeeks,
    radar: [...spec.radar],
    expiresWeek: state.clock.week + GPU_MARKET.refreshWeeks,
  };
}

/** Tick step 6: regenerate GPU offers when due; none without the Compute floor. */
export function refreshGpuOffers(state: GameState): void {
  const c = state.compute;
  if (!hasTreasuryFloor(state)) {
    c.offers = [];
    c.offersRefreshWeek = -1;
    return;
  }
  if (c.offersRefreshWeek >= 0 && state.clock.week < c.offersRefreshWeek) return;
  const offers: GpuOffer[] = [];
  const n = offerCount(state);
  for (let i = 0; i < n; i++) offers.push(generateOffer(state));
  c.offers = offers;
  c.offersRefreshWeek = state.clock.week + GPU_MARKET.refreshWeeks;
}

/** GPUs in active lots. */
export function rentedGpus(state: GameState): number {
  return state.compute.lots.reduce((sum, l) => sum + l.gpus, 0);
}

/**
 * Tick step 4 (after settleCompute has billed this week's lots, C4c): retire
 * the lots whose last week this was. The tick runs as clock.week turns to the
 * next week, so a lot rented in week startWeek is billed at the ticks for
 * startWeek + 1 … endWeek: termWeeks times.
 */
export function retireGpuLots(state: GameState): void {
  const c = state.compute;
  const week = state.clock.week;
  c.lots = c.lots.filter((l) => l.endWeek > week);
  c.rentedGpus = rentedGpus(state);
}
