// Branch ratings and reviews (SIMULATION §8): Rates, Products, Service and
// Branch targets each week, displayed ratings easing toward them, review counts
// and review cards.
import { staffMods } from '../hq';
import {
  BALANCE_WEIGHT_FLOOR,
  BRANCH_RATING_WEIGHTS,
  NO_ATM_QUALITY,
  NO_MANAGER_SERVICE,
  OVERALL_WEIGHTS,
  PRODUCTS_RATING,
  RATES_BASE,
  RATING_EMA,
  REVIEW_CARD_SIGMA,
  REVIEW_CAMPAIGN_CHANCE,
  REVIEW_CARDS_KEPT,
  REVIEW_RATE,
  SERVICE_RATING,
  UPKEEP_PENALTY,
  MODEL_EFFECTS,
} from '../../config/balance';
import { BUILD_SLOTS, EQUIPMENT } from '../../data/equipment';
import { CAMPAIGN_REVIEW_LINES, REVIEW_LINES } from '../../data/reviews';
import { SEGMENTS, type RatingCategory } from '../../data/types';
import { clamp, ema } from '../math';
import { marketRef } from '../rates';
import { stream } from '../rng';
import type { Branch, GameState } from '../state';
import { activeModel, modelQuality, qualityBar, RADAR } from '../underwriting';
import type { CampaignEffects } from './marketing';
import { branchPrice, competitiveness, isOffered } from './pricing';
import { managerOf } from './staff';
import { cityBrandBonus } from '../hqMarketing';
import { latencyLift } from '../dataCenters';
import { edgeServiceLift } from '../projects';
import { ratingMod } from '../incident/effects';
import {
  affinityOf,
  allProducts,
  BASE_PRODUCTS,
  baseId,
  developedEntries,
  productSpec,
  starsOf,
} from '../products';

/** Σ over segments of mix_s × affinity[s][p] at this branch's lot. */
export function lotAffinity(state: GameState, branch: Branch, productId: string): number {
  const lot = state.world.lots[branch.lotId];
  const spec = productSpec(state, productId);
  const aff = spec && affinityOf(spec);
  if (!lot || !aff) return 0;
  return SEGMENTS.reduce((sum, s) => sum + lot.mix[s] * aff[s], 0);
}

export function ratesTarget(state: GameState, branch: Branch, fx: CampaignEffects): number {
  // A withdrawn product still bills its customers, so its price counts while it has any.
  const counts = (pid: string) =>
    isOffered(branch, pid) || Math.abs(branch.books[pid]?.balance ?? 0) > 0;
  let totalBalance = 0;
  for (const [pid, book] of Object.entries(branch.books)) {
    if (counts(pid)) totalBalance += Math.abs(book.balance);
  }
  let wSum = 0;
  let cSum = 0;
  for (const spec of allProducts(state)) {
    if (!counts(spec.id) || spec.kind === 'sbl') continue;
    const bal = Math.abs(branch.books[spec.id]?.balance ?? 0);
    const w = (totalBalance > 0 ? bal / totalBalance : 0) + BALANCE_WEIGHT_FLOOR;
    const c = competitiveness(
      spec,
      branchPrice(state, branch, spec.id),
      marketRef(state, branch.cityId, spec.id),
    );
    wSum += w;
    cSum += w * c;
  }
  return clamp(RATES_BASE + (wSum > 0 ? cSum / wSum : 0) + fx.bumps.rates, 1, 5);
}

export function productsTarget(state: GameState, branch: Branch, fx: CampaignEffects): number {
  let affSum = 0;
  let starSum = 0;
  let bump = 0;
  // Breadth counts each base product once, covered if it or a variant is offered.
  const covered = new Set<string>();
  for (const spec of allProducts(state)) {
    if (!isOffered(branch, spec.id)) continue;
    const aff = lotAffinity(state, branch, spec.id);
    covered.add(baseId(spec));
    affSum += aff;
    starSum += aff * starsOf(state, spec);
    bump += spec.productsBump ?? 0;
  }
  let totalAff = 0;
  let coveredAff = 0;
  for (const spec of BASE_PRODUCTS) {
    const aff = lotAffinity(state, branch, spec.id);
    totalAff += aff;
    if (covered.has(spec.id)) coveredAff += aff;
  }
  const share = totalAff > 0 ? coveredAff / totalAff : 0;
  const breadth =
    share >= PRODUCTS_RATING.breadthGoodShare
      ? PRODUCTS_RATING.breadthGood
      : share < PRODUCTS_RATING.breadthBadShare
        ? PRODUCTS_RATING.breadthBad
        : 0;
  const mean = affSum > 0 ? starSum / affSum : 1;
  return clamp(
    mean +
      breadth +
      PRODUCTS_RATING.app * (state.company.appRating - PRODUCTS_RATING.appBase) +
      PRODUCTS_RATING.model *
        (modelQuality(activeModel(state)) -
          PRODUCTS_RATING.modelBase -
          (qualityBar(state) - MODEL_EFFECTS.qualityRef)) +
      fx.bumps.products +
      bump,
    1,
    5,
  );
}

