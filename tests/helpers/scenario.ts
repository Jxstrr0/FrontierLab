// Scripted test scenarios: a new game plus a fixed list of player commands.
import { REFERENCE_BUILDS } from '../../src/data/equipment';
import type { DeptId } from '../../src/data/types';
import * as cmd from '../../src/sim/commands';
import { advanceDay, advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';

export const LENDING = ['personal_loan', 'auto_loan', 'mortgage', 'loc', 'credit_card'];

export function freeLot(state: GameState, district?: string) {
  const lots = Object.values(state.world.lots).filter(
    (l) => !l.occupant && (!district || l.district === district),
  );
  return lots.sort((a, b) => a.id.localeCompare(b.id))[0]!;
}

/** Builds a mid branch, hires the first candidate, turns on lending and delegates. */
export function openScriptedBranch(state: GameState, district?: string): string {
  const lot = freeLot(state, district);
  const r = cmd.buildBranch(state, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
  if (!r.ok) throw new Error(r.reason);
  const cand = state.people.managerCandidates[lot.cityId]![0]!;
  cmd.hireManager(state, r.branchId, cand.id);
  for (const p of LENDING) cmd.setOffered(state, r.branchId, p, true);
  cmd.setDelegation(state, r.branchId, 'staffing', true);
  cmd.setDelegation(state, r.branchId, 'loans', true);
  cmd.setDelegation(state, r.branchId, 'marketing', true);
  return r.branchId;
}

/** Leases the first office listing with Finance, HR and Risk floors (Stage 4). */
export function leaseScriptedOffice(state: GameState): string | undefined {
  const listing = Object.values(state.world.officeListings)
    .filter((l) => !l.officeId && l.cityId === state.world.currentCityId)
    .sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!listing) return undefined;
  const r = cmd.leaseOffice(state, listing.id, ['finance', 'hr', 'risk']);
  return r.ok ? r.officeId : undefined;
}

/**
 * The determinism script: seed 42 in Calgary, one branch on day 0, a second at
 * week 40 when cash allows, a price change and a treasury transfer along the way, then an HQ office with
 * three floors at week 80 and a lunch benefit at week 100.
 * `onWeek` runs after every weekly tick.
 */
export function runScript(weeks: number, onWeek?: (s: GameState, week: number) => void): GameState {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Bank' });
  const first = openScriptedBranch(s, 'midtown');
  for (let day = 1; day <= weeks * 7; day++) {
    advanceDay(s);
    if (day % 7 !== 0) continue;
    const week = day / 7;
    if (week === 10) cmd.setPrice(s, first, 'savings', 0.03);
    if (week === 20) cmd.setCampaignLevel(s, first, 'charging', 1);
    if (week === 40 && s.company.cash > 500_000) openScriptedBranch(s, 'downtown');
    if (week === 60) cmd.transferToTreasury(s, 100_000);
    if (week === 80) leaseScriptedOffice(s);
    if (week === 100) cmd.setBenefit(s, 'lunch', 40);
    onWeek?.(s, week);
  }
  return s;
}

/**
 * A bank with one branch run for `weeks`, extra paid-in capital (so the balance
 * identity still holds) and an HQ office with the given floors (Stage 4 tests).
 */
export function bankWithFloors(
  depts: DeptId[],
  opts: { cityId?: string; weeks?: number; capital?: number } = {},
): GameState {
  const s = newGame({ seed: 42, cityId: opts.cityId ?? 'cal', bankName: 'Test Bank' });
  openScriptedBranch(s, 'midtown');
  advanceWeeks(s, opts.weeks ?? 26);
  const capital = opts.capital ?? 5_000_000;
  s.company.cash += capital;
  s.company.paidInCapital += capital;
  if (depts.length === 0) return s;
  const listing = Object.values(s.world.officeListings)
    .filter((l) => !l.officeId && l.cityId === s.world.currentCityId && l.floors >= depts.length)
    .sort((a, b) => a.id.localeCompare(b.id))[0]!;
  const r = cmd.leaseOffice(s, listing.id, depts);
  if (!r.ok) throw new Error(r.reason);
  return s;
}
