// The talent war's case (stage C6c, SIMULATION §16.13): RESEARCHER_POACHED,
// raised when a rival lab bids for one of your researchers (talent.ts, scope =
// the researcher's id). Counter-offer raises their salary; letting them go
// sends them to the rival, whose model releases they now lift.
import { RESEARCHERS } from '../../config/balance';
import { pushEvent } from '../events';
import { roundToStep } from '../math';
import type { GameState, Incident, Researcher } from '../state';
import type { IncidentRule } from './helpers';

/** The researcher the case is about, if they still work for you. */
function target(state: GameState, inc: Incident): Researcher | undefined {
  const r = state.talent.researchers[String(inc.data.researcherId ?? inc.scope)];
  return r?.employer?.type === 'player' ? r : undefined;
}

export const RESEARCHER_POACHED: IncidentRule = {
  prepare(state, scope, data) {
    // Forced from debug tools with a generic scope: pick your first researcher.
    const r =
      state.talent.researchers[String(data.researcherId ?? scope)] ??
      Object.values(state.talent.researchers).find((x) => x.employer?.type === 'player');
    if (r) {
      data.researcherId ??= r.id;
      data.name ??= r.name;
    }
    data.name ??= 'a researcher';
    const rival = Object.values(state.rivals)
      .filter((x) => x.status === 'active')
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    data.rivalId ??= rival?.id ?? '';
    data.rival ??= rival?.name ?? 'A rival lab';
  },
  costs: () => ({ counter: 0, release: 0 }),
  apply(state, inc, optionId) {
    const r = target(state, inc);
    if (!r) return 'They had already left.';
    if (optionId === 'counter') {
      r.salary = roundToStep(r.salary * (1 + RESEARCHERS.counterRaise), RESEARCHERS.salaryStep);
      return `${r.name} stays on.`;
    }
    const rival = state.rivals[String(inc.data.rivalId)];
    if (rival?.status === 'active') {
      r.employer = { type: 'rival', id: rival.id };
      r.joinedWeek = state.clock.week;
    } else {
      delete r.employer;
      delete r.joinedWeek;
    }
    pushEvent(
      state,
      'RESEARCHER_LEFT',
      { researcherId: r.id, name: r.name, stars: r.stars, rival: String(inc.data.rival) },
      r.stars >= 4 ? 2 : 3,
    );
    return `${r.name} has left for ${String(inc.data.rival)}.`;
  },
};
