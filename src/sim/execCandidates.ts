// Executive candidate pools (SIMULATION §17.2): a few candidates per empty seat,
// refreshed every EXECUTIVES.refreshWeeks while the company has an Executive
// floor. Skills roll uniformly in EXECUTIVES.skillRange from the `execs` stream;
// a University Graduate Program adds its skill bonus. Names and portraits are
// drawn like branch managers'.
import { EXEC_PAY, EXECUTIVES } from '../config/balance';
import { EXEC_SEAT_ORDER, EXEC_SEATS } from '../data/executives';
import { execMarketSalary, hasExecFloor } from './execSeats';
import { newId } from './ids';
import { clamp, roundToStep } from './math';
import { gradSkillBonus } from './partnerships';
import { personName, randomAvatar } from './people';
import { stream, type Rng } from './rng';
import type { ExecSeat, Executive, GameState } from './state';

const SKILL_MAX = 100;

function rollSkill(rng: Rng, bonus: number): number {
  const [lo, hi] = EXECUTIVES.skillRange;
  return clamp(rng.int(lo, hi) + bonus, 0, SKILL_MAX);
}

/** Asking salary: market × (askBase + askSlope × average skill/100), in salary steps. */
export function askingSalary(
  market: number,
  exec: Pick<Executive, 'leadership' | 'expertise' | 'loyalty'>,
): number {
  const avg = (exec.leadership + exec.expertise + exec.loyalty) / 3;
  return roundToStep(
    market * (EXEC_PAY.askBase + (EXEC_PAY.askSlope * avg) / 100),
    EXEC_PAY.salaryStep,
  );
}

/** One candidate for a seat, delegations all off. */
export function generateExecutive(state: GameState, seat: ExecSeat): Executive {
  const rng = stream(state, 'execs');
  const bonus = gradSkillBonus(state);
  const leadership = rollSkill(rng, bonus);
  const expertise = rollSkill(rng, bonus);
  const loyalty = rollSkill(rng, bonus);
  const delegations: Record<string, boolean> = {};
  for (const d of EXEC_SEATS[seat].delegations) delegations[d.id] = false;
  return {
    id: newId(state, 'exec'),
    seat,
    name: personName(rng),
    portrait: randomAvatar(rng),
    leadership,
    expertise,
    loyalty,
    salary: askingSalary(execMarketSalary(state), { leadership, expertise, loyalty }),
    hiredWeek: state.clock.week,
    delegations,
    grants: [],
  };
}

/** Refreshes every seat's pool when stale (or forced); nothing without an Executive floor. */
export function refreshExecCandidates(state: GameState, force = false): void {
  if (!hasExecFloor(state)) return;
  const ex = state.executives;
  const stale =
    ex.candidatesRefreshWeek < 0 ||
    state.clock.week - ex.candidatesRefreshWeek >= EXECUTIVES.refreshWeeks;
  if (!force && !stale) return;
  for (const seat of EXEC_SEAT_ORDER) {
    const pool: Executive[] = [];
    for (let i = 0; i < EXECUTIVES.candidatesPerSeat; i++)
      pool.push(generateExecutive(state, seat));
    ex.candidates[seat] = pool;
  }
  ex.candidatesRefreshWeek = state.clock.week;
}
