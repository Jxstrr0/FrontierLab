// Timed effects left behind by incident choices (SIMULATION §23) and the small
// read hooks other systems call. An effect is active while the week is at or
// before its `untilWeek`, so "for 8 weeks" covers the next 8 weekly ticks.
//   rating        branch id or 'company'; target a rating category or 'overall'
//   closed        branch id: no customers served while it lasts
//   takeup        'company'; target a base product id (credit_card): take-up ×
//   incidentP     branch id or 'company'; target an incident type: probability ×
//   riskCoverage  'company': Risk coverage′ + value (capped at full coverage)
//   planCut       'company' or a city id: plan prices × (1 − value)
//   pulled        branch id; target a product id: not sold and earning nothing (DEEPFAKE)
//   gpuDerate     data center id: share of its GPUs out of action (DC_FIRE)
import { BANK_RUN } from '../../config/balance';
import type { RatingCategory } from '../../data/types';
import type { Branch, GameState, TimedEffect } from '../state';

export type EffectKind =
  | 'rating'
  | 'closed'
  | 'takeup'
  | 'incidentP'
  | 'riskCoverage'
  | 'planCut'
  | 'pulled'
  | 'gpuDerate';

/** Adds an effect lasting `weeks` weekly ticks from now. */
export function addEffect(
  state: GameState,
  kind: EffectKind,
  scope: string,
  value: number,
  weeks: number,
  target?: string,
): void {
  const e: TimedEffect = { kind, scope, value, untilWeek: state.clock.week + weeks };
  if (target !== undefined) e.target = target;
  state.incidents.effects.push(e);
}

function active(state: GameState, kind: EffectKind, scopes: string[], target?: string) {
  const week = state.clock.week;
  return state.incidents.effects.filter(
    (e) =>
      e.kind === kind &&
      e.untilWeek >= week &&
      scopes.includes(e.scope) &&
      (target === undefined || e.target === target),
  );
}

const sumOf = (list: TimedEffect[]) => list.reduce((s, e) => s + e.value, 0);
const productOf = (list: TimedEffect[]) => list.reduce((s, e) => s * e.value, 1);

/** Drops effects whose last week has passed (tick step 15). */
export function expireEffects(state: GameState): void {
  const week = state.clock.week;
  state.incidents.effects = state.incidents.effects.filter((e) => e.untilWeek > week);
}

/** Rating modifier for a branch category (or 'overall'): its own plus company-wide ones. */
export function ratingMod(
  state: GameState,
  branch: Branch,
  category: RatingCategory | 'overall',
): number {
  return sumOf(active(state, 'rating', [branch.id, 'company'], category));
}

/** True while an incident keeps the branch closed (§23: flood repairs, walkouts). */
export function isClosed(state: GameState, branchId: string): boolean {
  return active(state, 'closed', [branchId]).length > 0;
}

/** Take-up multiplier for a base product (card fraud freeze). */
export function takeupMult(state: GameState, baseProductId: string): number {
  return productOf(active(state, 'takeup', ['company'], baseProductId));
}

/** Probability multiplier for an incident type at a scope (firmware, forensic firm). */
export function incidentPMult(state: GameState, type: string, scope: string): number {
  return productOf(active(state, 'incidentP', [scope, 'company'], type));
}

/** Risk coverage′ bonus from hired consultants (REGULATOR_AUDIT). */
export function riskCoverageBonus(state: GameState): number {
  return sumOf(active(state, 'riskCoverage', ['company']));
}

/** Share taken off plan prices in a city (price-war match, bank-run price cut). */
export function planCut(state: GameState, cityId: string): number {
  return Math.min(1, sumOf(active(state, 'planCut', [cityId, 'company'])));
}

/** True while an incident has pulled a product from sale at a branch (DEEPFAKE). */
export function isPulled(state: GameState, branchId: string, productId: string): boolean {
  return active(state, 'pulled', [branchId], productId).length > 0;
}

/** Share of a data center's GPUs out of action after a fire (DC_FIRE), 0–1. */
export function gpuDerate(state: GameState, dataCenterId: string): number {
  return Math.min(1, sumOf(active(state, 'gpuDerate', [dataCenterId])));
}

/** Deposit churn multiplier during a bank run (§13.8). */
export function bankRunMult(state: GameState): number {
  return (state.incidents.bankRunWeeksLeft ?? 0) > 0 ? BANK_RUN.runMult : 1;
}
