// The CREO's Buying switches (SIMULATION §17.2, §21.1): every
// EXEC_DELEGATION.buyEveryWeeks weeks each switch buys at most one listed
// building, in any city, at its asking price (which the seller always takes).
// It picks the listing with the best net yield (a year's rent less upkeep at
// the rent the chief would set, ÷ asking) that the budget allows:
//   bank: never at a restricted safety tier; its buildings stay under
//         buyAssetCap of total assets; the capital ratio stays at or above
//         buyMinCr after the purchase; expansionReserveWeeks of costs stay in cash
//   you:  keeps buyReserveYears of CEO salary; a building costs at most
//         buySpareShare of the cash above that
// nextPurchase is also what the CREO's profile shows.
import { EXEC_DELEGATION, PROPERTY_RISK_WEIGHT, WEEKS_PER_YEAR } from '../config/balance';
import { balanceSheet } from './balanceSheet';
import { capitalSnapshot } from './capital';
import { setPropertyRent } from './commands/realEstate';
import { ventureTierBlock } from './commands/ventures';
import { expansionReserve } from './execDelegationsGrowth';
import { delegationOn, rentPricingPower, rentsManaged } from './execSeats';
import { completePurchase } from './propertyBuy';
import { marketRentNow, occupancyTarget, propertyWeek, rentForOccupancy } from './propertyMath';
import type { GameState, Property } from './state';

type Owner = Property['owner'];

/** The CREO's Buying switch that buys for this owner. */
export const buysSwitch = (owner: Owner): string =>
  owner === 'company' ? 'bankBuys' : 'privateBuys';

export interface BuyPick {
  siteId: string;
  cityId: string;
  address: string;
  asking: number;
  value: number;
  /** Net yearly income ÷ asking at the rent the chief would set. */
  yield: number;
}

export type BuyPlan =
  { pick: BuyPick; blocker?: undefined } | { pick?: undefined; blocker: string };

/** The rent the CREO sets on a building of this owner: its occupancy dial, with pricing power. */
export function creoRent(state: GameState, owner: Owner, marketRent: number): number {
  return rentForOccupancy(
    marketRent,
    rentPricingPower(state, owner),
    state.executives.occTargets[owner],
  );
}

/** Every listing still open to an offer, best yield first, with a positive yield. */
function candidates(state: GameState, owner: Owner): BuyPick[] {
  const power = rentPricingPower(state, owner);
  const out: BuyPick[] = [];
  for (const l of Object.values(state.realEstate.listings)) {
    const site = state.world.sites[l.siteId];
    if (!site?.property || l.rejectedOffer !== undefined || state.realEstate.properties[l.siteId])
      continue;
    const marketRent = marketRentNow(state, site);
    const rent = creoRent(state, owner, marketRent);
    const occupancy = occupancyTarget(rent, marketRent, power);
    const net = propertyWeek({ sqm: site.property.sqm, rent, marketRent, occupancy }).net;
    const y = (net * WEEKS_PER_YEAR) / Math.max(1, l.asking);
    if (y <= 0) continue;
    out.push({
      siteId: l.siteId,
      cityId: site.cityId,
      address: site.address,
      asking: l.asking,
      value: l.estimate,
      yield: y,
    });
  }
  return out.sort((a, b) => b.yield - a.yield || a.siteId.localeCompare(b.siteId));
}

/** Why the bank can't buy `c` now, or undefined when it can. */
function bankBlocker(state: GameState, c: BuyPick): string | undefined {
  const d = EXEC_DELEGATION;
  const tier = ventureTierBlock(state);
  if (tier) return tier;
  if (c.asking > state.company.cash - expansionReserve(state))
    return 'Waiting for spare cash: the chief keeps 8 weeks of costs in reserve.';
  const bs = balanceSheet(state);
  if (bs.realEstate + c.value > d.buyAssetCap * bs.assets)
    return `The lab's buildings would pass ${Math.round(d.buyAssetCap * 100)}% of its assets.`;
  const snap = capitalSnapshot(state);
  // Cash (no risk weight) becomes a building booked at its value; the price gap hits equity.
  const crAfter =
    (snap.cet1 + c.value - c.asking) / Math.max(1, snap.rwa + c.value * PROPERTY_RISK_WEIGHT);
  if (crAfter < d.buyMinCr)
    return `The capital ratio would fall under ${Math.round(d.buyMinCr * 100)}%.`;
  return undefined;
}

/** The most the CREO may spend on one building of yours. */
export function personalBuyLimit(state: GameState): number {
  const d = EXEC_DELEGATION;
  const reserve = d.buyReserveYears * Math.max(0, state.governance.ceoSalary);
  return Math.max(0, state.personal.cash - reserve) * d.buySpareShare;
}

/** The building the CREO would buy for this owner now, or why it can't. */
export function nextPurchase(state: GameState, owner: Owner): BuyPlan {
  const list = candidates(state, owner);
  if (list.length === 0) return { blocker: 'No building for sale earns its keep right now.' };
  let first: string | undefined;
  for (const c of list) {
    const blocker =
      owner === 'company'
        ? bankBlocker(state, c)
        : c.asking > personalBuyLimit(state)
          ? 'Waiting for spare cash: the chief keeps a year of your salary and spends at most half the rest.'
          : undefined;
    if (!blocker) return { pick: c };
    first ??= blocker;
  }
  return { blocker: first! };
}

/** Buys the next pick for this owner, priced by the chief's Rents when they manage it. */
export function creoBuy(state: GameState, owner: Owner): BuyPick | undefined {
  const plan = nextPurchase(state, owner);
  if (!plan.pick) return undefined;
  completePurchase(state, plan.pick.siteId, plan.pick.asking, owner);
  const p = state.realEstate.properties[plan.pick.siteId]!;
  if (rentsManaged(state, owner))
    setPropertyRent(state, p.id, creoRent(state, owner, p.marketRent));
  return plan.pick;
}

/** True when this owner's Buying switch is on. */
export const buyingOn = (state: GameState, owner: Owner): boolean =>
  delegationOn(state, 'creo', buysSwitch(owner));

const due = (state: GameState): boolean => state.clock.week % EXEC_DELEGATION.buyEveryWeeks === 0;

/** Buying: for the bank. */
export function creoBankBuys(state: GameState): void {
  if (due(state)) creoBuy(state, 'company');
}

/** Buying: for you. */
export function creoPrivateBuys(state: GameState): void {
  if (due(state)) creoBuy(state, 'personal');
}
