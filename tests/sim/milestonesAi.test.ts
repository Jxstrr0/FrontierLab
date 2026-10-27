// AI milestones (DESIGN §5.18, 2026-10-27): the first trained model and the
// fifth generation, the top of the leaderboard, a full research team, two
// years at the Strong tier, a quarter of compute independence and the first
// million-a-year contract.
import { describe, expect, it } from 'vitest';
import { MILESTONE_GOALS, RESEARCHERS } from '../../src/config/balance';
import { MILESTONES } from '../../src/data/milestones';
import { tallyCompute } from '../../src/sim/compute';
import { checkMilestones } from '../../src/sim/milestones';
import { newGame } from '../../src/sim/newGame';
import { bestRivalModel } from '../../src/sim/rivalModels';
import { allResearchers } from '../../src/sim/talent';
import { activeModel } from '../../src/sim/underwriting';
import { addOpenDataCenter, addTrainedModel, openBank } from '../helpers/incidents';

const AI_IDS = [
  'first_model',
  'model_gen_5',
  'leaderboard_top',
  'full_research_team',
  'safety_strong_2y',
  'owned_compute_quarter',
  'big_contract',
];

describe('AI milestones', () => {
  it('lists every AI milestone and reaches none at the start', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    for (const id of AI_IDS)
      expect(
        MILESTONES.some((m) => m.id === id),
        id,
      ).toBe(true);
    checkMilestones(s);
    for (const id of AI_IDS) expect(s.milestones[id], id).toBeUndefined();
  });

  it('counts trained generations: the first model, then the fifth', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    addTrainedModel(s, 'm1');
    checkMilestones(s);
    expect(s.milestones.first_model).toBe(s.clock.week);
    expect(s.milestones.model_gen_5).toBeUndefined();
    s.training.generation = MILESTONE_GOALS.modelGeneration;
    checkMilestones(s);
    expect(s.milestones.model_gen_5).toBe(s.clock.week);
  });

  it('tops the leaderboard only when your model beats every rival model', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const best = bestRivalModel(s)!;
    expect(best).toBeGreaterThan(0);
    checkMilestones(s);
    expect(s.milestones.leaderboard_top).toBeUndefined();
    const m = activeModel(s);
    m.radar = m.radar.map(() => Math.min(10, best + 1)) as typeof m.radar;
    checkMilestones(s);
    expect(s.milestones.leaderboard_top).toBe(s.clock.week);
  });

  it('needs the full research team of RESEARCHERS.maxTeam', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const pool = allResearchers(s);
    for (const r of pool.slice(0, RESEARCHERS.maxTeam - 1)) r.employer = { type: 'player' };
    checkMilestones(s);
    expect(s.milestones.full_research_team).toBeUndefined();
    pool[RESEARCHERS.maxTeam - 1]!.employer = { type: 'player' };
    checkMilestones(s);
    expect(s.milestones.full_research_team).toBe(s.clock.week);
  });

  it('holds the Strong tier for 104 weeks in a row', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    s.company.tier = 'strong';
    s.company.tierWeeks = MILESTONE_GOALS.strongTierWeeks - 2;
    checkMilestones(s);
    expect(s.milestones.safety_strong_2y).toBeUndefined();
    s.company.tierWeeks = MILESTONE_GOALS.strongTierWeeks - 1;
    checkMilestones(s);
    expect(s.milestones.safety_strong_2y).toBe(s.clock.week);
    const t = newGame({ seed: 3, cityId: 'cal' });
    t.company.tier = 'adequate';
    t.company.tierWeeks = 500;
    checkMilestones(t);
    expect(t.milestones.safety_strong_2y).toBeUndefined();
  });

  it('counts a quarter of weeks with every GPU-week served from owned GPUs', () => {
    const { s, b } = openBank();
    addOpenDataCenter(s, false);
    const demand = (gpus: number) => {
      b.pnl.push({
        week: s.clock.week,
        revenue: 0,
        income: 0,
        gpus,
        lines: {} as (typeof b.pnl)[number]['lines'],
      });
      tallyCompute(s);
    };
    // No demand: no streak. Demand under the data center's GPUs: the streak grows.
    demand(0);
    expect(s.compute.ownedStreak).toBe(0);
    for (let w = 0; w < MILESTONE_GOALS.ownedComputeWeeks - 1; w++) demand(10);
    checkMilestones(s);
    expect(s.milestones.owned_compute_quarter).toBeUndefined();
    demand(10);
    checkMilestones(s);
    expect(s.milestones.owned_compute_quarter).toBe(s.clock.week);
    // A week of spot buying breaks the streak.
    demand(1e9);
    expect(s.compute.ownedStreak).toBe(0);
  });

  it('marks the first million-a-year enterprise contract', () => {
    const { s, b } = openBank();
    const biz = Object.values(s.businesses)[0]!;
    biz.vendor = { type: 'player', id: b.id };
    biz.contractValue = MILESTONE_GOALS.bigContract - 1;
    checkMilestones(s);
    expect(s.milestones.big_contract).toBeUndefined();
    biz.contractValue = MILESTONE_GOALS.bigContract;
    checkMilestones(s);
    expect(s.milestones.big_contract).toBe(s.clock.week);
  });
});