export function serviceTarget(state: GameState, branch: Branch, fx: CampaignEffects): number {
  const mgr = managerOf(state, branch);
  const speed = activeModel(state).radar[RADAR.speed];
  return clamp(
    SERVICE_RATING.base +
      (SERVICE_RATING.skill * branch.staff.skill) / 100 +
      (SERVICE_RATING.morale * branch.staff.morale) / 100 +
      (SERVICE_RATING.managerPeople * (mgr?.skills.people ?? 0)) / 100 +
      SERVICE_RATING.modelSpeed * (speed - 5) +
      fx.bumps.service +
      latencyLift(state, branch.cityId) +
      edgeServiceLift(state) -
      SERVICE_RATING.wait * Math.max(0, branch.waitIndex - 1) -
      (mgr ? 0 : NO_MANAGER_SERVICE),
    1,
    5,
  );
}

export function branchTarget(state: GameState, branch: Branch, fx: CampaignEffects): number {
  let q = 0;
  for (const slot of BUILD_SLOTS) {
    const item = EQUIPMENT[branch.build[slot]];
    let quality = item?.quality ?? 0;
    if (slot === 'atm' && (item?.atmProductivity ?? 0) === 0) quality = NO_ATM_QUALITY;
    q += BRANCH_RATING_WEIGHTS[slot] * quality;
  }
  // Upkeep: 0.2 per 5 years of age beyond each component's depreciation life.
  let upkeep = 0;
  for (const asset of state.company.fixedAssets) {
    if (asset.ownerId !== branch.id) continue;
    const over = asset.ageWeeks - asset.lifeWeeks;
    if (over > 0) upkeep += UPKEEP_PENALTY.perStep * Math.floor(over / UPKEEP_PENALTY.stepWeeks);
  }
  const prestige = cityBrandBonus(state, branch.cityId);
  return clamp(
    q +
      fx.bumps.branch +
      staffMods(state).reputation +
      prestige -
      upkeep +
      productBranchBump(state, branch),
    1,
    5,
  );
}

/** Reputation from developed products offered here (e.g. Green GIC, CONTENT §6). */
function productBranchBump(state: GameState, branch: Branch): number {
  let bump = 0;
  for (const e of developedEntries(state)) {
    if (isOffered(branch, e.id)) bump += productSpec(state, e.id)?.branchBump ?? 0;
  }
  return bump;
}

/** Recomputes targets, eases displayed ratings toward them and adds reviews. */
export function updateRatings(state: GameState, branch: Branch, fx: CampaignEffects): void {
  const r = branch.ratings;
  // Incident modifiers (§23) ride on each target while their timed effect lasts.
  const target = (cat: RatingCategory, t: number) => clamp(t + ratingMod(state, branch, cat), 1, 5);
  r.rates = ema(r.rates, target('rates', ratesTarget(state, branch, fx)), RATING_EMA);
  r.products = ema(r.products, target('products', productsTarget(state, branch, fx)), RATING_EMA);
  r.service = ema(r.service, target('service', serviceTarget(state, branch, fx)), RATING_EMA);
  r.branch = ema(r.branch, target('branch', branchTarget(state, branch, fx)), RATING_EMA);
  r.overall = clamp(
    OVERALL_WEIGHTS.rates * r.rates +
      OVERALL_WEIGHTS.products * r.products +
      OVERALL_WEIGHTS.service * r.service +
      OVERALL_WEIGHTS.branch * r.branch +
      ratingMod(state, branch, 'overall'),
    1,
    5,
  );
}

/** Reviews scale with customers served; 1–2 new cards a week (§8). */
export function addReviews(
  state: GameState,
  branch: Branch,
  served: number,
  fx: CampaignEffects,
): void {
  branch.ratings.reviewCount += served * REVIEW_RATE;
  if (served <= 0) return;
  // Own stream (split from `news` 2026-10-26), so newspaper changes never reshuffle reviews.
  const rng = stream(state, 'reviews');
  const cats: RatingCategory[] = ['rates', 'products', 'service', 'branch'];
  const sorted = [...cats].sort((a, b) => branch.ratings[b] - branch.ratings[a]);
  const picks: RatingCategory[] = [sorted[0]!, sorted[sorted.length - 1]!];
  const count = rng.int(1, 2);
  for (let i = 0; i < count; i++) {
    const campaignId = fx.activeIds.find((id) => CAMPAIGN_REVIEW_LINES[id]);
    const useCampaign = campaignId !== undefined && rng.chance(REVIEW_CAMPAIGN_CHANCE);
    const category = useCampaign
      ? CAMPAIGN_REVIEW_LINES[campaignId]!.category
      : picks[i % picks.length]!;
    const stars = Math.round(
      clamp(branch.ratings[category] + rng.normal(0, REVIEW_CARD_SIGMA), 1, 5),
    );
    const pool = stars >= 3 ? REVIEW_LINES[category].pos : REVIEW_LINES[category].neg;
    const text = useCampaign ? CAMPAIGN_REVIEW_LINES[campaignId]!.text : rng.pick(pool);
    branch.reviewCards.push({
      week: state.clock.week,
      category,
      stars,
      text,
      portraitSeed: rng.int(0, 1e9),
    });
  }
  if (branch.reviewCards.length > REVIEW_CARDS_KEPT) {
    branch.reviewCards.splice(0, branch.reviewCards.length - REVIEW_CARDS_KEPT);
  }
}
