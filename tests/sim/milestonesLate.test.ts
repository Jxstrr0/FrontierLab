// Late-game milestones (DESIGN §5.18, 2026-10-31): public contracts held,
// frontier projects finished, a landmark tower leased, the eighth and twelfth
// generations, and ten and twenty years of play.
import { describe, expect, it } from 'vitest';
import { MILESTONE_GOALS } from '../../src/config/balance';
import { FRONTIER_PROJECT_LIST } from '../../src/data/frontierProjects';
import * as cmd from '../../src/sim/commands';
import { towerListingId } from '../../src/sim/landmarkTowers';
import { checkMilestones } from '../../src/sim/milestones';
import { newGame } from '../../src/sim/newGame';
import type { Tender } from '../../src/sim/state';

describe('late-game milestones', () => {
  it('counts public contracts held right now', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    const tender = (i: number): Tender => ({
      id: `t${i}`,
      name: 'Body',
      bodyId: 'x',
      cityId: 'cal',
      branchId: 'b',
      budget: 1,
      termWeeks: 52,
      status: 'active',
      openWeek: 0,
      closeWeek: 0,
    });
    s.dealDesk.tenders.t0 = tender(0);
    checkMilestones(s);
    expect(s.milestones.first_tender).toBe(0);
    expect(s.milestones.five_tenders).toBeUndefined();
    for (let i = 1; i < MILESTONE_GOALS.tendersHeld; i++) s.dealDesk.tenders[`t${i}`] = tender(i);
    checkMilestones(s);
    expect(s.milestones.five_tenders).toBe(0);
  });

  it('marks the first and the last frontier project', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    s.projects.done = ['lodestar'];
    checkMilestones(s);
    expect(s.milestones.first_frontier_project).toBe(0);
    expect(s.milestones.all_frontier_projects).toBeUndefined();
    s.projects.done = FRONTIER_PROJECT_LIST.map((p) => p.id);
    checkMilestones(s);
    expect(s.milestones.all_frontier_projects).toBe(0);
  });

  it('reads generations and years of play', () => {
    const s = newGame({ seed: 3, cityId: 'cal' });
    s.training.generation = MILESTONE_GOALS.lateGenerations[0];
    s.clock.week = MILESTONE_GOALS.decadeWeeks;
    checkMilestones(s);
    expect(s.milestones.model_gen_8).toBeDefined();
    expect(s.milestones.model_gen_12).toBeUndefined();
    expect(s.milestones.ten_years).toBeDefined();
    expect(s.milestones.twenty_years).toBeUndefined();
  });

  it('notices a landmark tower lease', () => {
    const s = newGame({ seed: 42, cityId: 'lon', bankName: 'Test Lab' });
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    checkMilestones(s);
    expect(s.milestones.landmark_tower).toBeUndefined();
    expect(cmd.leaseOffice(s, towerListingId('lon'), ['products']).ok).toBe(true);
    checkMilestones(s);
    expect(s.milestones.landmark_tower).toBe(s.clock.week);
  });
});
