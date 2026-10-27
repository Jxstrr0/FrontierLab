// Read-only wording for the Finance floor's launch posture card (SCREENS §10,
// SIMULATION §16.8, §17.2): level names, what a level does to deals, safety
// and over-claims, and who else is steering the dial. Nothing here mutates GameState.
import { EXEC_DELEGATION, LAUNCH_POSTURE } from '../../../config/balance';
import { INCIDENT_PARAMS } from '../../../data/incidents';
import type { GameState } from '../../../sim/state';

// ─── Launch posture (SIMULATION §16.8) ────────────────────────────────────────

export const RISK_LABELS = ['Very cautious', 'Cautious', 'Balanced', 'Bold', 'Very bold'] as const;

const pts = (x: number) => Math.round(Math.abs(x) * 100);

/** One line on what a launch posture level does. */
export function riskHint(level: number): string {
  const i = level - 1;
  const edge = LAUNCH_POSTURE.dealEdge[i] ?? 0;
  const exposure = LAUNCH_POSTURE.exposure[i] ?? 0;
  if (edge === 0 && exposure === 0) return 'Standard deal odds and safety risk.';
  const deals = `Deal odds ${edge > 0 ? '+' : '−'}${pts(edge)} pts`;
  const safety = `safety exposure ${exposure > 0 ? '+' : '−'}${pts(exposure)}%`;
  const claims =
    level >= INCIDENT_PARAMS.MIS_SELLING.appetiteFrom ? ', and over-claims are likelier' : '';
  return `${deals}, ${safety}${claims}.`;
}

/**
 * Who else moves the dial (SIMULATION §17.2): the CSO tunes it to the safety
 * tier. Undefined when no CSO is seated with the switch on, so the card says nothing.
 */
export function riskSteering(s: GameState): string | undefined {
  if (!s.executives.seats.cro?.delegations.appetite) return undefined;
  return `Your CSO tunes this to the safety tier every ${EXEC_DELEGATION.croEveryWeeks} weeks. You can still set it yourself.`;
}
