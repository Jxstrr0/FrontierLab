// Partnership commands (SIMULATION §13.7, DESIGN §5.8.10): sign a payroll or
// student partnership at an employer or university, renew it in its last year,
// release it, and start or end a university graduate program.
import { PARTNER_CONTRACT_WEEKS, PARTNER_HEALTH, WEEKS_PER_YEAR } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { isOffered } from '../branch/pricing';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { postCash, spend } from '../ledger';
import {
  canRenew,
  gradProgramCost,
  hostCandidates,
  isPackage,
  renewalFee,
  signingFee,
  startRunoff,
  type PartnershipKind,
} from '../partnerships';
import { productSpec } from '../products';
import type { GameState, Partnership, Site } from '../state';
import { fail, money, ok, type CommandResult } from './result';

const siteLabel = (site: Site) => site.employer?.name ?? site.refId;

/** The active partnership of this kind at a site, if any. */
export function activePartnership(
  state: GameState,
  siteId: string,
  kind: PartnershipKind = 'payroll',
): Partnership | undefined {
  return Object.values(state.partnerships).find(
    (p) => p.siteId === siteId && p.kind === kind && p.status === 'active',
  );
}

/** Why this deal can't be signed right now, or undefined if it can. */
export function signBlocker(
  state: GameState,
  siteId: string,
  hostBranchId: string,
  productId: string,
  kind: PartnershipKind = 'payroll',
): string | undefined {
  const site = state.world.sites[siteId];
  if (!site || (site.kind !== 'employer' && site.kind !== 'university') || !site.employer)
    return 'That employer is no longer on the map.';
  if (site.kind === 'employer' && CITIES[site.cityId]?.regional)
    return 'Energy sites sign data-centre and power deals, not staff plan deals.';
  if (kind === 'student' && site.kind !== 'university')
    return 'Only universities offer student partnerships.';
  if (activePartnership(state, siteId, kind)) return 'You already have this partnership.';
  const host = state.branches[hostBranchId];
  // A regional site has no storefronts: any open branch in its country can host (hostCandidates).
  if (!host || !hostCandidates(state, site.cityId).some((b) => b.id === host.id))
    return CITIES[site.cityId]?.regional
      ? `Pick an open sales office of yours in ${COUNTRIES[CITIES[site.cityId]!.country].name} to host the plans.`
      : 'Pick an open sales office of yours in this city to host the plans.';
  const spec = productSpec(state, productId);
  if (!spec || !isPackage(state, productId) || !isOffered(host, productId))
    return 'Pick a plan the host sales office offers as the package.';
  const fee = signingFee(state, site, kind);
  if (state.company.cash < fee) return `Not enough cash: you need ${money(fee)}.`;
  return undefined;
}

/** Signs a partnership: the fee leaves corporate cash and becomes an intangible (§13.7). */
export function signPartnership(
  state: GameState,
  siteId: string,
  hostBranchId: string,
  productId: string,
  kind: PartnershipKind = 'payroll',
): CommandResult<{ partnershipId: string }> {
  const blocker = signBlocker(state, siteId, hostBranchId, productId, kind);
  if (blocker) return fail(blocker);
  const site = state.world.sites[siteId]!;
  const fee = signingFee(state, site, kind);
  const p: Partnership = {
    id: newId(state, 'pship'),
    siteId,
    kind,
    hostBranchId,
    productId,
    startWeek: state.clock.week,
    termWeeks: PARTNER_CONTRACT_WEEKS,
    fee,
    unamortized: fee,
    balance: 0,
    accounts: 0,
    health: PARTNER_HEALTH.start,
    lowHealthWeeks: 0,
    status: 'active',
  };
  state.partnerships[p.id] = p;
  postCash(state, -fee, 'investing');
  // You won the payroll from whichever rival held it.
  if (kind === 'payroll' && site.employer) delete site.employer.partnerRivalId;
  pushEvent(
    state,
    'PARTNERSHIP_SIGNED',
    {
      partnershipId: p.id,
      siteId,
      employer: siteLabel(site),
      kind,
      branchName: state.branches[hostBranchId]!.name,
      fee,
    },
    3,
    hostBranchId,
  );
  return ok({ partnershipId: p.id });
}

/** Renews for another full term in the last year, at fee × (1.5 − health/100). */
export function renewPartnership(
  state: GameState,
  partnershipId: string,
): CommandResult<{ fee: number }> {
  const p = state.partnerships[partnershipId];
  const site = p && state.world.sites[p.siteId];
  if (!p || !site || p.status !== 'active') return fail('That partnership has ended.');
  if (!canRenew(state, p)) return fail('Renewal opens in the last year of the contract.');
  const fee = renewalFee(state, site, p);
  if (state.company.cash < fee) return fail(`Not enough cash: you need ${money(fee)}.`);
  postCash(state, -fee, 'investing');
  p.termWeeks += PARTNER_CONTRACT_WEEKS;
  // `fee` totals every fee paid; the new one joins the intangible and amortizes over the new end.
  p.fee += fee;
  p.unamortized += fee;
  pushEvent(
    state,
    'PARTNERSHIP_RENEWED',
    { partnershipId: p.id, employer: siteLabel(site), fee },
    4,
    p.hostBranchId,
  );
  return ok({ fee });
}

/** Ends a partnership early: the balance runs off over 12 weeks and the fee is written off. */
export function releasePartnership(state: GameState, partnershipId: string): CommandResult {
  const p = state.partnerships[partnershipId];
  if (!p || p.status !== 'active') return fail('That partnership has already ended.');
  startRunoff(state, p, 'released');
  return ok();
}

/** Starts a university graduate program, paying the first year up front. */
export function startGradProgram(state: GameState, siteId: string): CommandResult {
  const site = state.world.sites[siteId];
  if (!site || site.kind !== 'university') return fail('That university is no longer on the map.');
  if (state.company.gradProgram) return fail('You already run a graduate program.');
  const cost = gradProgramCost(site);
  if (state.company.cash < cost) return fail(`Not enough cash: you need ${money(cost)}.`);
  spend(state, 'benefits', cost);
  state.company.gradProgram = {
    siteId,
    startWeek: state.clock.week,
    renewWeek: state.clock.week + WEEKS_PER_YEAR,
  };
  pushEvent(state, 'GRAD_PROGRAM', { siteId, university: siteLabel(site), cost, started: true }, 4);
  return ok();
}

/** Ends the graduate program; the year already paid isn't refunded. */
export function endGradProgram(state: GameState): CommandResult {
  const g = state.company.gradProgram;
  if (!g) return fail("You don't run a graduate program.");
  const site = state.world.sites[g.siteId];
  delete state.company.gradProgram;
  pushEvent(
    state,
    'GRAD_PROGRAM',
    { siteId: g.siteId, university: site ? siteLabel(site) : '', cost: 0, started: false },
    4,
  );
  return ok();
}
