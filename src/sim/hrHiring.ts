// Manager vacancies (SIMULATION §17.2): the open sales offices with no manager
// and the strongest candidate in a city's pool, read by the COO's Sales office
// operations (execDelegationsPeople.ts) and the HR floor's count. Until schema
// 22 the HR floor had its own hiring switch; the COO's is the one way now.
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
