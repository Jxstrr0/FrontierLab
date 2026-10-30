// Incidents (SIMULATION §23, CONTENT §22): weekly rolls, cooldowns, delegation
// (branch cases to a trusted manager, company and city cases to a COO trusted
// with Company troubles), deadlines and the timed effects choices leave behind, plus the bank-run clock
// (§13.8) and the regulator's letter (§15). Other systems raise incidents
// through `raiseIncident`; the player answers through commands/incidents.ts.
// Per-type rules live in src/sim/incident/ (bank-era branch and company rules,
// the AI-native aiRules and computeRules), numbers in src/data/incidentParams.ts.
import { BANK_RUN, EXEC_DELEGATION, FEATURES, INCIDENTS, type FeatureId } from '../config/balance';
import { INCIDENT_SPECS, type IncidentSpec } from '../data/incidents';
import { pushEvent } from './events';
import { delegationOn } from './execSeats';
import { newId } from './ids';
import { postCash, spend } from './ledger';
import { stream } from './rng';
import type { GameState, Incident, IncidentScopeKind } from './state';
import { AI_RULES } from './incident/aiRules';
import { BRANCH_RULES } from './incident/branchRules';
import { bankRunCondition, endBankRun, startBankRun } from './incident/capitalEvents';
import { COMPANY_RULES } from './incident/companyRules';
import { COMPUTE_RULES } from './incident/computeRules';
import { FOUNDER_RULES } from './incident/founderRules';
import { expireEffects } from './incident/effects';
import { scopeName, type IncidentRule } from './incident/helpers';
import { compactMoney, fillTemplate } from './incident/text';

const RULES: Record<string, IncidentRule> = {
  ...BRANCH_RULES,
  ...COMPANY_RULES,
  ...AI_RULES,
  ...COMPUTE_RULES,
  ...FOUNDER_RULES,
};

/** The feature flag each later ROADMAP stage switches on. */
const STAGE_FEATURE: Record<number, FeatureId> = {
  6: 'capitalMarkets',
  7: 'investments',
  8: 'multiCity',
  9: 'personalEmpire',
};

/** False for incidents whose systems arrive in a later stage (executives, dividends…). */
export function stageReady(spec: IncidentSpec): boolean {
  if (spec.stage === undefined) return true;
  const flag = STAGE_FEATURE[spec.stage];
  return flag !== undefined && FEATURES[flag];
}

/** True when a type has a rule (every CONTENT §22 incident does). */
export const hasRule = (type: string): boolean => RULES[type] !== undefined;

/** This week's chance of a rolled incident at a scope (0 when its condition fails). */
export function incidentChance(state: GameState, type: string, scope: string): number {
  return RULES[type]?.chance?.(state, scope) ?? 0;
}

const cooldownKey = (type: string, scope: string) => `${type}:${scope}`;

function onCooldown(state: GameState, type: string, scope: string): boolean {
  const until = state.incidents.cooldowns[cooldownKey(type, scope)];
  if (until !== undefined && until > state.clock.week) return true;
  return state.incidents.active.some((i) => i.type === type && i.scope === scope);
}

/**
 * Opens an incident of `type` for `scope` (branch id, city id, 'company' or
 * 'personal'), with amounts already rolled in `data`. Returns undefined when
 * the type is on cooldown for that scope (or its stage hasn't arrived). A
 * branch incident where "Branch troubles" is delegated is resolved at once.
 */
