// What buying a rival lab would do to your books (SIMULATION §19.8, §15).
// One plan feeds the offer sheet's regulator pre-check, the regulator's answer
// and the closing entries, so all three always agree.
//
// The target's customers move onto your plans with their ARR, and it brings
// cash R = K − X − LD, where K is its corporate cash, X corporate debt you owe
// it (settled on closing) and LD the lease deposits on its storefronts (floored
// at zero). The net assets you take on are R + LD + X. You pay C in cash and S
// in new shares (a listed lab's share-for-share part, shareDeals.ts) and give
// up any of its shares your company holds (V at market); goodwill = C + S + V −
// net assets, or a bargain gain when that is negative.
import { MERGERS, RUNWAY } from '../config/balance';
import { companySharesOf, sharesToBuy } from './mergerPricing';
import { rivalArr, rivalCustomers } from './rivalFinance';
import { runwayHealthy, runwaySnapshot, type RunwaySnapshot } from './runway';
import { securityPrice } from './securities';
import { stockSplit, type StockSplit } from './shareDeals';
import type { GameState, RivalBank } from './state';
import { rivalMult } from './rivalOffices';

export interface CityShare {
  cityId: string;
  /** Your customer share in the city after the deal, 0–1. */
  share: number;
}

export interface DealPlan {
  rivalId: string;
  /** A distressed sale (§18.5). */
  distressed: boolean;
  pricePerShare: number;
  /** Shares paid for (outstanding less the company's holding). */
  shares: number;
  companyShares: number;
  personalShares: number;
  /** Cash paid by the company, C (the personal holding's share goes to your own account). */
  cash: number;
  /** The share-for-share part (§19.8): S = split.stockValue, paid in new shares. */
  split: StockSplit;
  /** Cash paid for your own holding of the target, into your personal account. */
  personalCash: number;
  /** Market value of the company's holding given up, V. */
  holdingValue: number;
  /** The target's customers and the ARR they pay, which move onto your plans. */
  customers: number;
  arr: number;
  /** The target's cash after settling its debts to you and its lease deposits, R. */
  reserves: number;
  leaseDeposits: number;
  /** Corporate debt you owe the target, settled on closing. */
  debtSettled: number;
  netAssets: number;
  goodwill: number;
  gain: number;
  /** Runway once the cash price has left corporate cash (current burn). */
  proFormaRunway: RunwaySnapshot;
  cityShares: CityShare[];
  /** City customer share limit: MERGERS.maxCityShare, or fastTrackShare after a won Lobbying fast-track. */
  shareLimit: number;
  fastTrack: boolean;
}

/** Corporate debt you owe a rival: business loan balances plus a drawn line. */
export function debtOwedTo(state: GameState, rivalId: string): number {
  const d = state.corporateDebt;
  let total = d.lines[rivalId]?.drawn ?? 0;
  for (const loan of Object.values(d.loans)) if (loan.lenderId === rivalId) total += loan.balance;
  return total;
}

/** Splits an amount across a mix table. */
export function splitByMix(amount: number, mix: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [pid, share] of Object.entries(mix)) out[pid] = amount * share;
  return out;
}

/** Your customers in a city (open and converting offices). */
export function yourCustomersIn(state: GameState, cityId: string): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    if (b.cityId === cityId && b.status !== 'closed') total += b.customers;
  }
  return total;
}

/** Customers of rivals still holding offices (not seized, acquired or merged) in a city. */
function rivalCustomersIn(state: GameState, cityId: string): number {
  let total = 0;
  for (const r of Object.values(state.rivals)) {
    if (r.status === 'seized' || r.status === 'acquired' || r.status === 'merged') continue;
    for (const b of r.branches) if (b.cityId === cityId) total += b.customers;
  }
  return total;
}

/** Your customer share in every city the target operates in, after the deal (§19.8). */
export function cityShares(state: GameState, bank: RivalBank): CityShare[] {
  const cities = [...new Set(bank.branches.map((b) => b.cityId))].sort();
  return cities.map((cityId) => {
    const mine = yourCustomersIn(state, cityId);
    const theirs = bank.branches
      .filter((b) => b.cityId === cityId)
      .reduce((s, b) => s + b.customers, 0);
    const denom = mine + rivalCustomersIn(state, cityId);
    return { cityId, share: denom > 0 ? (mine + theirs) / denom : 1 };
  });
}

