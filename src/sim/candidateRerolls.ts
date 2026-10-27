// Paid candidate rerolls (SIMULATION §6.5, §17.2): a recruiter deals a fresh
// list of branch manager or executive candidates for a fee. The fee starts at
// CANDIDATE_REROLL.feeShare of the role's market salary and doubles with each
// reroll until the pool's free refresh resets it.
import { CANDIDATE_REROLL } from '../config/balance';
import { execMarketSalary } from './execSeats';
import { managerBaseSalary } from './payReviews';
import { dpow } from './detmath';
import type { ExecSeat, GameState } from './state';

function fee(market: number, rerolls: number): number {
  const f = market * CANDIDATE_REROLL.feeShare * dpow(CANDIDATE_REROLL.growth, rerolls);
  return Math.round(f / 100) * 100;
}

/** What the next manager reroll in a city costs (nothing with the developer tools' free rerolls). */
export function managerRerollFee(state: GameState, cityId: string): number {
  if (state.flags.devRerolls) return 0;
  return fee(managerBaseSalary(state, cityId), state.people.rerolls[cityId] ?? 0);
}

/** What the next reroll of an executive seat's candidates costs (nothing with free rerolls). */
export function execRerollFee(state: GameState, seat: ExecSeat): number {
  if (state.flags.devRerolls) return 0;
  return fee(execMarketSalary(state), state.executives.rerolls[seat] ?? 0);
}
