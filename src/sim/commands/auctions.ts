// Auction commands (SIMULATION §22, SCREENS §19, DESIGN §5.17): set or clear a
// max bid on a lot (bidding needs you in one of the house's cities), appraise a
// piece you own (from anywhere), and consign an appraised genuine piece to a
// house's next sale (at the house) or withdraw it again (from anywhere). Money
// is personal cash; nothing here touches the bank's books.
import { AUCTIONS } from '../../config/balance';
import { AUCTION_HOUSES } from '../../data/collectibles';
import { appraisalFee, itemName } from '../auctions';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const atHouse = (state: GameState, houseId: string): boolean =>
  !!AUCTION_HOUSES[houseId]?.cities.includes(state.world.currentCityId);

/** Sets (or changes) your max bid on a listed lot. Paid only if you win, at the sale. */
export function placeBid(
  state: GameState,
  houseId: string,
  lotId: string,
  maxBid: number,
): CommandResult {
  const house = state.auctions[houseId];
  const spec = AUCTION_HOUSES[houseId];
  if (!house || !spec) return fail('Unknown auction house.');
  if (!atHouse(state, houseId))
    return fail(
      `You need to be in ${spec.cities.length > 1 ? 'one of its cities' : 'its city'} to bid.`,
    );
  const lot = house.lots.find((l) => l.id === lotId);
  if (!lot || house.listedWeek === undefined) return fail('That lot is not in the next sale.');
  if (lot.consignedId) return fail("That's your own consignment.");
  if (!Number.isFinite(maxBid) || maxBid <= 0) return fail('Enter a max bid above zero.');
  lot.maxBid = maxBid;
  return ok();
}

/** Withdraws your bid on a lot (from anywhere). */
export function clearBid(state: GameState, houseId: string, lotId: string): CommandResult {
  const lot = state.auctions[houseId]?.lots.find((l) => l.id === lotId);
  if (!lot) return fail('That lot is not in the next sale.');
  if (lot.maxBid === undefined) return fail('You have no bid on that lot.');
  delete lot.maxBid;
  return ok();
}

/** Sends a piece for appraisal: the fee now, the verdict after AUCTIONS.appraiseWeeks. */
export function appraiseCollectible(
  state: GameState,
  collectibleId: string,
): CommandResult<{ fee: number; week: number }> {
  const c = state.personal.empire.collectibles.find((x) => x.id === collectibleId);
  if (!c) return fail("You don't own that piece.");
  if (c.appraised) return fail('That piece has already been appraised.');
  if (c.appraisalWeek !== undefined) return fail('That piece is already with the appraisers.');
  const fee = appraisalFee(c);
  if (state.personal.cash < fee) return fail(`The appraisal costs ${money(fee)} of personal cash.`);
  state.personal.cash -= fee;
  c.appraisalWeek = state.clock.week + AUCTIONS.appraiseWeeks;
  return ok({ fee, week: c.appraisalWeek });
}

/**
 * Consigns an appraised, genuine piece to this house's next sale (you must be
 * in one of its cities). Unappraised pieces must be appraised first.
 */
export function consignCollectible(
  state: GameState,
  collectibleId: string,
  houseId: string,
): CommandResult<{ week: number }> {
  const house = state.auctions[houseId];
  const spec = AUCTION_HOUSES[houseId];
  if (!house || !spec) return fail('Unknown auction house.');
  if (!atHouse(state, houseId)) return fail(`Consign at ${spec.name}, in one of its cities.`);
  const c = state.personal.empire.collectibles.find((x) => x.id === collectibleId);
  if (!c) return fail("You don't own that piece.");
  if (c.consignedTo) return fail(`It's already consigned to ${houseNameOf(c.consignedTo)}.`);
  if (c.appraisalWeek !== undefined) return fail('Wait for the appraisal to come back.');
  if (!c.appraised) return fail('The house only takes appraised pieces. Appraise it first.');
  if (!c.genuine) return fail("A counterfeit can't be consigned.");
  c.consignedTo = houseId;
  house.lots.push({
    id: `${houseId}-${house.nextWeek}-${c.id}`,
    itemId: c.itemId,
    estimate: c.value,
    genuine: true,
    consignedId: c.id,
  });
  return ok({ week: house.nextWeek });
}

/** Takes a consigned piece back out of its sale (from anywhere). */
export function withdrawConsignment(state: GameState, collectibleId: string): CommandResult {
  const c = state.personal.empire.collectibles.find((x) => x.id === collectibleId);
  if (!c?.consignedTo) return fail(`${c ? itemName(c.itemId) : 'That piece'} is not consigned.`);
  const house = state.auctions[c.consignedTo];
  if (house) house.lots = house.lots.filter((l) => l.consignedId !== c.id);
  delete c.consignedTo;
  return ok();
}

const houseNameOf = (houseId: string) => AUCTION_HOUSES[houseId]?.name ?? 'another house';
