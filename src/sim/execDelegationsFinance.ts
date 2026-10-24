// Executive delegations for money and products (SIMULATION §17.2 table), each a
// small weekly routine that only uses the player's own commands:
//   CFO  treasury      auto-funding on; borrows the cheapest funding offer when LR is
//                      more than 2pp under target; moves the bond share a step out of
//                      the band (down when short, up when flush)
//   CPO  pricing       prices the company lineup like a delegated manager (§17.1)
//                      while Apply-to-all is on
//   CPO  developments  starts the next undeveloped template when none is running, on a
//                      weekly budget of at most 1% of weekly revenue
//   CPO  models        switches to the bureau package with the best net saving
//                      (defaults avoided less extra application cost) over the house model
//   CTO  digital       starts the next digital project when no development is running
// The CFO's halved statement delay is passive (hq.ts); the dividend proposal is a
// selector the board meeting reads (governance.ts).
import {
  BOND_SHARE_MAX,
  DEV_BUDGET_STEP,
  DEV_MIN_WEEKLY,
  EXEC_DELEGATION as X,
  MODEL_PD,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { BUREAU_PACKAGES, bureausIn } from '../data/bureaus';
import { DEV_TEMPLATES, isDigital, type DevTemplate } from '../data/devTemplates';
import { CITIES } from '../data/cities';
import type { CountryId, Pentagon } from '../data/types';
import { delegatedPrice } from './branch/delegation';
import { startDevelopment } from './commands/development';
import { setCompanyPrice } from './commands/products';
import { borrowOffer, setTreasuryPolicy } from './commands/treasury';
import { buyBureauModel } from './commands/underwriting';
import { totalDeposits } from './balanceSheet';
import { hasTreasuryFloor, maxBorrow } from './fundingMarket';
import { roundToStep } from './math';
import { allProducts } from './products';
import { stream } from './rng';
import type { Branch, GameState } from './state';
import { activeModel, mixRadar, RADAR } from './underwriting';

/** Average weekly revenue over the last few closes (interest + fee income). */
export function weeklyRevenue(state: GameState): number {
  const recent = state.history.weekly.slice(-X.revenueWeeks);
  if (recent.length === 0) return 0;
  return recent.reduce((s, w) => s + w.revenue, 0) / recent.length;
}

// ─── CFO ──────────────────────────────────────────────────────────────────────

/** Treasury: auto-funding on, funding offers and the bond share keep LR within ±2pp of target. */
export function cfoTreasury(state: GameState): void {
  const t = state.treasury;
  if (!t.autoFunding) setTreasuryPolicy(state, { autoFunding: true });
  const lr = state.company.liquidityRatio;
  if (lr === null) return;
  if (lr < t.liqTarget - X.lrBand) {
    if (hasTreasuryFloor(state)) {
      const offer = [...t.offers].sort((a, b) => a.rate - b.rate)[0];
      const need = (t.liqTarget - lr) * totalDeposits(state);
      const amount = offer ? Math.min(maxBorrow(state, offer), need) : 0;
      if (offer && amount >= 1) borrowOffer(state, offer.id, amount);
    }
    if (t.bondShare > 0)
      setTreasuryPolicy(state, {
        bondShare: Math.max(0, roundToStep(t.bondShare - X.bondStep, X.bondStep)),
      });
  } else if (lr > t.liqTarget + X.lrBand && t.bondShare < BOND_SHARE_MAX) {
    setTreasuryPolicy(state, {
      bondShare: Math.min(BOND_SHARE_MAX, roundToStep(t.bondShare + X.bondStep, X.bondStep)),
    });
  }
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

/** Developments: the next template nobody has developed yet, when none is running. */
export function cpoDevelopments(state: GameState): void {
  if (!state.departments.products) return;
  const running = state.products.developments.some((d) => !isDigital(DEV_TEMPLATES[d.templateId]!));
  if (running) return;
  const budget = devBudget(state);
  if (budget < DEV_MIN_WEEKLY) return;
  const done = new Set(Object.values(state.products.catalog).map((e) => e.templateId));
  const next = Object.values(DEV_TEMPLATES).find((t) => !isDigital(t) && !done.has(t.id));
  if (next) start(state, next, budget);
}

/** Default-rate multiplier of a radar (§10.2): (base − accuracy × A) × (1 + inclusion × (I − 5)). */
function pdMult(radar: Pentagon): number {
  return (
    (MODEL_PD.base - MODEL_PD.accuracy * radar[RADAR.accuracy]) *
    (1 + MODEL_PD.inclusion * (radar[RADAR.inclusion] - 5))
  );
}

/** Models: the local bureau package with the best yearly net saving over the house model. */
export function cpoModels(state: GameState): void {
  const u = state.underwriting;
  if (u.switching) return;
  const year = state.history.weekly.slice(-WEEKS_PER_YEAR);
  if (year.length === 0) return;
  const scale = WEEKS_PER_YEAR / year.length;
  const losses = year.reduce((s, w) => s + w.pnl.loanLosses, 0) * scale;
  const current = activeModel(state);
  const apps =
    current.costPerApp > 0
      ? (year.reduce((s, w) => s + w.pnl.underwriting, 0) * scale) / current.costPerApp
      : 0;
  const pdNow = pdMult(current.radar);
  const local = bureausIn(state.world.currentCityId);
  let best: { id: string; net: number } | undefined;
  for (const pkg of Object.values(BUREAU_PACKAGES)) {
    if (!local.includes(pkg.bureau) || pkg.id === u.activeModelId) continue;
    const saved = pdNow > 0 ? ((pdNow - pdMult(mixRadar(pkg.mix))) / pdNow) * losses : 0;
    const net = saved - (pkg.costPerApp - current.costPerApp) * apps;
    if (net > 0 && (!best || net > best.net)) best = { id: pkg.id, net };
  }
  if (best) buyBureauModel(state, best.id);
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
