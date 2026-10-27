// AI-native company incidents (CONTENT §22, 2026-10-27): a jailbreak going
// viral, a hallucination lawsuit, a training-data copyright suit and a leak of
// the model's weights. Each rule gives the weekly chance, the rolled amounts,
// option costs and what each option does; numbers in incidentParams.ts.
import { INCIDENT_PARAMS, INCIDENT_SPECS } from '../../data/incidents';
import { companyArr } from '../arr';
import { ctoExpertise } from '../execSeats';
import { pushEvent } from '../events';
import { spend } from '../ledger';
import { safetyStrength } from '../safety';
import type { GameState } from '../state';
import { RADAR, activeModel, trainedRadar } from '../underwriting';
import { addEffect, incidentPMult } from './effects';
import { maybeNews, num, ratingHit, type IncidentRule } from './helpers';
import { compactMoney } from './text';

const P = INCIDENT_PARAMS;
const baseP = (type: string) => INCIDENT_SPECS[type]?.baseP ?? 0;
const totalCustomers = (state: GameState) =>
  Object.values(state.branches).reduce((s, b) => s + (b.status === 'open' ? b.customers : 0), 0);
const trainedModels = (state: GameState) =>
  Object.values(state.underwriting.models).filter((m) => m.source === 'trained');

const JAILBREAK: IncidentRule = {
  // × (1.3 − model Safety axis/10): a safer model resists more prompts.
  chance(state) {
    if (totalCustomers(state) <= 0) return 0;
    const safety = activeModel(state).radar[RADAR.safety];
    return (
      baseP('JAILBREAK') *
      Math.max(0, P.JAILBREAK.safetyBase - safety / 10) *
      incidentPMult(state, 'JAILBREAK', 'company')
    );
  },
  prepare(_s, _scope, data) {
    data.patch = P.JAILBREAK.patchCost;
    data.postMortem = P.JAILBREAK.postMortemCost;
  },
  costs: () => ({
    patch: P.JAILBREAK.patchCost,
    ignore: 0,
    postmortem: P.JAILBREAK.postMortemCost,
  }),
  apply(state, _inc, optionId, rng) {
    const j = P.JAILBREAK;
    if (optionId === 'patch') {
      ratingHit(state, 'company', 'products', j.patchProducts, j.patchWeeks);
    } else if (optionId === 'postmortem') {
      addEffect(state, 'riskCoverage', 'company', j.postMortemSafety, j.postMortemWeeks);
    } else {
      addEffect(state, 'riskCoverage', 'company', j.ignoreSafety, j.ignoreSafetyWeeks);
      ratingHit(state, 'company', 'overall', j.ignoreOverall, j.ignoreWeeks);
      maybeNews(state, j.ignoreNews, rng, 'JAILBREAK');
    }
  },
};

const HALLUCINATION_SUIT: IncidentRule = {
  // × (1.3 − model Reasoning axis/10): a sharper model is wrong less often.
  chance(state) {
    if (totalCustomers(state) <= 0) return 0;
    const reasoning = activeModel(state).radar[RADAR.reasoning];
    return (
      baseP('HALLUCINATION_SUIT') *
      Math.max(0, P.HALLUCINATION_SUIT.reasoningBase - reasoning / 10) *
      incidentPMult(state, 'HALLUCINATION_SUIT', 'company')
    );
  },
  roll(state) {
    const h = P.HALLUCINATION_SUIT;
    const settle = Math.max(h.minSettle, h.settleShare * companyArr(state));
    return { settle, lose: settle * h.loseMult };
  },
  costs: (_s, _scope, data) => ({ settle: num(data, 'settle'), fight: 0, disclaimers: 0 }),
  expected: (_s, inc, optionId) =>
    optionId === 'fight' ? (1 - P.HALLUCINATION_SUIT.fightWin) * num(inc.data, 'lose') : 0,
  apply(state, inc, optionId, rng) {
    const h = P.HALLUCINATION_SUIT;
    if (optionId === 'disclaimers') {
      ratingHit(state, 'company', 'products', h.disclaimerProducts, h.disclaimerWeeks);
    } else if (optionId === 'fight') {
      if (rng.chance(h.fightWin)) return 'The court threw the case out. Nothing to pay.';
      const lose = num(inc.data, 'lose');
      spend(state, 'incidents', lose);
      ratingHit(state, 'company', 'overall', h.loseOverall, h.loseWeeks);
      pushEvent(state, 'LAWSUIT_LOST', { bank: state.meta.bankName, amount: lose }, 2);
      return `We lost. Damages came to ${compactMoney(lose, state.settings.currency)}.`;
    }
  },
};

