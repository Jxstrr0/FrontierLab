// Product development (SIMULATION §16.6): the dev score D, the star odds table,
// weekly progress and spending, and the result — a new catalog product, or a
// digital project's one-time company effect. Tick step 7, right after runHq.
import {
  DEV_MAX_BUDGET_SCORE_AT,
  DEV_MAX_STARS,
  DEV_MIN_WEEKLY,
  DEV_MU,
  DEV_NO_FLOOR_TEAM,
  DEV_SIGMA,
  DEV_TERM_SCORE,
  DEV_TERMS,
  DEV_WEIGHTS,
  HQ_EFFECTS,
} from '../config/balance';
import { DEV_TEMPLATES } from '../data/devTemplates';
import { dlog, normalCdf } from './detmath';
import { pushEvent } from './events';
import { newId } from './ids';
import { spend } from './ledger';
import { clamp, roundToStep } from './math';
import { developedSpec } from './products';
import { countryOfCity, defaultPrice } from './rates';
import { stream } from './rng';
import type { Development, GameState } from './state';

export type DevTerm = (typeof DEV_TERMS)[number];

/** Products coverage k′ (1 = fully staffed). */
function productsK(state: GameState): number {
  return Math.min(1, state.hq.coverage.products?.kPrime ?? 1);
}

/** team = min(productsCoverage′, 1) × avgSkill/100, or 0.5 with no Products floor. */
export function devTeamScore(state: GameState): number {
  const dept = state.departments.products;
  if (!dept) return DEV_NO_FLOOR_TEAM;
  const skill = dept.staff > 0 ? dept.skill : 0;
  return (productsK(state) * skill) / 100;
}

/**
 * B = clamp(log10(budget / min) / log10(maxAt / min), 0, 1): $5k → 0 and
 * $500k → 1 for products; training runs pass their own scale (C6b).
 */
export function budgetScore(
  weeklyBudget: number,
  min: number = DEV_MIN_WEEKLY,
  maxAt: number = DEV_MAX_BUDGET_SCORE_AT,
): number {
  if (!(weeklyBudget > 0)) return 0;
  return clamp(dlog(weeklyBudget / min) / dlog(maxAt / min), 0, 1);
}

/** D = 0.40 T + 0.40 B + 0.20 team (§16.6), B on the given budget scale. */
export function devScore(
  state: GameState,
  weeks: number,
  weeklyBudget: number,
  min?: number,
  maxAt?: number,
): number {
  const t = DEV_TERM_SCORE[weeks as DevTerm] ?? 0;
  return (
    DEV_WEIGHTS.term * t +
    DEV_WEIGHTS.budget * budgetScore(weeklyBudget, min, maxAt) +
    DEV_WEIGHTS.team * devTeamScore(state)
  );
}

/**
 * Star odds [1★..5★] for a dev score: a normal with μ = 1.79 + 2.6 D and
 * σ = DEV_SIGMA integrated over [s − 0.5, s + 0.5], tails folded into 1★ and 5★.
 */
export function starOdds(d: number): number[] {
  const mu = DEV_MU.base + DEV_MU.slope * d;
  const cdf = (x: number) => normalCdf((x - mu) / DEV_SIGMA);
  const odds: number[] = [];
  for (let s = 1; s <= DEV_MAX_STARS; s++) {
    const lo = s === 1 ? 0 : cdf(s - 0.5);
    const hi = s === DEV_MAX_STARS ? 1 : cdf(s + 0.5);
    odds.push(hi - lo);
  }
  return odds;
}

/** The odds table the New product form shows live. */
export function devOdds(state: GameState, weeks: number, weeklyBudget: number): number[] {
  return starOdds(devScore(state, weeks, weeklyBudget));
}

/** Nominal weeks of progress per calendar week: max(0.3, k′). Training runs share it (C6b). */
export function devSpeed(state: GameState): number {
  return Math.max(HQ_EFFECTS.devSpeedFloor, productsK(state));
}

/** Calendar weeks left at the current Products coverage. */
export function devWeeksLeft(state: GameState, dev: Development): number {
  return Math.ceil((dev.weeks - dev.progress) / devSpeed(state));
}

/**
 * Tick step 7: each development pays its budget for the progress it makes
 * (so the total stays weekly budget × weeks) and finishes when progress
 * reaches its term. Developments pause while there's no Products floor.
 */
export function runDevelopments(state: GameState): void {
  if (!state.departments.products || state.products.developments.length === 0) return;
  const speed = devSpeed(state);
  const done: Development[] = [];
  for (const dev of state.products.developments) {
    const remaining = dev.weeks - dev.progress;
    const step = Math.min(speed, remaining);
    const cost = dev.weeklyBudget * step;
    spend(state, 'development', cost);
    dev.spent += cost;
    dev.progress = step === remaining ? dev.weeks : dev.progress + step;
    if (dev.progress >= dev.weeks) done.push(dev);
  }
  if (done.length === 0) return;
  state.products.developments = state.products.developments.filter((d) => !done.includes(d));
  for (const dev of done) finish(state, dev);
}

function rollStars(state: GameState, odds: number[]): number {
  const items = odds.map((weight, i) => ({ item: i + 1, weight }));
  return stream(state, 'products').pickWeighted(items);
}

function finish(state: GameState, dev: Development): void {
  const template = DEV_TEMPLATES[dev.templateId];
  if (!template) return;
  if (template.digital) {
    (state.products.digitalDone ??= []).push(template.id);
    const app = template.digital.appRating ?? 0;
    // The bonus also lifts the app rating target for good (digitalBonus).
    if (app) state.company.appRating = clamp(state.company.appRating + app, 1, 5);
    pushEvent(state, 'DIGITAL_PROJECT_DONE', { templateId: template.id, name: dev.name }, 2);
    return;
  }
  const stars = rollStars(state, dev.odds);
  const id = newId(state, 'dev');
  state.products.catalog[id] = {
    id,
    stars,
    developed: true,
    name: dev.name,
    base: template.base,
    templateId: template.id,
    tier: dev.tier,
    createdWeek: state.clock.week,
  };
  // Every branch gets an offer slot at the default price, switched off.
  const spec = developedSpec(state.products.catalog[id]!);
  if (spec) {
    for (const branch of Object.values(state.branches)) {
      const price = defaultPrice(spec, countryOfCity(state, branch.cityId));
      branch.offered[id] = { on: false, price: roundToStep(price, spec.step) };
    }
  }
  pushEvent(state, 'PRODUCT_DEVELOPED', { productId: id, name: dev.name, stars }, 2);
}
