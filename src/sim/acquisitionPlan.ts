// What buying a rival bank would do to your books (SIMULATION §19.8, §15).
// One plan feeds the offer sheet's regulator pre-check, the regulator's answer
// and the closing entries, so all three always agree.
//
// The target's branches bring deposits D and loans L; with its equity E, the
// cash it holds is R = D + E − L − X − LD, where X is corporate debt you owe it
// (settled on closing) and LD the lease deposits on its storefronts. If R would
// be negative the loans are marked down to fair value until it is zero, so the
// net assets you take on equal its book equity. You pay C in cash and give up
// any of its shares your company holds (V at market); goodwill = C + V − net
// assets, or a bargain gain when that is negative.
import { MERGERS, STOCK_RISK_WEIGHT } from '../config/balance';
import { ACQUIRED_LOAN_MIX } from '../data/mergers';
import { isDeposit, PRODUCTS } from '../data/products';
import { capitalSnapshot } from './capital';
import { companySharesOf, sharesToBuy } from './mergerPricing';
import { productSpec } from './products';
import { securityPrice } from './securities';
import type { GameState, RivalBank } from './state';

export interface CityShare {
  cityId: string;
  /** Your deposit share in the city after the deal, 0–1. */
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
  /** Market value of the company's holding given up, V. */
  holdingValue: number;
  deposits: number;
  /** Loans taken on after any fair-value markdown, L′. */
  loans: number;
  loanMarkdown: number;
  /** Fraction of each branch's loans kept (L′ / L). */
  loanFactor: number;
  reserves: number;
  leaseDeposits: number;
  /** Corporate debt you owe the target, settled on closing. */
  debtSettled: number;
  netAssets: number;
  goodwill: number;
  gain: number;
  /** Acquired loans by product (ACQUIRED_LOAN_MIX), for risk weights. */
  loansByProduct: Record<string, number>;
  proFormaCr: number;
  cityShares: CityShare[];
  /** City deposit share limit: MERGERS.maxCityShare, or fastTrackShare after a won Lobbying fast-track. */
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

/** Your branch deposit books in a city. */
export function yourDepositsIn(state: GameState, cityId: string): number {
  let total = 0;
  for (const b of Object.values(state.branches)) {
    if (b.cityId !== cityId) continue;
    for (const [pid, book] of Object.entries(b.books)) {
      const spec = productSpec(state, pid);
      if (spec && isDeposit(spec)) total += book.balance;
    }
  }
  return total;
}

/** Deposits of rivals still holding branches (not seized, acquired or merged) in a city. */
function rivalDepositsIn(state: GameState, cityId: string): number {
  let total = 0;
  for (const r of Object.values(state.rivals)) {
    if (r.status === 'seized' || r.status === 'acquired' || r.status === 'merged') continue;
    for (const b of r.branches) if (b.cityId === cityId) total += b.deposits;
  }
  return total;
}

/** Your deposit share in every city the target operates in, after the deal (§19.8). */
export function cityShares(state: GameState, bank: RivalBank): CityShare[] {
  const cities = [...new Set(bank.branches.map((b) => b.cityId))].sort();
  return cities.map((cityId) => {
    const mine = yourDepositsIn(state, cityId);
    const theirs = bank.branches
      .filter((b) => b.cityId === cityId)
      .reduce((s, b) => s + b.deposits, 0);
    const denom = mine + rivalDepositsIn(state, cityId);
    return { cityId, share: denom > 0 ? (mine + theirs) / denom : 1 };
  });
}

export function planDeal(state: GameState, bank: RivalBank, pricePerShare: number): DealPlan {
  const companyShares = companySharesOf(state, bank.id);
  const personalShares = Math.min(
    state.market.holdings.personal[bank.id]?.shares ?? 0,
    bank.shares - companyShares,
  );
  const shares = sharesToBuy(state, bank.id);
  const cash = pricePerShare * shares;
  const holdingValue = companyShares * securityPrice(state, bank.id);

  const deposits = bank.branches.reduce((s, b) => s + b.deposits, 0);
  const bookLoans = bank.branches.reduce((s, b) => s + b.loans, 0);
  const leaseDeposits = bank.branches.reduce(
    (s, b) => s + (state.world.lots[b.lotId]?.deposit ?? 0),
    0,
  );
  const debtSettled = debtOwedTo(state, bank.id);
  // Cash-like assets the target holds once its loans, our debt and lease deposits are counted.
  const available = deposits + bank.equity - debtSettled - leaseDeposits;
  const loans = Math.min(bookLoans, Math.max(0, available));
  const reserves = Math.max(0, available - loans);
  const netAssets = loans + reserves + leaseDeposits - deposits + debtSettled;
  const paid = cash + holdingValue;
  const goodwill = Math.max(0, paid - netAssets);
  const gain = Math.max(0, netAssets - paid);

  // Pro-forma capital (§15): CET1 = equity − goodwill − intangibles; cash and reserves carry no risk weight.
  const loansByProduct = splitByMix(loans, ACQUIRED_LOAN_MIX);
  let rwaAdded = -holdingValue * STOCK_RISK_WEIGHT;
  for (const [pid, amount] of Object.entries(loansByProduct)) {
    rwaAdded += amount * (PRODUCTS[pid]?.riskWeight ?? 1);
  }
  const snap = capitalSnapshot(state);
  const cet1 = snap.cet1 + gain - goodwill;
  const proFormaCr = cet1 / Math.max(1, snap.rwa + rwaAdded);

  return {
    rivalId: bank.id,
    distressed: bank.status === 'distressed',
    pricePerShare,
    shares,
    companyShares,
    personalShares,
    cash,
    holdingValue,
    deposits,
    loans,
    loanMarkdown: bookLoans - loans,
    loanFactor: bookLoans > 0 ? loans / bookLoans : 1,
    reserves,
    leaseDeposits,
    debtSettled,
    netAssets,
    goodwill,
    gain,
    loansByProduct,
    proFormaCr,
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
 * The regulator's two tests (§19.8): pro-forma CR and deposit share in every
 * affected city. A distressed sale skips the share test (the regulator wants
 * the failed network rescued), which the one row says.
 */
export function regulatorChecks(
  plan: DealPlan,
  cityName: (id: string) => string,
): RegulatorCheck[] {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const checks: RegulatorCheck[] = [
    {
      label: 'Capital after the deal',
      ok: plan.proFormaCr >= MERGERS.minProFormaCr,
      detail: `Pro-forma capital ratio ${pct(plan.proFormaCr)} (needs ${pct(MERGERS.minProFormaCr)})`,
    },
  ];
  if (plan.distressed && MERGERS.distressedShareExempt) {
    checks.push({
      label: 'Deposit share',
      ok: true,
      detail: 'Not tested for a distressed sale: the regulator wants the network rescued',
    });
    return checks;
  }
  for (const c of plan.cityShares) {
    checks.push({
      label: `Deposit share in ${cityName(c.cityId)}`,
      ok: c.share <= plan.shareLimit,
      detail: `${pct(c.share)} of the city's deposits (limit ${pct(plan.shareLimit)}${plan.fastTrack ? ', fast-tracked' : ''})`,
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
