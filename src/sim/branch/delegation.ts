// Delegated branch managers (SIMULATION §17.1): staffing and wages, products
// and rates, and branch marketing. Loan approvals live in loanDesk.ts.
import {
  AWARENESS_DECAY,
  AWARENESS_FLOOR,
  DELEGATE,
  PROSPECT_RATE,
  RATE_COMP_STEP,
  SATURATION_EXP,
  CATCHMENT_MULT,
  WAGE_STEP,
  WAIT_LABELS,
} from '../../config/balance';
import { CAMPAIGNS } from '../../data/campaigns';
import { EQUIPMENT } from '../../data/equipment';
import type { ProductSpec } from '../../data/products';
import { loanDemand } from '../macro';
import { cityRoom } from './cityMarket';
import { listLevel } from '../nominal';
import { clamp, roundToStep } from '../math';
import { countryOfCity, defaultPrice, ftpFor, marketRef } from '../rates';
import { stream, type Rng } from '../rng';
import type { Branch, GameState } from '../state';
import { marketingMult } from './marketing';
import { lotAffinity } from './ratings';
import { followsHq } from './pricing';
import { managerOf, marketWage, staffNeeded } from './staff';
import { difficultyOf } from '../difficulty';
import { dpow } from '../detmath';
import { allProducts, baseId } from '../products';
import {
  guidanceMarketingMult,
  guidanceProducts,
  guidanceRateOffset,
  guidanceStaffing,
} from '../branchGuidance';

/** Campaigns a delegated manager weighs by awareness return. */
const AWARENESS_CAMPAIGNS = [
  'lobby_coffee',
  'direct_mail',
  'workshops',
  'sponsors',
  'social',
  'search',
];

export function runDelegation(state: GameState, branch: Branch): void {
  const mgr = managerOf(state, branch);
  if (!mgr) return;
  if (branch.delegation.staffing) {
    const [lo, hi] = DELEGATE.staffWait;
    // §17.2 branch guidance: the COO's step lifts (or trims) wages and headcount.
    const coo = guidanceStaffing(state);
    branch.staff.target = Math.ceil(
      staffNeeded(branch) * clamp(branch.waitIndex, lo, hi) * coo.staff,
    );
    branch.staff.wage = roundToStep(
      marketWage(state, branch.cityId) *
        (DELEGATE.wageBase + (DELEGATE.wageSlope * mgr.skills.people) / 100) *
        coo.wage,
      WAGE_STEP,
    );
  }
  if (branch.delegation.products && !followsHq(state, branch))
    delegatePricing(state, branch, mgr.skills.product);
  if (branch.delegation.marketing) delegateMarketing(state, branch);
}

/**
 * The price a delegated manager targets: a little better than market, keeping
 * ≥ 40% of the default margin. `rng` draws the skill error (a CPO pricing the
 * company lineup passes its own stream).
 */
export function delegatedPrice(
  state: GameState,
  branch: Branch,
  spec: ProductSpec,
  productSkill: number,
  rng: Rng = stream(state, 'demand'),
): number {
  const c = countryOfCity(state, branch.cityId);
  const m = marketRef(state, branch.cityId, spec.id);
  const offset = DELEGATE.rateOffsetComp * RATE_COMP_STEP;
  let price: number;
  if (spec.priceType !== 'rate') {
    // §17.2 branch guidance: the CPO's step cuts (or raises) fees.
    price = m * DELEGATE.feeDiscount * guidanceProducts(state).fee;
  } else {
    const ftp = ftpFor(spec, c);
    const def = defaultPrice(spec, c);
    const error = rng.normal(0, DELEGATE.priceErrorSd * (1 - productSkill / 100));
    // §17.2 branch guidance: the CFO and CRO move deposit and loan rates by whole steps.
    if (spec.category === 'deposits') {
      price = m + offset;
      const spread = ftp - def;
      if (spread > 0) price = Math.min(price, ftp - DELEGATE.minMarginShare * spread);
      price += guidanceRateOffset(state, 'deposits');
      if (spread > 0) price = Math.min(price, ftp);
    } else {
      price = m - offset;
      const spread = def - ftp;
      if (spread > 0 && baseId(spec) !== 'credit_card')
        price = Math.max(price, ftp + DELEGATE.minMarginShare * spread);
      price += guidanceRateOffset(state, 'loans');
      if (spread > 0) price = Math.max(price, ftp);
    }
    price += error;
  }
  return clamp(roundToStep(price, spec.step), spec.min, spec.max);
}

