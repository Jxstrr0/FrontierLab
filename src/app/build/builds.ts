// Read-only helpers for choosing a build: the options per slot, the cheapest
// possible build and a sensible starting pick: your last fit-out (SCREENS §4).
import {
  BUILD_SLOTS,
  EQUIPMENT,
  REFERENCE_BUILDS,
  type BuildSlot,
  type BuildSpec,
  type EquipmentSpec,
} from '../../data/equipment';
import { buildQuote } from '../../sim/commands';
import type { GameState } from '../../sim/state';

export { SLOT_LABEL } from '../../sim/commands/branches';

/** Options for one slot, cheapest first. */
export function optionsFor(slot: BuildSlot): EquipmentSpec[] {
  return Object.values(EQUIPMENT)
    .filter((e) => e.slot === slot)
    .sort((a, b) => a.cost - b.cost);
}

/** The cheapest part in every slot. */
export function cheapestBuild(): BuildSpec {
  const pick = {} as BuildSpec;
  for (const slot of BUILD_SLOTS) pick[slot] = optionsFor(slot)[0]!.id;
  return pick;
}

/**
 * The fit-out you last built with, so you don't have to pick every part again;
 * before your first build, the mid reference build if cash allows, then basic,
 * then the cheapest parts.
 */
export function defaultBuild(s: GameState, lotId: string): BuildSpec {
  const last = s.company.lastBuild;
  if (last && BUILD_SLOTS.every((slot) => EQUIPMENT[last[slot]]?.slot === slot)) return { ...last };
  for (const ref of [REFERENCE_BUILDS.mid, REFERENCE_BUILDS.basic]) {
    if (buildQuote(s, lotId, ref).total <= s.company.cash) return { ...ref };
  }
  return cheapestBuild();
}
