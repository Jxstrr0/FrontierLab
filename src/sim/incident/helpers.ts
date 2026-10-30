// Shared pieces for incident rules: the rule interface, fraudShield, rating hits
// with their timed modifiers, morale bumps, the press-angle roll and the
// scope's display name.
import { FRAUD_SHIELD, INCIDENT_SCALE, INCIDENT_SIZE, INCIDENTS } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EQUIPMENT } from '../../data/equipment';
import type { RatingCategory } from '../../data/types';
import { companyArr } from '../arr';
import { dpow } from '../detmath';
import { pushEvent } from '../events';
import { clamp } from '../math';
import type { Rng } from '../rng';
import type { Branch, GameState, Incident } from '../state';
import { activeModel, RADAR } from '../underwriting';
import { addEffect } from './effects';

export type IncidentData = Record<string, number | string>;

/** How one incident type fires, what its options cost and what they do. */
export interface IncidentRule {
  /** Weekly chance at this scope (rolled types); 0 when its condition fails. */
  chance?(state: GameState, scope: string): number;
  /** Rolls the case's amounts (rolled types). */
  roll?(state: GameState, scope: string, rng: Rng): IncidentData;
  /** Adds derived numbers and preview tokens to the data when the case is raised. */
  prepare?(state: GameState, scope: string, data: IncidentData): void;
  /** Runs once when the case is raised (losses that already happened). */
  onRaise?(state: GameState, inc: Incident): void;
  /** Up-front cost of each option, fixed when the case is raised. */
  costs(state: GameState, scope: string, data: IncidentData): Record<string, number>;
  /** Why an option can't be chosen at all (affordability is checked separately). */
  blocked?(state: GameState, inc: Incident, optionId: string): string | undefined;
  /** Expected later cost of an option (chance of a fine), for a delegated manager. */
  expected?(state: GameState, inc: Incident, optionId: string): number;
  /** Applies the option after its cost is paid; may return an outcome sentence. */
  apply(state: GameState, inc: Incident, optionId: string, rng: Rng): string | void;
}

/** Flat company-incident costs × max(1, ARR ÷ refArr)^exp: a bigger lab pays more (post-C8). */
export function incidentScale(state: GameState): number {
  return dpow(Math.max(1, companyArr(state) / INCIDENT_SCALE.refArr), INCIDENT_SCALE.exp);
}

/** Customers across every open sales office. */
export function totalCustomers(state: GameState): number {
  return Object.values(state.branches).reduce(
    (s, b) => s + (b.status === 'open' ? b.customers : 0),
    0,
  );
}

/**
 * Company-wide cases grow with the lab (INCIDENT_SIZE, 2026-10-30):
 * clamp((customers ÷ ref)^exp, min, max), so a 5,000-customer founder rolls at
 * about 0.7× and a lab with hundreds of thousands at the cap.
 */
export function labSizeMult(state: GameState): number {
  const { refCustomers, exp, min, max } = INCIDENT_SIZE;
  return clamp(dpow(Math.max(1, totalCustomers(state)) / refCustomers, exp), min, max);
}

/** 0–10: IT coverage′, the AI model's Safety and the ATM (decision log). */
export function fraudShield(state: GameState, branch?: Branch): number {
  const it = Math.min(1, state.hq.coverage.it?.kPrime ?? 1);
  const model = activeModel(state).radar[RADAR.safety];
  const atm = branch ? (FRAUD_SHIELD.atmBonus[branch.build.atm] ?? 0) : 0;
  return clamp(
    FRAUD_SHIELD.itWeight * it + FRAUD_SHIELD.modelWeight * model + atm,
    0,
    FRAUD_SHIELD.max,
  );
}

/** The vault one tier up from the branch's, if any. */
export function nextVault(branch: Branch): string | undefined {
  const sec = EQUIPMENT[branch.build.vault]?.security ?? 0;
  const better = Object.values(EQUIPMENT)
    .filter((e) => e.slot === 'vault' && (e.security ?? 0) > sec)
    .sort((a, b) => (a.security ?? 0) - (b.security ?? 0));
  return better[0]?.id;
}

const openBranches = (state: GameState) =>
  Object.values(state.branches).filter((b) => b.status === 'open');

/**
 * A rating change for `weeks`: the displayed rating moves at once and its target
 * carries the modifier until the effect expires (ratings.ts reads ratingMod).
 * Scope is a branch id or 'company' (every open branch).
 */
export function ratingHit(
  state: GameState,
  scope: string,
  category: RatingCategory | 'overall',
  value: number,
  weeks: number,
): void {
  addEffect(state, 'rating', scope, value, weeks, category);
  const targets =
    scope === 'company' ? openBranches(state) : [state.branches[scope]].filter((b) => !!b);
  for (const b of targets) {
    b.ratings[category] = clamp(
      b.ratings[category] + value,
      INCIDENTS.ratingMin,
      INCIDENTS.ratingMax,
    );
  }
}

/** Instant morale change for a branch's staff (0–100). */
export function bumpMorale(branch: Branch, delta: number): void {
  branch.staff.morale = clamp(branch.staff.morale + delta, 0, INCIDENTS.moraleMax);
}

/** Chance an incident's press angle reaches The Weekly Ledger (INCIDENT_NEWS_{type} templates). */
export function maybeNews(
  state: GameState,
  chance: number,
  rng: { chance(p: number): boolean },
  type: string,
  branch?: Branch,
): void {
  if (!rng.chance(chance)) return;
  pushEvent(
    state,
    'INCIDENT_NEWS',
    { bank: state.meta.bankName, type, branchName: branch?.name ?? '', city: branch?.cityId ?? '' },
    3,
    branch?.id,
  );
}

/** Branch name, city name or the bank's name for an incident's scope. */
export function scopeName(state: GameState, inc: Pick<Incident, 'scopeKind' | 'scope'>): string {
  if (inc.scopeKind === 'branch') return state.branches[inc.scope]?.name ?? 'A sales office';
  if (inc.scopeKind === 'city') return CITIES[inc.scope]?.name ?? inc.scope;
  if (inc.scopeKind === 'personal') return state.meta.founderName;
  return state.meta.bankName;
}

/** Number data value (0 when missing). */
export const num = (data: IncidentData, key: string): number => {
  const v = data[key];
  return typeof v === 'number' ? v : 0;
};
