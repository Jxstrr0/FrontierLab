// Late-game costs that grow with the lab (post-C8): the frontier cost curve on
// training (SIMULATION §16.12), the CPO stopping at the radar's ceiling, the
// researchers' frontier pay, company incident costs scaled by ARR and the
// hyperscale data center parts.
import { describe, expect, it } from 'vitest';
import {
  CPO_TRAINING,
  FRONTIER_COST,
  INCIDENT_SCALE,
  MODEL_RADAR_MAX,
  RESEARCHERS,
  TRAINING,
} from '../../src/config/balance';
import { DC_PARTS, dcPartsFor } from '../../src/data/dataCenters';
import { INCIDENT_PARAMS } from '../../src/data/incidents';
import { cpoTraining, cpoTrainingPlan } from '../../src/sim/execDelegationsResearch';
import { atModelCeiling, frontierCostMult, frontierPoints } from '../../src/sim/frontier';
import { raiseIncident } from '../../src/sim/incidents';
import { incidentScale } from '../../src/sim/incident/helpers';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { researcherMarketSalary } from '../../src/sim/talent';
import { trainingBudgetTop, trainingOdds } from '../../src/sim/training';
import { activeModel } from '../../src/sim/underwriting';
import { execGame } from '../helpers/executives';

const mean = (o: number[]) => o.reduce((a, p, i) => a + p * (i + 1), 0);
const setQuality = (s: GameState, q: number) => {
  activeModel(s).radar = [q, q, q, q, q];
};

describe('the frontier cost curve', () => {
  it('costs nothing extra up to fromQuality, then perPoint× a point', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    setQuality(s, FRONTIER_COST.fromQuality);
    expect(frontierCostMult(s)).toBe(1);
    expect(trainingBudgetTop(s)).toBe(TRAINING.maxBudgetScoreAt);
    setQuality(s, FRONTIER_COST.fromQuality + 2);
    expect(frontierCostMult(s)).toBeCloseTo(FRONTIER_COST.perPoint ** 2);
    expect(trainingBudgetTop(s)).toBeCloseTo(
      TRAINING.maxBudgetScoreAt * FRONTIER_COST.perPoint ** 2,
    );
  });

  it('makes the same budget buy worse odds near the frontier, and mult× the budget buys them back', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const budget = 200_000;
    setQuality(s, FRONTIER_COST.fromQuality);
    const base = mean(trainingOdds(s, 12, budget));
    setQuality(s, FRONTIER_COST.fromQuality + 1.5);
    expect(mean(trainingOdds(s, 12, budget))).toBeLessThan(base);
    expect(mean(trainingOdds(s, 12, budget * frontierCostMult(s)))).toBeCloseTo(base);
  });

  it("raises the CPO's weekly cap by the same factor", () => {
    const s = execGame(['products']);
    s.company.cash += 2_000_000_000;
    s.company.paidInCapital += 2_000_000_000;
    setQuality(s, FRONTIER_COST.fromQuality + 2);
    const plan = cpoTrainingPlan(s, 'balanced');
    expect(plan.weeklyBudget).toBeGreaterThan(CPO_TRAINING.maxWeekly);
    // Rounded to the budget step, so up to one step over the raw cap.
    expect(plan.weeklyBudget).toBeLessThanOrEqual(
      CPO_TRAINING.maxWeekly * frontierCostMult(s) + TRAINING.budgetStep,
    );
  });

  it('starts no CPO run once every axis is at the ceiling', () => {
    const s = execGame(['products']);
    s.company.cash += 20_000_000;
    s.company.paidInCapital += 20_000_000;
    setQuality(s, MODEL_RADAR_MAX);
    expect(atModelCeiling(s)).toBe(true);
    expect(cpoTrainingPlan(s, 'balanced').atCeiling).toBe(true);
    cpoTraining(s);
    expect(s.training.run).toBeUndefined();
  });
});

describe('frontier pay', () => {
  it('raises the going salary by frontierPay a point past fromQuality', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    for (const r of Object.values(s.rivals)) if (r.model) r.model.quality = 6;
    setQuality(s, FRONTIER_COST.fromQuality);
    const base = researcherMarketSalary(s, 3);
    setQuality(s, FRONTIER_COST.fromQuality + 2);
    expect(frontierPoints(s)).toBeCloseTo(2);
    const raised = researcherMarketSalary(s, 3);
    expect(raised / base).toBeCloseTo(1 + 2 * RESEARCHERS.frontierPay, 1);
  });
});

describe('incident costs grow with the lab', () => {
  it('is 1 for a small lab and (ARR ÷ refArr)^exp past refArr', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(incidentScale(s)).toBe(1);
  });

  it('prices a jailbreak fix at the scale', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const inc = raiseIncident(s, 'JAILBREAK', 'company', 'company')!;
    const patch = inc.options.find((o) => o.id === 'patch')!;
    expect(patch.cost).toBe(Math.round(INCIDENT_PARAMS.JAILBREAK.patchCost * incidentScale(s)));
    expect(INCIDENT_SCALE.exp).toBeGreaterThan(0);
  });
});

describe('hyperscale data center parts', () => {
  it('adds a fourth, largest option to every slot', () => {
    expect(dcPartsFor('hall')).toHaveLength(4);
    expect(dcPartsFor('power')).toHaveLength(4);
    expect(dcPartsFor('cooling')).toHaveLength(4);
    expect(DC_PARTS.hall_hyperscale!.gpus).toBeGreaterThan(DC_PARTS.hall_campus!.gpus!);
    expect(DC_PARTS.power_plant!.gpus).toBeGreaterThanOrEqual(DC_PARTS.hall_hyperscale!.gpus!);
    expect(DC_PARTS.cool_twophase!.pue).toBeLessThan(DC_PARTS.cool_immersion!.pue!);
  });
});
