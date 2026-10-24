// Demand and competition (SIMULATION §9): prospects from foot traffic, share
// against nearby branches and the city's incumbents, capture limited by capacity,
// then product take-up by segment.
import {
  APPROVAL_INCLUSION,
  AWARENESS_FLOOR,
  CAPITAL_GATE,
  CATCHMENT_MULT,
  DEMAND_NOISE,
  DISTANCE_FALLOFF,
  MORTGAGE_SPECIAL,
  PROSPECT_RATE,
  RISK_APPETITE,
  RIVAL_RADIUS,
  SATURATION_EXP,
  SHARE_EXP,
  STARS_TAKEUP,
  TAKEUP_CAP,
} from '../../config/balance';
import { CITIES } from '../../data/cities';
import { EQUIPMENT } from '../../data/equipment';
import { needsApproval, PRODUCTS, type ProductSpec } from '../../data/products';
import { AFFINITY, BUSINESS_ACCT_BIZ_TICKET_MULT, SEGMENT_SPECS } from '../../data/segments';
import { SEGMENTS, type SegmentId } from '../../data/types';
import { tileDistance } from '../citygen';
import { loanDemand } from '../macro';
import { clamp, noise } from '../math';
import { countryOfCity, marketRef } from '../rates';
import { stream } from '../rng';
import type { Branch, GameState } from '../state';
import { activeModel, RADAR } from '../underwriting';
import { effectiveAwareness, type CampaignEffects } from './marketing';
import { branchPrice, isOffered, priceFactor } from './pricing';
import { capacity, visitRate } from './staff';

export interface Origination {
  newAccounts: number;
  newVolume: number;
  /** Approval probability used, for application counts (§10.6). */
  approval: number;
}

export interface DemandResult {
  prospects: number;
  share: number;
  captured: number;
  served: number;
  capacity: number;
  wait: number;
  byProduct: Record<string, Origination>;
}

/** Attractiveness A = (Overall/5)^2.2 (§9.3). */
const attract = (overall: number) => (overall / 5) ** SHARE_EXP;

/**
 * share = A / (A + Σ w_j A_j + A0), with w_j = 1 / (1 + d_j / 6) for every
 * competitor within RIVAL_RADIUS tiles (§9.3).
 */
export function shareFormula(
  overall: number,
  competitors: { overall: number; distance: number }[],
  a0: number,
): number {
  let others = 0;
  for (const c of competitors) {
    if (c.distance <= RIVAL_RADIUS)
      others += attract(c.overall) / (1 + c.distance / DISTANCE_FALLOFF);
  }
  const a = attract(overall);
  return a / (a + others + a0);
}

/** This branch's share of prospects against every branch nearby (§9.3). */
export function shareOf(state: GameState, branch: Branch): number {
  const lot = state.world.lots[branch.lotId];
  const city = CITIES[branch.cityId];
  if (!lot || !city) return 0;
  const competitors: { overall: number; distance: number }[] = [];
  for (const rival of Object.values(state.rivals)) {
    if (rival.status !== 'active') continue;
    for (const rb of rival.branches) {
      const other = rb.cityId === branch.cityId ? state.world.lots[rb.lotId] : undefined;
      if (other) competitors.push({ overall: rb.overall, distance: tileDistance(lot, other) });
    }
  }
  for (const own of Object.values(state.branches)) {
    if (own.id === branch.id || own.status !== 'open' || own.cityId !== branch.cityId) continue;
    const other = state.world.lots[own.lotId];
    if (other)
      competitors.push({ overall: own.ratings.overall, distance: tileDistance(lot, other) });
  }
  return shareFormula(branch.ratings.overall, competitors, city.incumbent);
}

/** Loan and card approval probability (§9.6). */
export function approvalOf(state: GameState, spec: ProductSpec): number {
  if (!needsApproval(spec)) return 1;
  const model = activeModel(state);
  const appetite = state.company.riskAppetite - 1;
  const fundingGate = state.treasury.freeze ? 0 : 1;
  return (
    (spec.baseApproval ?? 0) *
    (RISK_APPETITE.volumeMult[appetite] ?? 1) *
    (APPROVAL_INCLUSION.base + APPROVAL_INCLUSION.slope * model.radar[RADAR.inclusion]) *
    fundingGate *
    CAPITAL_GATE[state.company.tier]
  );
}

