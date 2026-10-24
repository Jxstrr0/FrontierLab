// Rival branch books and weekly financials (SIMULATION §18.1, §18.5, simplified).
// Each branch's deposits move toward its mature size, trimmed by local
// competition (crowding and your strong branches nearby); loans follow at the
// rival's loan-to-deposit ratio. Earnings per branch are NIM on loans plus fees,
// less costs and expected losses; the bank accumulates the quarter, pays tax and
// tracks equity and its capital ratio.
import {
  DISTANCE_FALLOFF,
  RIVAL_BASE_LOSS_RATE,
  RIVAL_BOOK_EMA,
  RIVAL_BRANCH_COST,
  RIVAL_COMPETITION,
  RIVAL_FEE_YIELD,
  RIVAL_FINANCE,
  RIVAL_LDR,
  RIVAL_LDR_DEMAND_SLOPE,
  RIVAL_LOAN_RISK_WEIGHT,
  RIVAL_LOAN_YIELD_SPREAD,
  RIVAL_NIM_POLICY_SLOPE,
  RIVAL_RADIUS,
  RIVAL_RAMP_WEEKS,
  RIVAL_REVIEWS_PER_WEEK,
  RIVAL_SERVICING,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { COUNTRIES } from '../data/countries';
import { tileDistance } from './citygen';
import { creditCycle, loanDemand } from './macro';
import { clamp } from './math';
import { countryOfCity } from './rates';
import { matureDeposits } from './rivals';
import { priceWarBump } from './rivalPrices';
import type { GameState, Lot, RivalBank, RivalBranch } from './state';

/** Distance weight from the share formula: w = 1 / (1 + d / 6) (§9.3). */
const weight = (d: number) => 1 / (1 + d / DISTANCE_FALLOFF);

/**
 * Local competition factor on a rival branch's target (assumption, DESIGN §7):
 * crowding by every other branch within RIVAL_RADIUS, plus pressure from your
 * open branches nearby that win a strong share of prospects.
 */
export function competitionFactor(state: GameState, branch: RivalBranch): number {
  const lot = state.world.lots[branch.lotId];
  if (!lot) return 1;
  const c = RIVAL_COMPETITION;
  let crowd = 0;
  for (const rival of Object.values(state.rivals)) {
    if (rival.status !== 'active') continue;
    for (const rb of rival.branches) {
      if (rb.id === branch.id || rb.cityId !== branch.cityId) continue;
      crowd += nearWeight(lot, state.world.lots[rb.lotId]);
    }
  }
  let pressure = 0;
  for (const own of Object.values(state.branches)) {
    if (own.status !== 'open' || own.cityId !== branch.cityId) continue;
    const w = nearWeight(lot, state.world.lots[own.lotId]);
    crowd += w;
    pressure += w * Math.max(0, own.last.share - c.playerShareRef);
  }
  const crowding = 1 / (1 + c.crowdK * Math.max(0, crowd - c.crowdFree));
  return clamp(crowding - c.playerK * pressure, c.min, 1);
}

function nearWeight(a: Lot, b: Lot | undefined): number {
  if (!b) return 0;
  const d = tileDistance(a, b);
  return d <= RIVAL_RADIUS ? weight(d) : 0;
}

/**
 * Share of mature size a branch opened after the start has reached: a concave
 * ramp, 1 − (1 − age/156)^3, so it grows fastest early like yours (§25: about
 * 70% by week 52) and is mature at 156 weeks (§18.1).
 */
export function rampShare(age: number): number {
  const left = 1 - Math.min(1, Math.max(0, age) / RIVAL_RAMP_WEEKS);
  return 1 - left * left * left;
}

/** Deposits move toward target × ramp; loans follow at the LDR (§18.1). */
export function updateBranchBooks(state: GameState, branch: RivalBranch): void {
  const c = countryOfCity(state, branch.cityId);
  const age = state.clock.week - branch.openedWeek;
  const ramp = branch.openedWeek > 0 ? rampShare(age) : 1;
  const target = matureDeposits(branch) * competitionFactor(state, branch) * ramp;
  branch.deposits += RIVAL_BOOK_EMA * (target - branch.deposits);
  const ldr = RIVAL_LDR * (1 + RIVAL_LDR_DEMAND_SLOPE * (loanDemand(c) - 1));
  branch.loans = branch.deposits * ldr;
  branch.reviewCount += RIVAL_REVIEWS_PER_WEEK;
}

export interface BranchEarnings {
  revenue: number;
  contribution: number;
}

/** One branch's week: NIM_city × loans + fees − costs − expected losses (§18.5). */
export function branchEarnings(
  state: GameState,
  bank: RivalBank,
  branch: RivalBranch,
): BranchEarnings {
  const c = countryOfCity(state, branch.cityId);
  const f = RIVAL_FINANCE[bank.strategy];
  const neutral = COUNTRIES[c.id].neutral;
  // Price-war bumps raise what the rival pays savers, squeezing its margin.
  const bump = priceWarBump(bank);
  const nim =
    f.nim +
    RIVAL_NIM_POLICY_SLOPE * (c.policyRate - neutral) -
    (bump * branch.deposits) / Math.max(1, branch.loans);
  const costIndex = CITIES[branch.cityId]?.costIndex ?? 1;
  const fees = (branch.deposits * RIVAL_FEE_YIELD * f.feeMult) / WEEKS_PER_YEAR;
  const costs =
    RIVAL_BRANCH_COST * costIndex * f.costMult +
    (branch.deposits * RIVAL_SERVICING) / WEEKS_PER_YEAR;
  const lossRate = RIVAL_BASE_LOSS_RATE * f.lossMult * (1 + f.cycleSens * (creditCycle(c) - 1));
  const losses = (branch.loans * Math.max(0, lossRate)) / WEEKS_PER_YEAR;
  const nii = (branch.loans * nim) / WEEKS_PER_YEAR;
  const revenue = (branch.loans * (c.policyRate + RIVAL_LOAN_YIELD_SPREAD)) / WEEKS_PER_YEAR + fees;
  return { revenue, contribution: nii + fees - costs - losses };
}

/** Total loans across a rival's branches. */
export function rivalLoans(bank: RivalBank): number {
  return bank.branches.reduce((sum, b) => sum + b.loans, 0);
}

export function rivalCapitalRatio(bank: RivalBank): number {
  const rwa = rivalLoans(bank) * RIVAL_LOAN_RISK_WEIGHT;
  return rwa > 0 ? bank.equity / rwa : 0;
}

/** Weekly books and financials for every active rival (tick step 3). */
export function runRivalFinancials(state: GameState): void {
  for (const bank of Object.values(state.rivals)) {
    if (bank.status !== 'active') continue;
    let revenue = 0;
    let preTax = 0;
    for (const branch of bank.branches) {
      updateBranchBooks(state, branch);
      const e = branchEarnings(state, bank, branch);
      branch.contribution = e.contribution;
      revenue += e.revenue;
      preTax += e.contribution;
    }
    const home = bank.cities[0];
    const taxRate = home ? COUNTRIES[countryOfCity(state, home).id].corpTax : 0;
    const netIncome = preTax > 0 ? preTax * (1 - taxRate) : preTax;
    bank.qtd.revenue += revenue;
    bank.qtd.netIncome += netIncome;
    bank.equity += netIncome;
    bank.capitalRatio = rivalCapitalRatio(bank);
  }
}
