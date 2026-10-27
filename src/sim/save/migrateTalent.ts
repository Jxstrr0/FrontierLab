// Save migration 15 → 16 (stage C6c): the talent war and the Chief Scientist.
// Seeds the researchers (most at rival labs) and, with an Executive floor,
// candidates for the new ninth seat so it can be filled straight away.
import { generateExecutive } from '../execCandidates';
import type { GameState } from '../state';
import { seedResearchers } from '../talent';
import { EXECUTIVES } from '../../config/balance';

export function migrateTalent(state: GameState): void {
  state.talent = { researchers: {} };
  seedResearchers(state);
  if (state.departments.executive && !state.executives.candidates.csci) {
    state.executives.candidates.csci = Array.from({ length: EXECUTIVES.candidatesPerSeat }, () =>
      generateExecutive(state, 'csci'),
    );
  }
}
