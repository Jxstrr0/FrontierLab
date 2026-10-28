// Talent war commands (stage C6c, SIMULATION §16.13): hire a researcher from
// the market or away from a rival lab (salary premium and signing bonus), or
// let one of yours go back on the market.
import { RESEARCHERS, WEEKS_PER_YEAR } from '../../config/balance';
import { pushEvent } from '../events';
import { spend } from '../ledger';
import type { GameState } from '../state';
import { hireTerms, yourResearchers } from '../talent';
import { fail, money, ok, type CommandResult } from './result';

export function hireResearcher(state: GameState, researcherId: string): CommandResult {
  if (!state.departments.products) return fail('Researchers work on the HQ Products floor.');
  const r = state.talent.researchers[researcherId];
  if (!r) return fail('No such researcher.');
  if (r.employer?.type === 'player') return fail(`${r.name} already works for you.`);
  if (yourResearchers(state).length >= RESEARCHERS.maxTeam)
    return fail(`Your research team is full (${RESEARCHERS.maxTeam}).`);
  const { salary, signing } = hireTerms(state, r);
  const upFront = signing + salary / WEEKS_PER_YEAR;
  if (state.company.cash < upFront) return fail(`You need ${money(state, upFront)} in cash.`);
  const from = r.employer?.type === 'rival' ? state.rivals[r.employer.id]?.name : undefined;
  if (signing > 0) spend(state, 'hqStaff', signing);
  r.salary = salary;
  r.employer = { type: 'player' };
  r.joinedWeek = state.clock.week;
  pushEvent(
    state,
    'RESEARCHER_HIRED',
    { researcherId: r.id, name: r.name, stars: r.stars, ...(from ? { from } : {}) },
    r.stars >= 4 || from ? 2 : 3,
  );
  return ok();
}

/** Lets one of your researchers go: they go back on the market. */
export function releaseResearcher(state: GameState, researcherId: string): CommandResult {
  const r = state.talent.researchers[researcherId];
  if (r?.employer?.type !== 'player') return fail('They don’t work for you.');
  delete r.employer;
  delete r.joinedWeek;
  return ok();
}