export function raiseIncident(
  state: GameState,
  type: string,
  scopeKind: IncidentScopeKind,
  scope: string,
  data: Record<string, number | string> = {},
): Incident | undefined {
  const spec = INCIDENT_SPECS[type];
  const rule = RULES[type];
  if (!spec || !rule || !stageReady(spec) || onCooldown(state, type, scope)) return undefined;
  const week = state.clock.week;
  const sym = state.settings.currency;
  const d = { ...data };
  if (scopeKind === 'branch') d.branch = state.branches[scope]?.name ?? 'the sales office';
  rule.prepare?.(state, scope, d);
  const costs = rule.costs(state, scope, d);
  // Cases with alternative texts pick one; the others read the same every time.
  const text = spec.texts ? stream(state, 'incidents').pick([spec.text, ...spec.texts]) : spec.text;
  d.text = fillTemplate(text, spec, d, sym);
  const inc: Incident = {
    id: newId(state, 'inc'),
    type,
    scopeKind,
    scope,
    createdWeek: week,
    deadlineWeek: week + INCIDENTS.deadlineWeeks,
    data: d,
    options: spec.options.map((o) => ({
      id: o.id,
      label: o.label,
      cost: Math.round(costs[o.id] ?? 0),
      effect: fillTemplate(o.effect, spec, d, sym),
    })),
  };
  const cooldown = spec.cooldownWeeks ?? INCIDENTS.cooldownWeeks;
  if (cooldown > 0) state.incidents.cooldowns[cooldownKey(type, scope)] = week + cooldown;
  state.incidents.active.push(inc);
  rule.onRaise?.(state, inc);
  pushEvent(
    state,
    'INCIDENT_RAISED',
    { incidentId: inc.id, type, scope, scopeName: scopeName(state, inc) },
    2,
    scope,
  );
  if (scopeKind === 'branch' && troublesDelegated(state, scope)) {
    resolveWith(state, inc, managerChoice(state, inc), 'manager');
  } else if (troublesDelegatedToCoo(state, spec)) {
    resolveWith(state, inc, executiveChoice(state, inc), 'executive');
  }
  return inc;
}

/** Rolls a type's amounts and raises it at once (debug tools and tests). */
export function forceIncident(state: GameState, type: string, scope: string): Incident | undefined {
  const spec = INCIDENT_SPECS[type];
  if (!spec) return undefined;
  const data = RULES[type]?.roll?.(state, scope, stream(state, 'incidents')) ?? {};
  return raiseIncident(state, type, spec.scope, scope, data);
}

/** True when the branch has a manager trusted with "Branch troubles" (§17.1). */
export function troublesDelegated(state: GameState, branchId: string): boolean {
  const b = state.branches[branchId];
  return !!b?.managerId && b.delegation.troubles;
}

/**
 * True when a seated COO trusted with "Company troubles" settles this kind of
 * case (§17.2): company and city scope, never one marked `yours`.
 */
export function troublesDelegatedToCoo(state: GameState, spec: IncidentSpec): boolean {
  if (spec.yours || (spec.scope !== 'company' && spec.scope !== 'city')) return false;
  return delegationOn(state, 'coo', 'troubles');
}

/** Why an option can't be chosen now: the rule's own reason, or the cash it needs. */
export function optionBlocker(
  state: GameState,
  inc: Incident,
  optionId: string,
): string | undefined {
  const opt = inc.options.find((o) => o.id === optionId);
  if (!opt) return 'That choice is no longer available.';
  const own = RULES[inc.type]?.blocked?.(state, inc, optionId);
  if (own) return own;
  if (opt.cost > 0 && opt.cost > state.company.cash)
    return `Needs ${compactMoney(opt.cost, state.settings.currency)} in corporate cash.`;
  return undefined;
}

/**
 * Pays the option's cost, applies its effects and closes the case. Returns the
 * outcome sentence for options with a chance in them (appeals, statements).
 */
export function resolveWith(
  state: GameState,
  inc: Incident,
  optionId: string,
  by: 'you' | 'manager' | 'executive' | 'deadline',
): string | undefined {
  const spec = INCIDENT_SPECS[inc.type]!;
  const rule = RULES[inc.type]!;
  const opt = inc.options.find((o) => o.id === optionId) ?? inc.options[0]!;
  const line = spec.options.find((o) => o.id === opt.id)?.line ?? 'incidents';
  if (opt.cost > 0) {
    if (line === 'capex') postCash(state, -opt.cost, 'investing');
    else spend(state, line, opt.cost);
  }
  state.incidents.active = state.incidents.active.filter((i) => i.id !== inc.id);
  const outcome = rule.apply(state, inc, opt.id, stream(state, 'incidents')) ?? undefined;
  pushEvent(
    state,
    'INCIDENT_RESOLVED',
    {
      incidentId: inc.id,
      type: inc.type,
      scope: inc.scope,
      scopeName: scopeName(state, inc),
      option: opt.label,
      by,
      cost: opt.cost,
    },
    by === 'you' ? 6 : 3,
    inc.scope,
  );
  return outcome;
}

/**
 * §17.1: the delegated manager picks the option with the best expected value:
 * up-front cost + chance of later costs + non-cash effects in weeks of branch
 * revenue, each scaled by 1 + normal(0, error × (1 − (People + Ethics)/200)).
 */
