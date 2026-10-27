// Incidents at the product and compute end of the lab (CONTENT §22, 2026-10-27):
// deepfake misuse of the Creative Suite at a sales office, a fire at one of
// your data centers and a grid failure at an energy site. The two data-center
// cases are company-scope rolls that pick a data center when raised, so the
// engine needs no new scope kind; the case text names it.
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import { CITIES } from '../../data/cities';
import { runningGpus, usableGpus } from '../dataCenters';
import { pushEvent } from '../events';
import type { Rng } from '../rng';
import type { DataCenter, GameState } from '../state';
import { addEffect, incidentPMult } from './effects';
import { maybeNews, num, ratingHit, type IncidentRule } from './helpers';

const P = INCIDENT_PARAMS;
const baseP = (type: string) => INCIDENT_SPECS[type]?.baseP ?? 0;
const byId = (a: DataCenter, b: DataCenter) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Open data centers, every one for a fire, only those at an energy site for the grid. */
function exposed(state: GameState, energySite: boolean): DataCenter[] {
  return Object.values(state.dataCenters)
    .filter((d) => d.status === 'open' && usableGpus(d.build) > 0 && (!energySite || !!d.siteId))
    .sort(byId);
}

/** One of the exposed data centers, picked when the case is raised. */
function pickDataCenter(state: GameState, rng: Rng, energySite: boolean) {
  const list = exposed(state, energySite);
  const dc = rng.pick(list);
  return { dataCenterId: dc.id, name: dc.name };
}

const dcOf = (state: GameState, data: Record<string, number | string>) =>
  state.dataCenters[String(data.dataCenterId ?? '')];

const DEEPFAKE: IncidentRule = {
  // Sales offices selling the Creative Suite with users on it.
  chance(state, scope) {
    const b = state.branches[scope];
    const book = b?.books[P.DEEPFAKE.product];
    if (!b || b.offered[P.DEEPFAKE.product]?.on !== true || (book?.accounts ?? 0) <= 0) return 0;
    return baseP('DEEPFAKE') * incidentPMult(state, 'DEEPFAKE', scope);
  },
  prepare(state, scope, data) {
    data.city = CITIES[state.branches[scope]?.cityId ?? '']?.name ?? 'the city';
    data.watermark = P.DEEPFAKE.watermarkCost;
  },
  costs: () => ({ watermark: P.DEEPFAKE.watermarkCost, pull: 0, statement: 0 }),
  apply(state, inc, optionId, rng) {
    const b = state.branches[inc.scope];
    if (!b) return;
    const d = P.DEEPFAKE;
    if (optionId === 'watermark') {
      ratingHit(state, b.id, 'service', d.watermarkService, d.watermarkWeeks);
    } else if (optionId === 'pull') {
      addEffect(state, 'pulled', b.id, 1, d.pullWeeks, d.product);
    } else {
      b.awareness = Math.max(0, b.awareness - d.statementAwareness);
      maybeNews(state, d.statementNews, rng, 'DEEPFAKE', b);
    }
  },
};

const DC_FIRE: IncidentRule = {
  // Each open data center carries the base chance.
  chance: (state) =>
    baseP('DC_FIRE') * exposed(state, false).length * incidentPMult(state, 'DC_FIRE', 'company'),
  roll(state, _scope, rng) {
    const pick = pickDataCenter(state, rng, false);
    const dc = state.dataCenters[pick.dataCenterId]!;
    return { ...pick, repair: usableGpus(dc.build) * P.DC_FIRE.repairPerGpu };
  },
  costs: (_s, _scope, data) => ({ repair: num(data, 'repair'), derate: 0 }),
  apply(state, inc, optionId) {
    const dc = dcOf(state, inc.data);
    if (optionId !== 'derate' || !dc) return;
    addEffect(state, 'gpuDerate', dc.id, P.DC_FIRE.derate, P.DC_FIRE.derateWeeks);
  },
};

const GRID_FAILURE: IncidentRule = {
  // Each open data center at an energy site carries the base chance.
  chance: (state) =>
    baseP('GRID_FAILURE') *
    exposed(state, true).length *
    incidentPMult(state, 'GRID_FAILURE', 'company'),
  roll(state, _scope, rng) {
    const pick = pickDataCenter(state, rng, true);
    const dc = state.dataCenters[pick.dataCenterId]!;
    return { ...pick, diesel: runningGpus(state, dc) * P.GRID_FAILURE.dieselPerGpu };
  },
  costs: (_s, _scope, data) => ({ diesel: num(data, 'diesel'), outage: 0 }),
  apply(state, inc, optionId) {
    if (optionId !== 'outage') return;
    // §13.0: the compute outage clock runs; churn rises and contracts may walk (§11.2).
    const c = state.compute;
    c.outageWeeksLeft = Math.max(c.outageWeeksLeft, P.GRID_FAILURE.outageWeeks);
    pushEvent(
      state,
      'GRID_OUTAGE',
      { bank: state.meta.bankName, name: String(inc.data.name ?? 'a data center') },
      2,
    );
  },
};

export const COMPUTE_RULES: Record<string, IncidentRule> = { DEEPFAKE, DC_FIRE, GRID_FAILURE };
