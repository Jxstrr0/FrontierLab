// Compute commands (stage C4b, SIMULATION §13.0): renting GPUs from an offer
// on the Compute floor's GPU market. A lot can't be cancelled early.
import { GPU_MARKET } from '../../config/balance';
import { hasTreasuryFloor } from '../fundingMarket';
import { rentedGpus } from '../gpuMarket';
import { newId } from '../ids';
import type { GameState } from '../state';
import { fail, ok, type CommandResult } from './result';

/** Rents `gpus` from a GPU market offer at its fixed price for its whole term. */
export function rentGpus(
  state: GameState,
  offerId: string,
  gpus: number,
): CommandResult<{ lotId: string }> {
  if (!hasTreasuryFloor(state)) return fail('The GPU market needs a Compute floor at HQ.');
  const c = state.compute;
  const offer = c.offers.find((o) => o.id === offerId);
  if (!offer || offer.expiresWeek < state.clock.week)
    return fail('That offer is no longer available.');
  if (!Number.isFinite(gpus) || gpus < GPU_MARKET.sizeStep)
    return fail(`Rent at least ${GPU_MARKET.sizeStep} GPUs.`);
  if (gpus > offer.gpus) return fail(`This offer is for at most ${offer.gpus} GPUs.`);
  const lotId = newId(state, 'gl');
  c.lots.push({
    id: lotId,
    type: offer.type,
    provider: offer.provider,
    gpus,
    price: offer.price,
    startWeek: state.clock.week,
    endWeek: state.clock.week + offer.termWeeks,
    radar: [...offer.radar],
  });
  // Rented GPUs cover demand from this week's close.
  c.rentedGpus = rentedGpus(state);
  offer.gpus -= gpus;
  if (offer.gpus < GPU_MARKET.sizeStep) c.offers = c.offers.filter((o) => o.id !== offerId);
  return ok({ lotId });
}

/** Turns auto spot-buy (spot, then emergency burst) on or off (C4c). */
export function setAutoSpotBuy(state: GameState, on: boolean): CommandResult {
  state.compute.autoSpotBuy = on;
  return ok();
}
