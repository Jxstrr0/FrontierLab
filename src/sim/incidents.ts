// Incidents (SIMULATION §23, CONTENT §22): weekly rolls, cooldowns, delegation,
// deadlines and the timed effects choices leave behind. Stage 5 foundation stub:
// other systems raise incidents through `raiseIncident`.
import type { GameState, Incident, IncidentScopeKind } from './state';

/**
 * Opens an incident of `type` for `scope` (branch id, city id, 'company' or
 * 'personal'), with amounts already rolled in `data`. Returns undefined when
 * the type is on cooldown for that scope.
 */
export function raiseIncident(
  _state: GameState,
  _type: string,
  _scopeKind: IncidentScopeKind,
  _scope: string,
  _data: Record<string, number | string> = {},
): Incident | undefined {
  return undefined;
}

/** Tick step 15: roll new incidents, apply deadlines, expire timed effects. */
export function runIncidents(_state: GameState): void {}
