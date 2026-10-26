// HR fills manager vacancies (SIMULATION §16.11): with an HR floor and the
// switch on (people.hrHiring), each week every open branch without a manager
// gets the strongest candidate in its city, through the same hireManager
// command the player uses. Unlike the COO's Branch operations (§17.2) it
// leaves the branch's delegations as they are. Runs after the executives, so
// a COO doing the same job hires first and switches delegation on.
import { hireManager } from './commands/staff';
import type { GameState, Manager } from './state';

/** The candidate with the highest total of their four skills (ties: first listed). */
export function strongestCandidate(pool: readonly Manager[]): Manager | undefined {
  const total = (m: Manager) =>
    m.skills.people + m.skills.product + m.skills.marketing + m.skills.ethics;
  return [...pool].sort((a, b) => total(b) - total(a))[0];
}

/** Open branches with no manager. */
export function unstaffedBranches(state: GameState) {
  return Object.values(state.branches).filter((b) => b.status === 'open' && !b.managerId);
}

/** Weekly: HR hires for every vacancy it can fill. Returns how many it hired. */
export function hrFillVacancies(state: GameState): number {
  if (!state.departments.hr || !state.people.hrHiring) return 0;
  let hired = 0;
  for (const branch of unstaffedBranches(state)) {
    const best = strongestCandidate(state.people.managerCandidates[branch.cityId] ?? []);
    if (best && hireManager(state, branch.id, best.id).ok) hired += 1;
  }
  return hired;
}
