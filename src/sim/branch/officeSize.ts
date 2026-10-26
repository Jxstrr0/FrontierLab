// Sales office size (stage C2a, SIMULATION §6.4): a branch's size level and the
// multiplier it applies to seats, staff, rent, overhead and interior fit-out,
// plus the whole-city traffic an office draws on (§9.1).
import { CITY_BRANCH_GUIDE, OFFICE_SIZES, OFFICE_TRAFFIC_MULT } from '../../config/balance';
import { CITIES } from '../../data/cities';
import type { BuildSlot } from '../../data/equipment';
import type { Branch, GameState } from '../state';

export const MAX_OFFICE_SIZE = OFFICE_SIZES.length - 1;

/** The multiplier for a size level (0 = Starter), clamped to the table. */
export function sizeMultOf(size: number): number {
  const i = Math.max(0, Math.min(MAX_OFFICE_SIZE, Math.floor(size)));
  return OFFICE_SIZES[i]!.mult;
}

/** How many offices' worth of HQ work this office makes (OFFICE_SIZES hqUnits). */
export function hqUnits(branch: Branch): number {
  const i = Math.max(0, Math.min(MAX_OFFICE_SIZE, Math.floor(branch.size ?? 0)));
  return OFFICE_SIZES[i]!.hqUnits;
}

/** This office's size multiplier. */
export function sizeMult(branch: Branch): number {
  return sizeMultOf(branch.size ?? 0);
}

export function sizeName(size: number): string {
  return OFFICE_SIZES[Math.max(0, Math.min(MAX_OFFICE_SIZE, size))]!.name;
}

/** Interior slots scale with size; the exterior is one piece. */
export const scalesWithSize = (slot: BuildSlot) => slot !== 'exterior';

/** Cost multiplier for a slot at a size. */
export function slotMult(slot: BuildSlot, size: number): number {
  return scalesWithSize(slot) ? sizeMultOf(size) : 1;
}

/**
 * §9.1 (C2a): an office's reach is the city's typical storefront traffic (the
 * median over its lots) × min(size multiplier, CITY_BRANCH_GUIDE) × density ×
 * OFFICE_TRAFFIC_MULT. A Starter draws like one storefront; growing the office
 * reaches more of the city, up to what a full branch network used to.
 */
export function officeTraffic(state: GameState, branch: Branch): number {
  const cityId = branch.cityId;
  const city = CITIES[cityId];
  if (!city) return 0;
  const traffic: number[] = [];
  for (const lot of Object.values(state.world.lots)) {
    if (lot.cityId === cityId) traffic.push(lot.footTraffic);
  }
  if (traffic.length === 0) return 0;
  traffic.sort((a, b) => a - b);
  const median = traffic[Math.floor(traffic.length / 2)]!;
  const reach = Math.min(sizeMult(branch), CITY_BRANCH_GUIDE[city.size]);
  return median * reach * (city.density ?? 1) * OFFICE_TRAFFIC_MULT;
}

/** True when the next size would reach more of the city (§9.1: reach caps at CITY_BRANCH_GUIDE). */
export function nextSizeAddsReach(branch: Branch): boolean {
  const city = CITIES[branch.cityId];
  const size = branch.size ?? 0;
  if (!city || size >= MAX_OFFICE_SIZE) return false;
  const guide = CITY_BRANCH_GUIDE[city.size];
  return Math.min(sizeMultOf(size + 1), guide) > Math.min(sizeMultOf(size), guide);
}

/** Your open or fitting-out office in a city, if any (one per city, C2a). */
export function officeInCity(state: GameState, cityId: string): Branch | undefined {
  for (const b of Object.values(state.branches)) {
    if (b.cityId === cityId && b.status !== 'closed') return b;
  }
  return undefined;
}
