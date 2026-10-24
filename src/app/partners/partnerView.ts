// Read-only views for the employer and university panels (SCREENS §14–15):
// the expected-deposits curve, the type label, average income, who holds the
// payroll today and the default host/package picks. Formulas come from
// src/sim/partnerships.ts so the panel and the simulation always agree.
import { PARTNER_CONTRACT_WEEKS, PARTNER_HEALTH } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { BASE_ANNUAL_INCOME, EMPLOYER_TYPES } from '../../data/employers';
import {
  balanceTarget,
  hostCandidates,
  packageOptions,
  participation,
  type PartnershipKind,
} from '../../sim/partnerships';
import { baseId, productSpec } from '../../sim/products';
import type { GameState, Partnership, Site } from '../../sim/state';

/** Weeks between points on the curve chart. */
export const CURVE_STEP_WEEKS = 4;

/** Expected deposits every 4 weeks of the contract at a given health. */
export function expectedCurve(
  site: Site,
  kind: PartnershipKind,
  health: number = PARTNER_HEALTH.start,
  termWeeks: number = PARTNER_CONTRACT_WEEKS,
  fromWeek = 0,
): number[] {
  const out: number[] = [];
  for (let t = fromWeek; t <= termWeeks; t += CURVE_STEP_WEEKS)
    out.push(balanceTarget(site, kind, participation(t, termWeeks), health));
  return out;
}

/** The current contract's curve and where you are on it (renewals start a new contract). */
export function contractCurve(state: GameState, site: Site, p: Partnership) {
  const elapsed = Math.max(0, state.clock.week - p.startWeek);
  const from = Math.max(0, p.termWeeks - PARTNER_CONTRACT_WEEKS);
  const values: number[] = [];
  for (let t = from; t <= p.termWeeks; t += CURVE_STEP_WEEKS)
    values.push(balanceTarget(site, p.kind, participation(t, p.termWeeks), p.health));
  return { values, marker: Math.round((elapsed - from) / CURVE_STEP_WEEKS) };
}

export function typeLabel(site: Site): string {
  return EMPLOYER_TYPES[site.employer?.type ?? '']?.label ?? 'Employer';
}

/** Average yearly pay: a base salary × the employer's income mult × the city's incomeIndex. */
export function averageIncome(site: Site): number {
  const city = CITIES[site.cityId]?.incomeIndex ?? 1;
  return BASE_ANNUAL_INCOME * (site.employer?.incomeMult ?? 1) * city;
}

/** "You", the rival bank holding the payroll, or "None". */
export function currentPartner(state: GameState, site: Site, mine: boolean): string {
  if (mine) return state.meta.bankName;
  const rival = site.employer?.partnerRivalId;
  return rival ? (state.rivals[rival]?.name ?? 'Another bank') : 'None';
}

/** Default package: a student account for students, chequing for payroll, else the first offered. */
export function defaultPackage(
  state: GameState,
  hostId: string | undefined,
  kind: PartnershipKind,
) {
  const host = hostId ? state.branches[hostId] : undefined;
  if (!host) return undefined;
  const options = packageOptions(state, host);
  const want = kind === 'student' ? 'student' : 'chequing';
  return (
    options.find((pid) => {
      const spec = productSpec(state, pid);
      return spec && baseId(spec) === want;
    }) ?? options[0]
  );
}

export function defaultHost(state: GameState, site: Site): string | undefined {
  return hostCandidates(state, site.cityId)[0]?.id;
}

export function productName(state: GameState, productId: string): string {
  return productSpec(state, productId)?.name ?? productId;
}

/** Partnership mini-books hosted at a branch on one package product (§13.7 "incl. partners"). */
export function partnerTotals(state: GameState, branchId: string, productId: string) {
  let balance = 0;
  let accounts = 0;
  let count = 0;
  for (const p of Object.values(state.partnerships)) {
    if (p.hostBranchId !== branchId || p.productId !== productId) continue;
    balance += p.balance;
    accounts += p.accounts;
    count += 1;
  }
  return { balance, accounts, count };
}
