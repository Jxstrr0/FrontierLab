// Executive delegations for money and products (SIMULATION §17.2 table), each a
// small weekly routine that only uses the player's own commands:
//   CPO  pricing       prices the company lineup like a delegated manager (§17.1)
//                      while Apply-to-all is on
//   CPO  developments  starts the next undeveloped template when none is running, on a
//                      weekly budget of at most 1% of weekly revenue; the product
//                      focus dial (executives.devFocus) says which category first
//   CPO  models        switches to the model whose quality, less its licence cost,
//                      beats the one in use by a margin: a data-vendor package (C6a)
//                      from any city where the lab has an office, since the CPO
//                      travels for you, or a model you have trained (the CPO's
//                      Routine training runs leave the switch to this routine)
//   CTO  digital       starts the next digital project when no development is running
// The CFO's halved statement delay is passive (hq.ts); the dividend proposal is a
// selector the board meeting reads (governance.ts).
import {
  DEV_BUDGET_STEP,
  DEV_MIN_WEEKLY,
  EXEC_DELEGATION as X,
  MODEL_DELEGATE,
} from '../config/balance';
import { BUREAU_PACKAGES } from '../data/bureaus';
import { DEV_TEMPLATES, isDigital, type DevTemplate } from '../data/devTemplates';
import { CITIES } from '../data/cities';
import type { CountryId } from '../data/types';
import { delegatedPrice } from './branch/delegation';
import { startDevelopment } from './commands/development';
import { setCompanyPrice } from './commands/products';
import { activateModel, buyBureauModel, reachableBureaus } from './commands/underwriting';
import { PRODUCTS } from '../data/products';
import type { DevFocus } from './marketsTypes';
import { allProducts } from './products';
import { stream } from './rng';
import type { Branch, GameState } from './state';
import { activeModel, mixRadar, modelQuality } from './underwriting';

/** Average weekly revenue over the last few closes (interest + fee income). */
export function weeklyRevenue(state: GameState): number {
  const recent = state.history.weekly.slice(-X.revenueWeeks);
  if (recent.length === 0) return 0;
  return recent.reduce((s, w) => s + w.revenue, 0) / recent.length;
}

// ─── CPO ──────────────────────────────────────────────────────────────────────

/**
 * Pricing: each country's company prices set like a delegated manager's, from
 * that country's first open branch's market.
 */
export function cpoPricing(state: GameState): void {
  const cpo = state.executives.seats.cpo;
  if (!cpo || !state.company.applyRatesToAll) return;
  const refs = new Map<CountryId, Branch>();
  for (const b of Object.values(state.branches)) {
    const country = CITIES[b.cityId]?.country;
    if (b.status === 'open' && country && !refs.has(country)) refs.set(country, b);
  }
  if (refs.size === 0) return;
  const rng = stream(state, 'execs');
  for (const [country, ref] of refs) {
    for (const spec of allProducts(state)) {
      setCompanyPrice(
        state,
        spec.id,
        delegatedPrice(state, ref, spec, cpo.expertise, rng),
        country,
      );
    }
  }
}

/** Weekly budget a delegated development may spend: devBudgetShare of revenue, in budget steps. */
export function devBudget(state: GameState): number {
  return Math.floor((X.devBudgetShare * weeklyRevenue(state)) / DEV_BUDGET_STEP) * DEV_BUDGET_STEP;
}

function start(state: GameState, template: DevTemplate, weeklyBudget: number): void {
  startDevelopment(state, {
    name: template.name,
    templateId: template.id,
    tier: X.devTier,
    weeks: X.devWeeks,
    weeklyBudget,
  });
}

export interface DevPlan {
  /** A Products floor is in place. */
  active: boolean;
  /** The product the CPO would develop next, or undefined when every one is developed. */
  template?: DevTemplate;
  /** False when the focus category is exhausted and the pick comes from the rest. */
  inFocus: boolean;
  /** A product development is already under way. */
  running: boolean;
  budget: number;
}

/** The next undeveloped product under `focus`: that category first, then any. Changes nothing. */
export function nextDevelopment(state: GameState, focus: DevFocus): DevPlan {
  const done = new Set(Object.values(state.products.catalog).map((e) => e.templateId));
  const left = Object.values(DEV_TEMPLATES).filter((t) => !isDigital(t) && !done.has(t.id));
  const focused =
    focus === 'any' ? [] : left.filter((t) => t.base && PRODUCTS[t.base]?.category === focus);
  const template = focused[0] ?? left[0];
  return {
    active: !!state.departments.products,
    template,
    inFocus: focus === 'any' || focused.length > 0,
    running: state.products.developments.some((d) => !isDigital(DEV_TEMPLATES[d.templateId]!)),
    budget: devBudget(state),
  };
}

/** Developments: the next undeveloped product (focus category first), when none is running. */
export function cpoDevelopments(state: GameState): void {
  const plan = nextDevelopment(state, state.executives.devFocus);
  if (!plan.active || plan.running || plan.budget < DEV_MIN_WEEKLY || !plan.template) return;
  start(state, plan.template, plan.budget);
}

/** A model's worth to the CPO: quality less costWeight × its licence per customer a year. */
const modelScore = (quality: number, costPerCustomer: number) =>
  quality - MODEL_DELEGATE.costWeight * costPerCustomer;

/**
 * Models (C6a, and the trained models since schema 22): the local data-vendor
 * package or trained model that beats the active model's score by at least
 * minGain; the best of them is switched on (ties: packages first, then by id).
 */
export function cpoModels(state: GameState): void {
  const u = state.underwriting;
  if (u.switching) return;
  const current = activeModel(state);
  const now = modelScore(modelQuality(current), current.costPerCustomer);
  const local = reachableBureaus(state, 'cpo');
  let best: { id: string; score: number; trained: boolean } | undefined;
  const consider = (id: string, score: number, trained: boolean) => {
    if (score >= now + MODEL_DELEGATE.minGain && (!best || score > best.score))
      best = { id, score, trained };
  };
  for (const pkg of Object.values(BUREAU_PACKAGES)) {
    if (!local.includes(pkg.bureau) || pkg.id === u.activeModelId) continue;
    consider(
      pkg.id,
      modelScore(modelQuality({ radar: mixRadar(pkg.mix) }), pkg.costPerCustomer),
      false,
    );
  }
  const trained = Object.values(u.models)
    .filter((m) => m.source === 'trained' && m.id !== u.activeModelId)
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const m of trained) consider(m.id, modelScore(modelQuality(m), m.costPerCustomer), true);
  if (!best) return;
  if (best.trained) activateModel(state, best.id);
  else buyBureauModel(state, best.id, 'cpo');
}

// ─── CTO ──────────────────────────────────────────────────────────────────────

/** Digital projects: the next one not yet done, when the Products team is free. */
export function ctoDigital(state: GameState): void {
  if (!state.departments.products || !state.departments.it) return;
  if (state.products.developments.length > 0) return;
  const done = new Set(state.products.digitalDone ?? []);
  const next = Object.values(DEV_TEMPLATES).find((t) => isDigital(t) && !done.has(t.id));
  if (next) start(state, next, Math.max(DEV_MIN_WEEKLY, devBudget(state)));
}