/** §15: Safety coverage′ plus staffing above full, capped at 1 for the odds. */
const safetyCover = (state: GameState) => Math.min(1, safetyStrength(state));

/** Odds of winning the copyright case: base + CSO expertise + Safety floor coverage. */
function copyrightOdds(state: GameState): number {
  const c = P.COPYRIGHT_SUIT;
  const cso = (state.executives.seats.cro?.expertise ?? 0) / 100;
  return Math.min(1, c.fightBase + c.fightCsoSlope * cso + c.fightSafetySlope * safetyCover(state));
}

const COPYRIGHT_SUIT: IncidentRule = {
  // Only once a trained model exists.
  chance(state) {
    if (trainedModels(state).length === 0) return 0;
    return baseP('COPYRIGHT_SUIT') * incidentPMult(state, 'COPYRIGHT_SUIT', 'company');
  },
  roll(state) {
    const models = Math.max(1, trainedModels(state).length);
    const licence = P.COPYRIGHT_SUIT.licencePerModel * models;
    return { models, licence, lose: licence * P.COPYRIGHT_SUIT.loseMult };
  },
  prepare(state, _scope, data) {
    data.odds = copyrightOdds(state);
  },
  costs: (_s, _scope, data) => ({ licence: num(data, 'licence'), fight: 0, retrain: 0 }),
  expected: (_s, inc, optionId) =>
    optionId === 'fight' ? (1 - num(inc.data, 'odds')) * num(inc.data, 'lose') : 0,
  apply(state, inc, optionId, rng) {
    if (optionId === 'retrain') {
      // Every trained model's Breadth lift falls; its radar follows at once.
      for (const m of trainedModels(state)) {
        const lift = m.lift ?? [0, 0, 0, 0, 0];
        lift[RADAR.breadth] -= P.COPYRIGHT_SUIT.breadthHit;
        m.lift = lift;
        m.radar = trainedRadar(state, m);
      }
    } else if (optionId === 'fight') {
      if (rng.chance(num(inc.data, 'odds'))) return 'The court sided with us. Fair use, it said.';
      const lose = num(inc.data, 'lose');
      spend(state, 'incidents', lose);
      pushEvent(state, 'LAWSUIT_LOST', { bank: state.meta.bankName, amount: lose }, 2);
      return `We lost. Damages came to ${compactMoney(lose, state.settings.currency)}.`;
    }
  },
};

const WEIGHTS_LEAK: IncidentRule = {
  // Like DATA_BREACH: × (1 + 2(1 − itCov′)) × (1.2 − CTO expertise/100); needs a trained model.
  chance(state) {
    if (trainedModels(state).length === 0) return 0;
    const it = Math.min(1, state.hq.coverage.it?.kPrime ?? 1);
    return (
      baseP('WEIGHTS_LEAK') *
      (1 + P.WEIGHTS_LEAK.itSlope * (1 - it)) *
      (P.WEIGHTS_LEAK.ctoBase - ctoExpertise(state) / 100) *
      incidentPMult(state, 'WEIGHTS_LEAK', 'company')
    );
  },
  prepare(_s, _scope, data) {
    data.rotate = P.WEIGHTS_LEAK.rotateCost;
  },
  costs: () => ({ rotate: P.WEIGHTS_LEAK.rotateCost, quiet: 0 }),
  apply(state, _inc, optionId, rng) {
    if (optionId !== 'quiet') return;
    const w = P.WEIGHTS_LEAK;
    // One-shot roll, as the data breach's quiet fix: exposed later or never.
    if (!rng.chance(w.quietExposed)) return 'The copy sank without trace.';
    ratingHit(state, 'company', 'overall', w.exposedOverall, w.exposedWeeks);
    pushEvent(state, 'WEIGHTS_LEAKED', { bank: state.meta.bankName }, 2);
    return 'It came out that we knew. The story is everywhere.';
  },
};

export const AI_RULES: Record<string, IncidentRule> = {
  JAILBREAK,
  HALLUCINATION_SUIT,
  COPYRIGHT_SUIT,
  WEIGHTS_LEAK,
};
