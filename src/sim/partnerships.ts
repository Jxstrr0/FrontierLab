// Student partnerships at universities (SIMULATION §13.7) and the university
// graduate program (DESIGN §5.8.10). Pure formulas (fee, participation curve,
// ARR target, health) plus the weekly step: each partnership's plan mini-book
// (seats and their ARR, stage C3a) moves toward its target, earns its ARR / 52
// in plan fees, amortizes its fee, and ends by termination or lapse with a
// 12-week runoff. Signing, renewing and releasing live in commands/partnerships.ts.
// Staff-plan (`payroll`) partnerships with employers were retired on 2026-10-30
// (owner's review, B1): an employer is one deal, its anchor account on the Deal
// Desk. A save from before schema 32 may still hold one running off.
import {
  COMP_CLAMP,
  GRAD_PROGRAM,
  PARTICIPATION,
  PARTNER_BALANCE_STEP,
  PARTNER_HEALTH,
  PARTNER_PERKS,
  PARTNER_RENEWAL,
  PARTNER_RUNOFF_WEEKS,
  STUDENT_PARTNERSHIP,
  WEEKS_PER_YEAR,
} from '../config/balance';
import { CITIES } from '../data/cities';
import { branchPrice, competitiveness, isOffered } from './branch/pricing';
import { dexp } from './detmath';
import { pushEvent } from './events';
import { staffMods } from './hq';
import { earn, postPnl, spend } from './ledger';
import { clamp, ema } from './math';
import { listLevel } from './nominal';
import { productSpec } from './products';
import { marketRef } from './rates';
import type { Branch, GameState, Partnership, Site } from './state';

export type PartnershipKind = Partnership['kind'];

// ─── Formulas ─────────────────────────────────────────────────────────────────

/**
 * People the deal covers: the university's students by city size. A retired
 * staff-plan deal running off from an old save still counts the employer's staff.
 */
export function headcount(site: Site, kind: PartnershipKind): number {
  if (kind === 'payroll') return site.employer?.employees ?? 0;
  const size = CITIES[site.cityId]?.size ?? 'M';
  return STUDENT_PARTNERSHIP.students[size];
}

/** The city's incomeIndex. */
export function incomeFactor(site: Site): number {
  return CITIES[site.cityId]?.incomeIndex ?? 1;
}

/**
 * SIMULATION §13.7: students × $30 × city incomeIndex, at today's price list
 * in the site's country (§4.6).
 */
export function signingFee(state: GameState, site: Site, kind: PartnershipKind): number {
  return (
    headcount(site, kind) *
    STUDENT_PARTNERSHIP.feePerStudent *
    incomeFactor(site) *
    listLevel(state, site.cityId)
  );
}

const logistic = (x: number) => 1 / (1 + dexp(-x));

/** SIMULATION §13.7 participation curve at week `t` of a contract of `L` weeks. */
export function participation(t: number, L: number): number {
  const P = PARTICIPATION;
  if (t <= 0) return 0;
  if (t < P.rampWeeks) {
    // Logistic S-curve rescaled so it is exactly 0 at week 0 and rampTo at rampWeeks.
    const k = P.steepness;
    const lo = logistic(-k / 2);
    const hi = logistic(k / 2);
    return (P.rampTo * (logistic(k * (t / P.rampWeeks - 0.5)) - lo)) / (hi - lo);
  }
  const declineFrom = Math.max(P.matureWeeks, L - P.declineWeeks);
  if (t < P.matureWeeks) {
    const f = (t - P.rampWeeks) / (P.matureWeeks - P.rampWeeks);
    return P.rampTo + (P.peak - P.rampTo) * f;
  }
  if (t <= declineFrom) return P.peak;
  if (t >= L) return P.end;
  return P.peak + ((P.end - P.peak) * (t - declineFrom)) / (L - declineFrom);
}

/** §13.7: students × participation × ARR per student × incomeIndex × (0.5 + 0.6 × health/100). */
export function balanceTarget(
  site: Site,
  kind: PartnershipKind,
  part: number,
  health: number,
): number {
  const H = PARTNER_HEALTH;
  return (
    headcount(site, kind) *
    part *
    STUDENT_PARTNERSHIP.arrPerStudent *
    incomeFactor(site) *
    (H.balanceBase + (H.balanceSlope * health) / 100)
  );
}

