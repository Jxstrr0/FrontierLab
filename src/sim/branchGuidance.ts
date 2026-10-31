// Sales office guidance (SIMULATION §17.2): the C-suite steers the office
// managers you've delegated to. The COO owns wages and staffing (staff
// morale), the CMO how hard managers market (brand awareness) and the CPO the
// lineup and fees (products rating). Each part is a whole step in
// GUIDANCE.min..max, moved one step every GUIDANCE.everyWeeks; a part whose
// delegation is off (or whose seat is empty) returns to 0. Managers still do
// the work with their own skills; guidance only shifts what they aim for. The
// CFO and CSO's deposit and loan steps, which no product used, went in schema 22.
import { cityAwareness } from './awareness';
import { GUIDANCE } from '../config/balance';
import { delegationOn } from './execSeats';
import { clamp } from './math';
import type { Branch, BranchGuidance, Delegation, GameState } from './state';

const step = (v: number, by: number) => clamp(v + by, GUIDANCE.min, GUIDANCE.max);

const ZERO: BranchGuidance = { staffing: 0, marketing: 0, products: 0 };

/** The guidance in force (zeros for saves without it). */
export function guidanceOf(state: GameState): BranchGuidance {
  const g = state.company.guidance;
  return { staffing: g?.staffing ?? 0, marketing: g?.marketing ?? 0, products: g?.products ?? 0 };
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
  const g = (state.company.guidance = state.company.guidance ?? { ...ZERO });
  const coo = delegationOn(state, 'coo', 'guidance');
  const cmo = delegationOn(state, 'cmo', 'guidance');
  const cpo = delegationOn(state, 'cpo', 'guidance');
  if (!coo) g.staffing = 0;
  if (!cmo) g.marketing = 0;
  if (!cpo) g.products = 0;
  if (state.clock.week % GUIDANCE.everyWeeks !== 0) return;
  if (coo) {
    const morale = mean(delegated(state, 'staffing').map((b) => b.staff.morale));
    g.staffing = nudge(g.staffing, morale, GUIDANCE.moraleLow, GUIDANCE.moraleHigh);
  }
  if (cmo) {
    const cities = [...new Set(delegated(state, 'marketing').map((b) => b.cityId))];
    const aware = mean(cities.map((c) => cityAwareness(state, c)));
    g.marketing = nudge(
      g.marketing,
      aware,
      state.executives.brandTarget - GUIDANCE.brandBand,
      state.executives.brandTarget + GUIDANCE.brandBand,
    );
  }
  if (cpo) {
    const rating = mean(delegated(state, 'products').map((b) => b.ratings.products));
    // At productsHigh or better the lineup is strong enough to charge a little more.
    if (rating !== null && rating < GUIDANCE.productsLow) g.products = step(g.products, 1);
    else if (rating !== null && rating >= GUIDANCE.productsHigh) g.products = step(g.products, -1);
  }
}