/** special_p (§9.6): mortgages need homeowners and advisor offices, and so on. */
function special(state: GameState, branch: Branch, spec: ProductSpec): number {
  const lot = state.world.lots[branch.lotId];
  const offices = EQUIPMENT[branch.build.lobby]?.advisorOffices ?? 0;
  if (spec.id === 'mortgage') {
    const m = MORTGAGE_SPECIAL;
    return (
      ((lot?.homeownerShare ?? 0) / m.homeownerRef) *
      clamp(m.base + m.perOffice * offices, m.min, m.max)
    );
  }
  if (spec.kind === 'wealth') return offices > 0 ? 1 : 0;
  if (spec.kind === 'safebox') {
    const boxes = EQUIPMENT[branch.build.vault]?.boxes ?? 0;
    return (branch.books[spec.id]?.accounts ?? 0) < boxes ? 1 : 0;
  }
  return 1;
}

export function runDemand(state: GameState, branch: Branch, fx: CampaignEffects): DemandResult {
  const lot = state.world.lots[branch.lotId];
  if (!lot) throw new Error(`Branch ${branch.id} has no lot`);
  const rng = stream(state, 'demand');
  const country = countryOfCity(state, branch.cityId);

  // §9.1–9.2 prospects
  const population = lot.footTraffic * CATCHMENT_MULT;
  const penetration = clamp(branch.customers / population, 0, 1);
  const e = effectiveAwareness(state, branch);
  const prospects =
    lot.footTraffic *
    PROSPECT_RATE *
    (AWARENESS_FLOOR + (1 - AWARENESS_FLOOR) * e) *
    Math.sqrt(loanDemand(country)) *
    (1 - penetration) ** SATURATION_EXP *
    noise(rng, DEMAND_NOISE);

  // §9.3–9.4 share, capture and service
  const share = shareOf(state, branch);
  const captured = prospects * share;
  const cap = capacity(branch, fx.capacity);
  const visits = visitRate(state.company.appRating) * branch.customers;
  const served = captured > 0 ? captured * clamp((cap - visits) / captured, 0, 1) : 0;
  const wait = cap > 0 ? (captured + visits) / cap : 10;

  // §9.5 new customers by segment, with campaign segment boosts
  const boosted = SEGMENTS.map((s) => lot.mix[s] * fx.segments[s]);
  const boostSum = boosted.reduce((a, b) => a + b, 0) || 1;
  const newBySeg = {} as Record<SegmentId, number>;
  SEGMENTS.forEach((s, i) => (newBySeg[s] = (served * boosted[i]!) / boostSum));

  // §9.6 take-up per offered product
  const byProduct: Record<string, Origination> = {};
  for (const spec of Object.values(PRODUCTS)) {
    if (spec.kind === 'sbl' || spec.kind === 'fx' || !isOffered(branch, spec.id)) continue;
    const price = branchPrice(state, branch, spec.id);
    const m = marketRef(state, branch.cityId, spec.id);
    const stars = state.products.catalog[spec.id]?.stars ?? spec.startStars;
    const approval = approvalOf(state, spec);
    const sp = special(state, branch, spec);
    const boost = spec.category === 'deposits' ? fx.depositTakeUp : 1;
    let accounts = 0;
    let volume = 0;
    for (const s of SEGMENTS) {
      const aff = AFFINITY[spec.id]?.[s] ?? 0;
      if (aff <= 0 || newBySeg[s] <= 0) continue;
      const q = Math.min(
        TAKEUP_CAP,
        aff *
          priceFactor(spec, s, price, m) *
          (STARS_TAKEUP.base + STARS_TAKEUP.slope * stars) *
          approval *
          sp *
          boost,
      );
      const n = newBySeg[s] * q;
      const ticketMult =
        spec.id === 'business_acct' && s === 'BIZ'
          ? BUSINESS_ACCT_BIZ_TICKET_MULT
          : SEGMENT_SPECS[s].ticketMult[spec.category];
      accounts += n;
      volume += n * spec.ticket * lot.incomeIndex * ticketMult;
    }
    byProduct[spec.id] = {
      newAccounts: accounts,
      newVolume: volume * noise(rng, DEMAND_NOISE),
      approval,
    };
  }

  return { prospects, share, captured, served, capacity: cap, wait, byProduct };
}
