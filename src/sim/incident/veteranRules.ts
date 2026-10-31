// The veteran's desk (CONTENT §22c, 2026-10-31): six company cases for a lab
// three years old or more. Every case rolls at VETERAN_DESK.baseP while the desk
// is open (from fromWeek, with an open sales office, no veteran case pending and
// gapWeeks since the last) and fires once a game (cooldown INCIDENTS.onceWeeks).
// Numbers in src/data/incidentParamsVeteran.ts.
import { VETERAN_DESK } from '../../config/balance';
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import type { GameState } from '../state';
import { addEffect } from './effects';
import { bumpAwareness, openBranches } from './founderRules';
import { bumpMorale, incidentScale, num, ratingHit, type IncidentRule } from './helpers';

const P = INCIDENT_PARAMS;
const DESK_KEY = 'VETERAN_DESK:company';

/** True while the veteran's desk takes cases: year 3 on, an open office, none pending, gap kept. */
export function veteranDeskOpen(state: GameState): boolean {
  if (state.clock.week < VETERAN_DESK.fromWeek) return false;
  if (openBranches(state).length === 0) return false;
  if (state.incidents.active.some((i) => i.type in VETERAN_RULES)) return false;
  return (state.incidents.cooldowns[DESK_KEY] ?? 0) <= state.clock.week;
}

const deskChance = (state: GameState, type: string, when = true): number =>
  veteranDeskOpen(state) && when ? (INCIDENT_SPECS[type]?.baseP ?? 0) : 0;

const restDesk = (state: GameState): void => {
  state.incidents.cooldowns[DESK_KEY] = state.clock.week + VETERAN_DESK.gapWeeks;
};

const moraleEverywhere = (state: GameState, delta: number): void => {
  for (const b of openBranches(state)) bumpMorale(b, delta);
};

const HEARING_SUMMONS: IncidentRule = {
  chance: (state) => deskChance(state, 'HEARING_SUMMONS'),
  prepare(state, _scope, data) {
    data.prep = P.HEARING_SUMMONS.prepCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ testify: num(data, 'prep'), decline: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId, rng) {
    const h = P.HEARING_SUMMONS;
    if (optionId === 'decline') {
      ratingHit(state, 'company', 'overall', h.declineOverall, h.declineWeeks);
      return;
    }
    bumpAwareness(state, h.awareness);
    if (!rng.chance(h.gaffeChance)) return 'You held your ground. The clips are kind.';
    ratingHit(state, 'company', 'overall', h.gaffeOverall, h.gaffeWeeks);
    return 'One answer went badly, and it is the one on every channel.';
  },
};

const OPEN_LETTER: IncidentRule = {
  chance: (state) => deskChance(state, 'OPEN_LETTER'),
  costs: () => ({ sign: 0, ignore: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    const o = P.OPEN_LETTER;
    if (optionId === 'sign') {
      addEffect(state, 'riskCoverage', 'company', o.signCoverage, o.signCoverageWeeks);
      ratingHit(state, 'company', 'products', o.signProducts, o.signProductsWeeks);
    } else {
      ratingHit(state, 'company', 'overall', o.ignoreOverall, o.ignoreWeeks);
    }
  },
};

const SENTIENCE_CLAIM: IncidentRule = {
  chance: (state) => deskChance(state, 'SENTIENCE_CLAIM', state.training.generation > 0),
  prepare(state, _scope, data) {
    data.study = P.SENTIENCE_CLAIM.studyCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ study: num(data, 'study'), leave: 0, talk: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    const c = P.SENTIENCE_CLAIM;
    if (optionId === 'leave') moraleEverywhere(state, c.leaveMorale);
    else if (optionId === 'talk') {
      bumpAwareness(state, c.talkAwareness);
      ratingHit(state, 'company', 'overall', c.talkOverall, c.talkWeeks);
    }
  },
};

const DOCUMENTARY: IncidentRule = {
  chance: (state) => deskChance(state, 'DOCUMENTARY'),
  prepare(_state, _scope, data) {
    data.risk = P.DOCUMENTARY.unkindChance;
  },
  costs: () => ({ open: 0, decline: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId, rng) {
    if (optionId !== 'open') return;
    const d = P.DOCUMENTARY;
    bumpAwareness(state, d.awareness);
    if (!rng.chance(d.unkindChance)) return 'The film came out warm. Sign-ups noticed.';
    ratingHit(state, 'company', 'overall', d.unkindOverall, d.unkindWeeks);
    return 'The edit was not kind. Everyone watched it anyway.';
  },
};

const REUNION: IncidentRule = {
  chance: (state) => deskChance(state, 'REUNION'),
  prepare(state, _scope, data) {
    data.party = P.REUNION.partyCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ party: num(data, 'party'), card: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    if (optionId === 'party') moraleEverywhere(state, P.REUNION.morale);
  },
};

const SAFETY_AUDIT_ASK: IncidentRule = {
  chance: (state) =>
    deskChance(
      state,
      'SAFETY_AUDIT_ASK',
      openBranches(state).some((b) => (b.books.api?.balance ?? 0) > 0),
    ),
  prepare(state, _scope, data) {
    data.audit = P.SAFETY_AUDIT_ASK.auditCost * incidentScale(state);
  },
  costs: (_s, _scope, data) => ({ audit: num(data, 'audit'), refuse: 0 }),
  onRaise: restDesk,
  apply(state, _inc, optionId) {
    const a = P.SAFETY_AUDIT_ASK;
    if (optionId === 'audit')
      addEffect(state, 'takeup', 'company', a.auditTakeup, a.auditWeeks, a.product);
    else addEffect(state, 'takeup', 'company', a.refuseTakeup, a.refuseWeeks, a.product);
  },
};

export const VETERAN_RULES: Record<string, IncidentRule> = {
  HEARING_SUMMONS,
  OPEN_LETTER,
  SENTIENCE_CLAIM,
  DOCUMENTARY,
  REUNION,
  SAFETY_AUDIT_ASK,
};
