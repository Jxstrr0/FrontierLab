// The Treasury funding market (SIMULATION §13.6): offers from wholesale
// counterparties, regenerated every two weeks while you have a Treasury floor.
// The count rises with Treasury coverage; rates carry the type's basis and
// spread, your rating spread and the Treasury shortfall penalty.
import {
  FUNDING_OFFERS,
  FUNDING_RATE_NOISE,
  FUNDING_REFRESH_WEEKS,
  FUNDING_SIZE,
} from '../config/balance';
import { COUNTERPARTIES, FUNDING_TYPES, type FundingTypeSpec } from '../data/fundingTypes';
import { totalDeposits } from './balanceSheet';
import { treasuryPenalty } from './hq';
import { newId } from './ids';
import { noise, roundToStep } from './math';
import { ftpLong } from './rates';
import { stream } from './rng';
import type { FundingOffer, GameState } from './state';
import { homeCountry, ratingSpread } from './treasury';

/** The funding market needs a Treasury floor, whatever its staffing (§16.4 gating). */
export function hasTreasuryFloor(state: GameState): boolean {
  return state.departments.treasury !== undefined;
}

/** Treasury coverage k′ (1 while requirements don't apply). */
function treasuryCoverage(state: GameState): number {
  return state.hq.coverage.treasury?.kPrime ?? 1;
}

/** §13.6: 2 + floor(3 × treasuryCoverage′) + (CFO expertise ≥ 70 ? 1 : 0). */
export function offerCount(state: GameState): number {
  const cfo = state.executives.seats.cfo;
  const cfoBonus =
    cfo && cfo.expertise >= FUNDING_OFFERS.cfoExpertise ? FUNDING_OFFERS.cfoBonus : 0;
  return (
    FUNDING_OFFERS.base +
    Math.floor(FUNDING_OFFERS.perCoverage * Math.min(1, treasuryCoverage(state))) +
    cfoBonus
  );
}

/** The rate a type would carry today before noise: basis + spread + rating spread + penalty. */
export function fundingRate(state: GameState, spec: FundingTypeSpec): number {
  const c = homeCountry(state);
  const basis = spec.basis === 'policy' ? c.policyRate : ftpLong(c);
  return basis + spec.spread + ratingSpread(state) + treasuryPenalty(state);
}

/** The most you can borrow from an offer now: all of it until it expires. */
export function maxBorrow(state: GameState, offer: FundingOffer): number {
  if (offer.expiresWeek < state.clock.week) return 0;
  return offer.amount;
}

function generateOffer(state: GameState): FundingOffer | undefined {
  const rng = stream(state, 'funding');
  const choices = Object.values(FUNDING_TYPES)
    .filter((t) => t.size && t.weight > 0)
    .map((t) => ({ item: t, weight: t.weight }));
  if (choices.length === 0) return undefined;
  const spec = rng.pickWeighted(choices);
  const [lo, hi] = spec.size!;
  const scale = Math.max(1, totalDeposits(state) / FUNDING_SIZE.scale);
  const raw = rng.range(lo, hi) * scale * noise(rng, FUNDING_SIZE.noise);
  const amount = Math.max(FUNDING_SIZE.amountStep, roundToStep(raw, FUNDING_SIZE.amountStep));
  const rate = fundingRate(state, spec) + rng.normal(0, FUNDING_RATE_NOISE);
  return {
    id: newId(state, 'fo'),
    type: spec.id,
    counterparty: rng.pick(COUNTERPARTIES),
    amount,
    rate,
    termWeeks: rng.int(spec.term[0], spec.term[1]),
    radar: [...spec.radar],
    expiresWeek: state.clock.week + FUNDING_REFRESH_WEEKS,
  };
}

/** Tick step 6 (after treasury flows): regenerate offers when due; none without the floor. */
export function refreshFundingOffers(state: GameState): void {
  const t = state.treasury;
  if (!hasTreasuryFloor(state)) {
    t.offers = [];
    t.offersRefreshWeek = -1;
    return;
  }
  if (t.offersRefreshWeek >= 0 && state.clock.week < t.offersRefreshWeek) return;
  const offers: FundingOffer[] = [];
  const n = offerCount(state);
  for (let i = 0; i < n; i++) {
    const offer = generateOffer(state);
    if (offer) offers.push(offer);
  }
  t.offers = offers;
  t.offersRefreshWeek = state.clock.week + FUNDING_REFRESH_WEEKS;
}