/** Renewal fee: today's signing fee × (1.5 − health/100) (§13.7). */
export function renewalFee(state: GameState, site: Site, p: Partnership): number {
  return signingFee(state, site, p.kind) * (PARTNER_RENEWAL.base - p.health / 100);
}

/** Weeks since signing (1 at the first weekly tick after signing). */
export const elapsedWeeks = (state: GameState, p: Partnership) => state.clock.week - p.startWeek;

/** "Year X of 7" within the current contract (renewals start a new count). */
export function yearOfTerm(state: GameState, p: Partnership): { year: number; of: number } {
  const of = Math.round(p.termWeeks / WEEKS_PER_YEAR);
  const t = clamp(elapsedWeeks(state, p), 0, p.termWeeks - 1);
  return { year: Math.floor(t / WEEKS_PER_YEAR) + 1, of };
}

/** Renewal opens in the last year of the term. */
export function canRenew(state: GameState, p: Partnership): boolean {
  return (
    p.status === 'active' && elapsedWeeks(state, p) >= p.termWeeks - PARTNER_RENEWAL.windowWeeks
  );
}

/** c_package (§8): the package's competitiveness at the host; −2 if the host stopped offering it. */
export function packageCompetitiveness(state: GameState, branch: Branch, productId: string) {
  const spec = productSpec(state, productId);
  if (!spec || !isOffered(branch, productId)) return -COMP_CLAMP;
  return competitiveness(
    spec,
    branchPrice(state, branch, productId),
    marketRef(state, branch.cityId, productId),
  );
}

/** Staff benefits make the package look generous: the benefits' morale points, capped. */
export function perksBonus(state: GameState): number {
  return clamp(staffMods(state).morale * PARTNER_PERKS.perMoralePoint, 0, PARTNER_PERKS.max);
}

/** §13.7 health target. */
export function healthTarget(state: GameState, p: Partnership, host: Branch): number {
  const H = PARTNER_HEALTH;
  return (
    H.base +
    H.perOverall * (host.ratings.overall - H.overallPivot) +
    H.perComp * packageCompetitiveness(state, host, p.productId) +
    perksBonus(state)
  );
}

/**
 * Open branches that could host a partnership, ones offering `productId` first:
 * in the city, or anywhere in the country for a regional site (no storefronts).
 */
export function hostCandidates(state: GameState, cityId: string, productId?: string): Branch[] {
  const offers = (b: Branch) => (productId && isOffered(b, productId) ? 0 : 1);
  const regional = CITIES[cityId]?.regional ? CITIES[cityId]!.country : undefined;
  const here = (b: Branch) =>
    regional ? CITIES[b.cityId]?.country === regional : b.cityId === cityId;
  return Object.values(state.branches)
    .filter((b) => b.status === 'open' && here(b))
    .sort((a, b) => offers(a) - offers(b) || a.id.localeCompare(b.id));
}

/** A plan can be a partnership's package (C3a: Plans, not the Free Tier). */
export function isPackage(state: GameState, productId: string): boolean {
  const spec = productSpec(state, productId);
  return !!spec && spec.kind === 'plan' && spec.category === 'deposits' && !spec.convertsTo;
}

/** Plans a host branch offers (possible packages). */
export function packageOptions(state: GameState, branch: Branch): string[] {
  return Object.keys(branch.offered).filter(
    (pid) => isPackage(state, pid) && isOffered(branch, pid),
  );
}

// ─── Weekly step (tick step 5) ────────────────────────────────────────────────

/** Ends a partnership: the remaining fee is written off and the balance runs off. */
export function startRunoff(
  state: GameState,
  p: Partnership,
  reason: 'terminated' | 'lapsed' | 'released',
): void {
  if (p.unamortized > 0) postPnl(state, 'amortization', p.unamortized);
  p.unamortized = 0;
  p.status = 'runoff';
  p.runoffWeeksLeft = PARTNER_RUNOFF_WEEKS;
  const site = state.world.sites[p.siteId];
  pushEvent(
    state,
    'PARTNERSHIP_ENDED',
    { partnershipId: p.id, employer: site?.employer?.name ?? site?.refId ?? '', reason },
    reason === 'terminated' ? 2 : 3,
    p.hostBranchId,
  );
}

