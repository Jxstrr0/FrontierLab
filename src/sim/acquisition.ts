// Closing an acquisition (SIMULATION §19.8): the entries that merge a rival's
// books into yours, keeping the balance identity. With the plan from
// acquisitionPlan.ts:
//   assets      −C (cash) −V (holding given up) +G (goodwill) +R (reserves)
//               +LD (lease deposits)
//   liabilities −X (corporate debt you owed the target)
//   equity      +S (new shares in a share-for-share deal) +gain (bargain purchase,
//               non-cash P&L), since G − gain = C + S + V − net assets.
// Then the target's branches become yours (acquisitionBranch.ts), converting
// over MERGERS.conversionWeeks, and the rival leaves the market.
import { MERGERS } from '../config/balance';
import type { DealPlan } from './acquisitionPlan';
import { convertRivalBranch } from './acquisitionBranch';
import { foldIntoOffice } from './branch/officeMerge';
import { pushEvent } from './events';
import { issueDealShares } from './shareDeals';
import { postCash, postPnl } from './ledger';
import type { Rng } from './rng';
import type { GameState, RivalBank } from './state';

/** Settles corporate debt owed to the target and drops its loan offers. */
function settleDebt(state: GameState, rivalId: string): void {
  const d = state.corporateDebt;
  delete d.lines[rivalId];
  for (const loan of Object.values(d.loans)) if (loan.lenderId === rivalId) delete d.loans[loan.id];
  d.offers = d.offers.filter((o) => o.lenderId !== rivalId);
}

/** Pays out every holder of the target's shares and books the price, goodwill or gain. */
function payForShares(state: GameState, bank: RivalBank, plan: DealPlan): void {
  postCash(state, -plan.cash, 'investing');
  // Your own shares in the target are bought like everyone else's, into your personal account
  // (in the deal's mix of cash and new shares).
  state.personal.cash += plan.personalCash;
  issueDealShares(state, plan.split);
  delete state.market.holdings.personal[bank.id];
  // The company's holding is given up at market instead of being paid for again.
  delete state.market.holdings.company[bank.id];
  state.company.goodwill += plan.goodwill;
  if (plan.gain > 0) postPnl(state, 'acquisitionGain', plan.gain);
}

/** Closes the deal: books, branches, integration record, events. Returns the new branch ids. */
export function closeAcquisition(
  state: GameState,
  bank: RivalBank,
  plan: DealPlan,
  rng: Rng,
): string[] {
  payForShares(state, bank, plan);
  settleDebt(state, bank.id);
  // A won Lobbying fast-track covers one deal (§19.8).
  if (state.lobbying?.fastTrack) delete state.lobbying.fastTrack;
  // The target's cash (and the loans' fair-value markdown, if any) arrives as reserves.
  state.treasury.reserves += plan.reserves;
  state.company.leaseDeposits += plan.leaseDeposits;

  const converted = bank.branches.map((rb) => convertRivalBranch(state, bank, rb, rng));
  // One office per city (C2a): in each city the acquired branches join your
  // office there, or the biggest of them becomes your office.
  const byCity = new Map<string, string[]>();
  for (const id of converted) {
    const cityId = state.branches[id]!.cityId;
    byCity.set(cityId, [...(byCity.get(cityId) ?? []), id]);
  }
  for (const [cityId, ids] of byCity) {
    const own = Object.values(state.branches).find(
      (b) => b.cityId === cityId && b.status !== 'closed' && !converted.includes(b.id),
    );
    const ranked = ids
      .map((id) => state.branches[id]!)
      .sort((a, b) => b.customers - a.customers || (a.id < b.id ? -1 : 1));
    const keeper = own ?? ranked[0]!;
    for (const b of ranked) if (b !== keeper) foldIntoOffice(state, keeper, b);
  }
  const branchIds = converted.filter((id) => state.branches[id]);

  for (const site of Object.values(state.world.sites)) {
    if (site.employer?.partnerRivalId === bank.id) delete site.employer.partnerRivalId;
  }
  const n = bank.branches.length;
  bank.branches = [];
  bank.status = 'acquired';
  bank.priceWar = {};
  bank.priceLags = {};
  delete bank.distressedUntil;
  delete bank.distressedAsk;

  const distressed = plan.distressed;
  state.mergers.integrations.push({
    rivalId: bank.id,
    name: bank.name,
    branchIds,
    startWeek: state.clock.week,
    weeksLeft: MERGERS.conversionWeeks,
  });
  const price = plan.cash + plan.split.stockValue + plan.holdingValue;
  state.mergers.deals.push({
    rivalId: bank.id,
    name: bank.name,
    week: state.clock.week,
    price,
    goodwill: plan.goodwill,
    branches: n,
    distressed,
    ...(plan.split.stockValue > 0 ? { stockValue: plan.split.stockValue } : {}),
  });
  pushEvent(
    state,
    'ACQUISITION_CLOSED',
    {
      rivalId: bank.id,
      bank: bank.name,
      buyer: state.meta.bankName,
      price,
      branches: n,
      goodwill: plan.goodwill,
      distressed,
      stockPct: plan.split.stockPct,
    },
    9,
  );
  return branchIds;
}