function delegatePricing(state: GameState, branch: Branch, productSkill: number): void {
  const offices = EQUIPMENT[branch.build.lobby]?.advisorOffices ?? 0;
  const boxes = EQUIPMENT[branch.build.vault]?.boxes ?? 0;
  // §17.2 branch guidance: the CPO's step lowers (or raises) the bar for a product.
  const bar = DELEGATE.minAffinity * guidanceProducts(state).affinity;
  for (const spec of allProducts(state)) {
    const slot = (branch.offered[spec.id] ??= { on: false, price: 0 });
    let on = spec.kind === 'sbl' || lotAffinity(state, branch, spec.id) >= bar;
    if (spec.kind === 'wealth' && offices === 0) on = false;
    if (spec.kind === 'safebox' && boxes === 0) on = false;
    slot.on = on;
    slot.price = delegatedPrice(state, branch, spec, productSkill);
  }
}

/** Turns on campaigns whose estimated 26-week awareness return beats their cost. */
function delegateMarketing(state: GameState, branch: Branch): void {
  const lot = state.world.lots[branch.lotId];
  const last = branch.pnl.at(-1);
  if (!lot || !last) return;
  const country = countryOfCity(state, branch.cityId);
  const priceLevel = listLevel(state, branch.cityId);
  const customers = Math.max(branch.customers, 1);
  // Contribution per customer per week: revenue less interest, funding and losses.
  const l = last.lines;
  const perCustomer = Math.max(
    0,
    (last.revenue - l.depositInterest - l.fundingCharge - l.losses) / customers,
  );
  const mult = marketingMult(state, branch);
  const b = state.world.cities[branch.cityId]?.brandAwareness ?? 0;
  const pen = clamp(branch.customers / (lot.footTraffic * CATCHMENT_MULT), 0, 1);
  const prospectsPerAwareness =
    lot.footTraffic *
    PROSPECT_RATE *
    difficultyOf(state).demandMult *
    (1 - AWARENESS_FLOOR) *
    (1 - b) *
    Math.sqrt(loanDemand(country)) *
    dpow(1 - pen, SATURATION_EXP) *
    cityRoom(state, branch.cityId);
  const share = branch.last.share;
  const H = DELEGATE.marketingHorizon;
  // §17.2 branch guidance: the CMO's step makes awareness worth more (or less).
  const cmo = guidanceMarketingMult(state);
  const steady = (g: number) => (g * mult) / (AWARENESS_DECAY + g * mult);

  let chosenGain = 0;
  for (const id of AWARENESS_CAMPAIGNS) {
    const spec = CAMPAIGNS[id];
    if (!spec) continue;
    let bestLevel = 0;
    let bestNet = 0;
    spec.levels.forEach((level, i) => {
      if (level.cost.type !== 'weekly') return;
      const da = steady(chosenGain + (level.awareness ?? 0)) - steady(chosenGain);
      const extraCustomersPerWeek = prospectsPerAwareness * da * share;
      // A customer won mid-horizon earns for half of it on average.
      const value = extraCustomersPerWeek * perCustomer * H * (H / 2) * cmo;
      const net = value - level.cost.amount * priceLevel * H;
      if (net > bestNet) {
        bestNet = net;
        bestLevel = i + 1;
      }
    });
    branch.campaigns[id] = bestLevel;
    if (bestLevel > 0) chosenGain += spec.levels[bestLevel - 1]?.awareness ?? 0;
  }
  // Saturday hours when the line is long.
  branch.campaigns.saturday =
    branch.waitIndex > WAIT_LABELS.long ? 2 : branch.waitIndex > WAIT_LABELS.busy ? 1 : 0;
}