/** Moves the mini-book's ARR (C3a: subscriptions, no balance-sheet item). */
function moveBalance(_state: GameState, p: Partnership, delta: number): void {
  p.balance += delta;
}

/** Keeps the host valid: a closed host hands over to another branch in the city, else runoff. */
function checkHost(state: GameState, p: Partnership, site: Site): Branch | undefined {
  const host = state.branches[p.hostBranchId];
  if (host && host.status === 'open') return host;
  const next = hostCandidates(state, site.cityId, p.productId)[0];
  if (next) {
    p.hostBranchId = next.id;
    return next;
  }
  if (p.status === 'active') startRunoff(state, p, 'terminated');
  return undefined;
}

function runActive(state: GameState, p: Partnership, site: Site, host: Branch): void {
  const t = elapsedWeeks(state, p);
  p.health = clamp(ema(p.health, healthTarget(state, p, host), PARTNER_HEALTH.ema), 0, 100);
  const part = participation(t, p.termWeeks);
  const target = balanceTarget(site, p.kind, part, p.health);
  moveBalance(state, p, PARTNER_BALANCE_STEP * (target - p.balance));
  p.accounts += PARTNER_BALANCE_STEP * (headcount(site, p.kind) * part - p.accounts);

  // Straight-line amortization over the weeks left in the term (non-cash, §14.2).
  const weeksLeft = Math.max(1, p.termWeeks - t + 1);
  const amort = Math.min(p.unamortized, p.unamortized / weeksLeft);
  postPnl(state, 'amortization', amort);
  p.unamortized -= amort;

  p.lowHealthWeeks = p.health < PARTNER_HEALTH.terminateBelow ? p.lowHealthWeeks + 1 : 0;
  if (p.lowHealthWeeks >= PARTNER_HEALTH.terminateWeeks) startRunoff(state, p, 'terminated');
  else if (t >= p.termWeeks) startRunoff(state, p, 'lapsed');
}

function runRunoff(state: GameState, p: Partnership): void {
  const left = Math.max(1, p.runoffWeeksLeft ?? 1);
  moveBalance(state, p, -p.balance / left);
  p.accounts -= p.accounts / left;
  p.runoffWeeksLeft = left - 1;
}

/** Tick step 5: participation, balances, health, amortization, terminations, the grad program. */
export function runPartnerships(state: GameState): void {
  for (const p of Object.values(state.partnerships)) {
    const site = state.world.sites[p.siteId];
    const host = site ? checkHost(state, p, site) : undefined;
    // A week of last week's ARR, as plan fees (C3a).
    earn(state, 'accountFees', p.balance / WEEKS_PER_YEAR);
    if (p.status === 'active' && site && host) runActive(state, p, site, host);
    else if (p.status === 'active') startRunoff(state, p, 'terminated');
    if (p.status === 'runoff') runRunoff(state, p);
    if (p.status === 'runoff' && (p.runoffWeeksLeft ?? 0) <= 0) {
      moveBalance(state, p, -p.balance);
      delete state.partnerships[p.id];
    }
  }
  runGradProgram(state);
}

// ─── Graduate program ─────────────────────────────────────────────────────────

/** Yearly cost of a university's graduate program: base × the city's wageIndex. */
export function gradProgramCost(site: Site): number {
  return GRAD_PROGRAM.yearlyCost * (CITIES[site.cityId]?.wageIndex ?? 1);
}

/** Candidate skill bonus while a program runs (§17.2). */
export const gradSkillBonus = (state: GameState) =>
  state.company.gradProgram ? GRAD_PROGRAM.skillBonus : 0;

/** Charges the yearly fee when due; ends the program if there's no cash to pay. */
function runGradProgram(state: GameState): void {
  const g = state.company.gradProgram;
  if (!g || state.clock.week < g.renewWeek) return;
  const site = state.world.sites[g.siteId];
  const cost = site ? gradProgramCost(site) : 0;
  if (!site || state.company.cash < cost) {
    delete state.company.gradProgram;
    pushEvent(
      state,
      'GRAD_PROGRAM',
      { siteId: g.siteId, university: site?.employer?.name ?? '', cost: 0, started: false },
      3,
    );
    return;
  }
  spend(state, 'benefits', cost);
  g.renewWeek += WEEKS_PER_YEAR;
}