export function managerChoice(state: GameState, inc: Incident): string {
  const b = state.branches[inc.scope];
  const mgr = b?.managerId ? state.people.managers[b.managerId] : undefined;
  const weekly = Math.max(INCIDENTS.minWeeklyValue, b?.pnl.at(-1)?.revenue ?? 0);
  const skill = mgr ? (mgr.skills.people + mgr.skills.ethics) / 200 : 0;
  return bestOption(state, inc, weekly, INCIDENTS.managerError * (1 - skill));
}

/**
 * §17.2: the COO settles a company or city case the same way, valuing non-cash
 * effects in weeks of the company's revenue, with error shrinking with their
 * expertise.
 */
export function executiveChoice(state: GameState, inc: Incident): string {
  const coo = state.executives.seats.coo;
  const last = state.history.weekly.at(-1);
  const weekly = Math.max(INCIDENTS.minWeeklyValue, last?.revenue ?? 0);
  const skill = coo ? coo.expertise / 100 : 0;
  return bestOption(state, inc, weekly, EXEC_DELEGATION.troublesError * (1 - skill));
}

/** The option with the lowest noisy expected cost (shared by managers and the COO). */
function bestOption(state: GameState, inc: Incident, weekly: number, sd: number): string {
  const spec = INCIDENT_SPECS[inc.type]!;
  const rule = RULES[inc.type]!;
  const rng = stream(state, 'incidents');
  let best: string | undefined;
  let bestScore = Infinity;
  for (const opt of inc.options) {
    const os = spec.options.find((o) => o.id === opt.id);
    if (os?.managerSkips || rule.blocked?.(state, inc, opt.id)) continue;
    const ev =
      opt.cost + (rule.expected?.(state, inc, opt.id) ?? 0) + (os?.penaltyWeeks ?? 0) * weekly;
    const score = ev * (1 + rng.normal(0, sd));
    if (score < bestScore) {
      bestScore = score;
      best = opt.id;
    }
  }
  return best ?? spec.worst;
}

/** Tick step 15: effects and cooldowns expire, deadlines pass, runs tick, new cases roll. */
export function runIncidents(state: GameState): void {
  if (!FEATURES.competition || state.flags.gameOver) return;
  const week = state.clock.week;
  expireEffects(state);
  for (const [key, until] of Object.entries(state.incidents.cooldowns)) {
    if (until <= week) delete state.incidents.cooldowns[key];
  }
  for (const inc of [...state.incidents.active]) {
    if (inc.deadlineWeek <= week)
      resolveWith(state, inc, INCIDENT_SPECS[inc.type]!.worst, 'deadline');
  }
  if (state.flags.gameOver) return;
  tickBankRun(state);
  // §15: a letter on entering the Restricted band.
  if (state.company.tier === 'restricted' && state.company.tierWeeks === 0)
    raiseIncident(state, 'REGULATOR_LETTER', 'company', 'company');
  rollIncidents(state);
}

/** §13.8: a running bank run counts down; otherwise one may start. */
function tickBankRun(state: GameState): void {
  const left = state.incidents.bankRunWeeksLeft;
  if (left !== undefined) {
    if (left <= 1) endBankRun(state);
    else state.incidents.bankRunWeeksLeft = left - 1;
    return;
  }
  if (!bankRunCondition(state)) return;
  const rng = stream(state, 'incidents');
  if (!rng.chance(BANK_RUN.weeklyChance)) return;
  const weeks = rng.int(...BANK_RUN.weeks);
  if (raiseIncident(state, 'BANK_RUN', 'company', 'company')) startBankRun(state, weeks);
}

/** Rolls every weekly incident for each open branch and for the company. */
function rollIncidents(state: GameState): void {
  const rng = stream(state, 'incidents');
  const branches = Object.values(state.branches).filter((b) => b.status === 'open');
  for (const spec of Object.values(INCIDENT_SPECS)) {
    const rule = RULES[spec.id];
    if (spec.trigger !== 'rolled' || !rule?.chance || !stageReady(spec)) continue;
    const scopes =
      spec.scope === 'branch'
        ? branches.map((b) => b.id)
        : spec.scope === 'company'
          ? ['company']
          : [];
    for (const scope of scopes) {
      if (onCooldown(state, spec.id, scope)) continue;
      const p = rule.chance(state, scope);
      if (p <= 0 || !rng.chance(p)) continue;
      const data = rule.roll?.(state, scope, rng) ?? {};
      raiseIncident(state, spec.id, spec.scope, scope, data);
    }
  }
}