export function planDeal(
  state: GameState,
  bank: RivalBank,
  pricePerShare: number,
  stockPct = 0,
): DealPlan {
  const companyShares = companySharesOf(state, bank.id);
  const personalShares = Math.min(
    state.market.holdings.personal[bank.id]?.shares ?? 0,
    bank.shares - companyShares,
  );
  const shares = sharesToBuy(state, bank.id);
  const price = pricePerShare * shares;
  const personalValue = pricePerShare * personalShares;
  const split = stockSplit(state, price, personalValue, stockPct);
  const cash = price - split.stockValue;
  const personalCash = personalValue * (1 - split.stockPct);
  const holdingValue = companyShares * securityPrice(state, bank.id);

  const leaseDeposits = bank.branches.reduce(
    (s, b) => s + (state.world.lots[b.lotId]?.deposit ?? 0) * rivalMult(b),
    0,
  );
  const debtSettled = debtOwedTo(state, bank.id);
  // The cash the target brings once our debt to it and its lease deposits are counted.
  const reserves = Math.max(0, bank.cash - debtSettled - leaseDeposits);
  const netAssets = reserves + leaseDeposits + debtSettled;
  const paid = cash + split.stockValue + holdingValue;
  const goodwill = Math.max(0, paid - netAssets);
  const gain = Math.max(0, netAssets - paid);

  // Pro-forma runway (§15, §19.8): the cash price leaves corporate cash; the
  // target's cash goes to company cash, and its burn is not counted.
  const proFormaRunway = runwaySnapshot(state, -cash);

  return {
    rivalId: bank.id,
    distressed: bank.status === 'distressed',
    pricePerShare,
    shares,
    companyShares,
    personalShares,
    cash,
    split,
    personalCash,
    holdingValue,
    customers: rivalCustomers(bank),
    arr: rivalArr(bank),
    reserves,
    leaseDeposits,
    debtSettled,
    netAssets,
    goodwill,
    gain,
    proFormaRunway,
    cityShares: cityShares(state, bank),
    ...shareLimitFor(state),
  };
}

/** §19.8: the city share limit, relaxed for one deal by a won Lobbying "Fast-track a merger review". */
export function shareLimitFor(state: GameState): { shareLimit: number; fastTrack: boolean } {
  const fastTrack = state.lobbying?.fastTrack === true;
  return { shareLimit: fastTrack ? MERGERS.fastTrackShare : MERGERS.maxCityShare, fastTrack };
}

export interface RegulatorCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/**
 * The regulator's two tests (§19.8): runway after paying cash and customer share in every
 * affected city. A distressed sale skips the share test (the regulator wants
 * the failed network rescued), which the one row says.
 */
export function regulatorChecks(
  plan: DealPlan,
  cityName: (id: string) => string,
): RegulatorCheck[] {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const r = plan.proFormaRunway;
  const after = r.months === null ? 'no burn' : `${Math.floor(r.months)} months at today's burn`;
  const checks: RegulatorCheck[] = [
    {
      label: 'Runway after the deal',
      ok: runwayHealthy(r.tier),
      detail: `Runway after paying cash: ${after} (needs ${RUNWAY.gateMonths})`,
    },
  ];
  if (plan.distressed && MERGERS.distressedShareExempt) {
    checks.push({
      label: 'Customer share',
      ok: true,
      detail: 'Not tested for a distressed sale: the regulator wants the lab rescued',
    });
    return checks;
  }
  for (const c of plan.cityShares) {
    checks.push({
      label: `Customer share in ${cityName(c.cityId)}`,
      ok: c.share <= plan.shareLimit,
      detail: `${pct(c.share)} of the city's AI customers (limit ${pct(plan.shareLimit)}${plan.fastTrack ? ', fast-tracked' : ''})`,
    });
  }
  return checks;
}

/** The first regulator test that fails, as a reason sentence, or undefined. */
export function regulatorBlock(
  plan: DealPlan,
  cityName: (id: string) => string,
): string | undefined {
  const failed = regulatorChecks(plan, cityName).find((c) => !c.ok);
  return failed ? `${failed.label}: ${failed.detail}.` : undefined;
}
