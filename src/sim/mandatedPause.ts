// The mandated pause and a revoked licence (stage C7a, SIMULATION §15; owner
// decision A11). After weeks with the safety ratio under the revoke line the
// regulator offers a voluntary pause (the RECAP_OFFER case): its monitors
// lift Safety coverage′ for a fee while new customers, deals and training
// stop. Declining, or still sitting under the line when the pause ends,
// revokes the licence: a long pause, then a restart under strict watch. Never
// game over, and your personal fortune is untouched.
import { LICENCE, MANDATED_PAUSE as P } from '../config/balance';
import { pushEvent } from './events';
import { addEffect } from './incident/effects';
import { roundToStep } from './math';
import { trailingRevenue } from './riskFloor';
import { isPaused } from './safety';
import type { GameState } from './state';

/** The regulator's monitors' fee for a voluntary pause. */
export function pauseFee(state: GameState): number {
  return roundToStep(Math.max(P.minFee, P.feeShare * trailingRevenue(state)), P.feeStep);
}

/**
 * Accepts the voluntary pause: the monitors and `weeks` without new business.
 * The fee is the case's option cost, which the incident desk charges.
 */
export function acceptPause(state: GameState, fee: number): void {
  const week = state.clock.week;
  addEffect(state, 'riskCoverage', 'company', P.monitorLift, P.weeks);
  state.company.pause = { reason: 'voluntary', untilWeek: week + P.weeks };
  state.incidents.recap = {
    offeredWeek: state.incidents.recap?.offeredWeek ?? week,
    acceptedWeek: week,
  };
  pushEvent(state, 'SAFETY_PAUSE', { bank: state.meta.bankName, weeks: P.weeks, fee }, 1);
}

/** The regulator revokes the licence: a long pause, then strict watch. */
export function revokeLicence(state: GameState): void {
  const week = state.clock.week;
  const c = state.company;
  c.pause = { reason: 'revoked', untilWeek: week + LICENCE.pauseWeeks };
  c.watchUntilWeek = week + LICENCE.pauseWeeks + LICENCE.watchWeeks;
  c.lowCapitalWeeks = 0;
  delete state.incidents.recap;
  pushEvent(state, 'LICENCE_REVOKED', { bank: state.meta.bankName, weeks: LICENCE.pauseWeeks }, 1);
}

/**
 * Tick step 10: a pause that has run its course ends. After a voluntary pause
 * the ratio must be back over the line, or the licence goes; a revoked licence
 * is restored and strict watch begins.
 */
export function checkPause(state: GameState): void {
  const c = state.company;
  const p = c.pause;
  if (!p || isPaused(state)) return;
  delete c.pause;
  if (p.reason === 'revoked') {
    pushEvent(state, 'LICENCE_RESTORED', { bank: state.meta.bankName }, 2);
    return;
  }
  delete state.incidents.recap;
  if (c.safetyRatio < P.revokeLine) revokeLicence(state);
  else c.lowCapitalWeeks = 0;
}
