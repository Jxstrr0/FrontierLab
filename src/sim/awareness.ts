// One awareness number per city (SIMULATION §7, audit batch D): the city's
// sales office holds it. Office campaigns, HQ brand campaigns, agency launch
// campaigns and kit sponsorship all raise it with the same saturating shape,
// gain × (1 − a); an exposed lobbying campaign knocks it down. A city without
// an open or fitting-out office has none.
import type { Branch, GameState } from './state';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** The lab's sales office in a city (one per city), if it isn't closed. */
export function officeIn(state: GameState, cityId: string): Branch | undefined {
  return Object.values(state.branches).find((b) => b.cityId === cityId && b.status !== 'closed');
}

/** Awareness in a city, 0–1: its office's, or 0 without one. */
export function cityAwareness(state: GameState, cityId: string): number {
  return officeIn(state, cityId)?.awareness ?? 0;
}

/** §7: raises a city's awareness by gain × (1 − a). */
export function raiseCityAwareness(state: GameState, cityId: string, gain: number): void {
  const office = officeIn(state, cityId);
  if (office && gain > 0)
    office.awareness = clamp01(office.awareness + gain * (1 - office.awareness));
}

/** Knocks a city's awareness down by a flat amount (a scandal). */
export function lowerCityAwareness(state: GameState, cityId: string, amount: number): void {
  const office = officeIn(state, cityId);
  if (office) office.awareness = clamp01(office.awareness - amount);
}
