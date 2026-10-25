// Branch guidance (SIMULATION §17.2): the C-suite steers the branch managers
// you've delegated to. The CFO owns deposit rates (liquidity), the CRO loan
// rates and approvals (capital and losses), the COO wages and staffing (staff
// morale), the CMO how hard managers market (brand awareness) and the CPO the
// lineup and fees (products rating). Each part is a whole step in
// GUIDANCE.min..max, moved one step every GUIDANCE.everyWeeks; a part whose
// delegation is off (or whose seat is empty) returns to 0. Managers still do
// the work with their own skills; guidance only shifts what they aim for.
import { EXEC_DELEGATION as X, GUIDANCE } from '../config/balance';
import { companyLossRate } from './riskFloor';
import { delegationOn } from './execSeats';
import { clamp } from './math';
import type { Branch, BranchGuidance, Delegation, GameState } from './state';

const step = (v: number, by: number) => clamp(v + by, GUIDANCE.min, GUIDANCE.max);

const ZERO: BranchGuidance = { deposits: 0, loans: 0, staffing: 0, marketing: 0, products: 0 };

/** The guidance in force (zeros for saves without it). */
export function guidanceOf(state: GameState): BranchGuidance {
  return { ...ZERO, ...state.company.guidance };
}

/** Rate offset a delegated manager adds to a deposit or loan rate. */
export function guidanceRateOffset(state: GameState, category: 'deposits' | 'loans'): number {
  const g = guidanceOf(state);
  return (category === 'deposits' ? g.deposits : g.loans) * GUIDANCE.rateStep;
}

/** Multiplier on the delegated Loan Desk's PD threshold: below 1 approves less. */
export function guidanceThresholdMult(state: GameState): number {
  return Math.max(0, 1 - GUIDANCE.thresholdStep * guidanceOf(state).loans);
}

/** COO: multipliers on a delegated manager's wage and staff target. */
export function guidanceStaffing(state: GameState): { wage: number; staff: number } {
  const g = guidanceOf(state).staffing;
  return { wage: 1 + GUIDANCE.wageStep * g, staff: 1 + GUIDANCE.staffStep * g };
}

/** CMO: multiplier on the value a delegated manager puts on awareness. */
export function guidanceMarketingMult(state: GameState): number {
  return Math.max(0, 1 + GUIDANCE.marketingStep * guidanceOf(state).marketing);
}

/** CPO: multipliers on delegated fee prices and on the lineup's affinity bar. */
export function guidanceProducts(state: GameState): { fee: number; affinity: number } {
  const g = guidanceOf(state).products;
  return {
    fee: 1 - GUIDANCE.feeStep * g,
    affinity: Math.max(0, 1 - GUIDANCE.affinityStep * g),
  };
}

/** Open branches whose manager runs `area`. */
function delegated(state: GameState, area: keyof Delegation): Branch[] {
  return Object.values(state.branches).filter(
    (b) => b.status === 'open' && b.managerId && b.delegation[area],
  );
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** One step up below `low`, down above `high`; nothing without a reading. */
function nudge(v: number, reading: number | null, low: number, high: number): number {
  if (reading === null) return v;
  if (reading < low) return step(v, 1);
  if (reading > high) return step(v, -1);
  return v;
}

/** Tick step 8, after the delegations: every part of the guidance. */
export function runBranchGuidance(state: GameState): void {
  const g = (state.company.guidance = guidanceOf(state));
  const cfo = delegationOn(state, 'cfo', 'guidance');
  const cro = delegationOn(state, 'cro', 'guidance');
  const coo = delegationOn(state, 'coo', 'guidance');
  const cmo = delegationOn(state, 'cmo', 'guidance');
  const cpo = delegationOn(state, 'cpo', 'guidance');
  if (!cfo) g.deposits = 0;
  if (!cro) g.loans = 0;
  if (!coo) g.staffing = 0;
  if (!cmo) g.marketing = 0;
  if (!cpo) g.products = 0;
  if (state.clock.week % GUIDANCE.everyWeeks !== 0) return;
  if (cfo) {
    const lr = state.company.liquidityRatio;
    const target = state.treasury.liqTarget;
    if (lr !== null && lr < target - GUIDANCE.liqLow) g.deposits = step(g.deposits, 1);
    else if (lr !== null && lr > target + GUIDANCE.liqHigh) g.deposits = step(g.deposits, -1);
  }
  if (cro) {
    // The CRO's appetite marks (§17.2): tighten on a miss, loosen when both are healthy.
    const cr = state.company.capitalRatio;
    const loss = companyLossRate(state);
    if (cr < X.croMinCr || loss > X.croMaxLoss) g.loans = step(g.loans, 1);
    else if (cr >= X.croRaiseCr && loss <= X.croRaiseLoss) g.loans = step(g.loans, -1);
  }
  if (coo) {
    const morale = mean(delegated(state, 'staffing').map((b) => b.staff.morale));
    g.staffing = nudge(g.staffing, morale, GUIDANCE.moraleLow, GUIDANCE.moraleHigh);
  }
  if (cmo) {
    const cities = [...new Set(delegated(state, 'marketing').map((b) => b.cityId))];
    const aware = mean(cities.map((c) => state.world.cities[c]?.brandAwareness ?? 0));
    g.marketing = nudge(
      g.marketing,
      aware,
      X.brandTarget - GUIDANCE.brandBand,
      X.brandTarget + GUIDANCE.brandBand,
    );
  }
  if (cpo) {
    const rating = mean(delegated(state, 'products').map((b) => b.ratings.products));
    // At productsHigh or better the lineup is strong enough to charge a little more.
    if (rating !== null && rating < GUIDANCE.productsLow) g.products = step(g.products, 1);
    else if (rating !== null && rating >= GUIDANCE.productsHigh) g.products = step(g.products, -1);
  }
}
