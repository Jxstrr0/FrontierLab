// Read-only helpers for choosing a build: the options per slot, the cheapest
// possible build and a sensible starting pick (SCREENS §4).
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

export const SLOT_LABEL: Record<BuildSlot, string> = {
  exterior: 'Exterior',
  lobby: 'Lobby',
  teller: 'Teller line',
  vault: 'Vault',
  atm: 'ATM',
};

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

/** The mid reference build if cash allows, then basic, then the cheapest parts. */
export function defaultBuild(s: GameState, lotId: string): BuildSpec {
  for (const ref of [REFERENCE_BUILDS.mid, REFERENCE_BUILDS.basic]) {
    if (buildQuote(s, lotId, ref).total <= s.company.cash) return { ...ref };
  }
  return cheapestBuild();
}
