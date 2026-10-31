// Travel commands (DESIGN §5.17): fly to any city or regional site, and buy or
// sell a private jet with personal cash. Arriving somewhere new generates it.
import { CITIES } from '../../data/cities';
import { JETS } from '../../data/jets';
import { pushEvent } from '../events';
import { cityOpen } from '../regions';
import { spend } from '../ledger';
import { listPrice } from '../nominal';
import type { GameState } from '../state';
import { flightQuote, jetResale } from '../travel';
import { generateCity, isGenerated } from '../worldGen';
import { fail, ok, type CommandResult } from './result';

/**
 * Flies to `cityId`. Inside the weekly allowance it's free; past it the fare
 * comes from personal cash and the bank covers any shortfall (never blocked).
 * `jet` flies your own plane instead, free within its range.
 */
export function travelTo(
  state: GameState,
  cityId: string,
  opts: { jet?: boolean } = {},
): CommandResult<{ km: number; mode: 'free' | 'fare' | 'jet'; fare: number }> {
  if (!CITIES[cityId]) return fail('Unknown destination.');
  if (!cityOpen(state, cityId)) return fail('That city is not open to AI labs yet.');
  const from = state.world.currentCityId;
  if (cityId === from) return fail("You're already here.");
  const q = flightQuote(state, cityId, opts.jet);
  if (opts.jet && q.mode !== 'jet') {
    return fail(state.personal.jet ? "That's beyond your jet's range." : "You don't own a jet.");
  }
  const t = state.world.travel;
  if (q.mode === 'free') t.kmThisWeek += q.km;
  if (q.mode === 'fare') {
    state.personal.cash -= q.personalPays;
    if (q.bankPays > 0) spend(state, 'travel', q.bankPays);
  }
  t.flights += 1;
  const firstVisit = !isGenerated(state, cityId);
  generateCity(state, cityId, { firstListings: true });
  state.world.currentCityId = cityId;
  pushEvent(state, 'FLIGHT_TAKEN', {
    from,
    to: cityId,
    km: q.km,
    mode: q.mode,
    fare: q.fare,
    bankPaid: q.bankPays,
    firstVisit,
  });
  return ok({ km: q.km, mode: q.mode, fare: q.fare });
}

/** Buys a private jet with personal cash (one at a time). */
export function buyJet(state: GameState, jetId: string): CommandResult {
  const spec = JETS[jetId];
  if (!spec) return fail('Unknown jet.');
  if (state.personal.jet) return fail('You already own a jet. Sell it first.');
  const price = listPrice(state, spec.price);
  if (state.personal.cash < price) return fail('Not enough personal cash.');
  state.personal.cash -= price;
  state.personal.jet = {
    model: spec.id,
    value: price,
    price,
    boughtWeek: state.clock.week,
  };
  pushEvent(state, 'JET_BOUGHT', { model: spec.name, price });
  return ok();
}

/** Sells the jet for its value less the resale haircut. */
export function sellJet(state: GameState): CommandResult<{ price: number }> {
  const jet = state.personal.jet;
  if (!jet) return fail("You don't own a jet.");
  const price = jetResale(state);
  state.personal.cash += price;
  delete state.personal.jet;
  pushEvent(state, 'JET_SOLD', { model: JETS[jet.model]?.name ?? jet.model, price });
  return ok({ price });
}
