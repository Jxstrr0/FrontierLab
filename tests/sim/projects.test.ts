// Frontier projects (post-C8, SIMULATION §16.14): starting and its blocks,
// weekly payments, stalls and finishing, and each reward's effect.
import { describe, expect, it } from 'vitest';
import { FRONTIER_PROJECTS, MODEL_RADAR_MAX } from '../../src/config/balance';
import { FRONTIER_PROJECTS_BY_ID } from '../../src/data/frontierProjects';
import { cancelProject, startProject } from '../../src/sim/commands/projects';
import { ownedGpus } from '../../src/sim/compute';
import { atModelCeiling } from '../../src/sim/frontier';
import { incidentPMult } from '../../src/sim/incident/effects';
import { newGame } from '../../src/sim/newGame';
import {
  edgeServiceLift,
  modelCeiling,
  projectBlock,
  projectGpus,
  projectWeekly,
  runProjects,
} from '../../src/sim/projects';
import { safetyExposure } from '../../src/sim/safety';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { activeModel } from '../../src/sim/underwriting';

const game = () => newGame({ seed: 42, cityId: 'cal' });
/** Gives the lab `arr` of ARR through a stand-in partnership balance. */
const withArr = (s: GameState, arr: number) => {
  (s.partnerships as Record<string, unknown>).probe = { balance: arr };
};

describe('starting a project', () => {
  it('needs the ARR, the prerequisite and enough cash', () => {
    const s = game();
    const lodestar = FRONTIER_PROJECTS_BY_ID.lodestar!;
    expect(projectBlock(s, lodestar)).toBe('ARR too low.');
    expect(startProject(s, 'lodestar').ok).toBe(false);
    expect(projectBlock(s, FRONTIER_PROJECTS_BY_ID.meridian!)).toMatch(/Needs Project Lodestar/);
    withArr(s, lodestar.minArr);
    expect(projectBlock(s, lodestar)).toBeUndefined();
    s.company.cash = 0;
    expect(startProject(s, 'lodestar').ok).toBe(false);
    s.company.cash = 10_000_000_000;
    expect(startProject(s, 'lodestar').ok).toBe(true);
    expect(s.projects.active?.id).toBe('lodestar');
    withArr(s, 1e12);
    expect(projectBlock(s, FRONTIER_PROJECTS_BY_ID.institute!)).toBe(
      'Another project is under way.',
    );
    expect(cancelProject(s).ok).toBe(true);
    expect(s.projects.active).toBeUndefined();
  });
});

describe('running a project', () => {
  const started = () => {
    const s = game();
    withArr(s, 1e12);
    s.company.cash = 10_000_000_000;
    startProject(s, 'institute');
    return s;
  };

  it('pays cost ÷ weeks a week and finishes on the last week', () => {
    const s = started();
    const a = s.projects.active!;
    a.weeks = 2;
    const pay = projectWeekly(a);
    const cash = s.company.cash;
    runProjects(s);
    expect(s.company.cash).toBeCloseTo(cash - pay);
    runProjects(s);
    expect(s.projects.active).toBeUndefined();
    expect(s.projects.done).toEqual(['institute']);
  });

  it('stalls without the cash, and resumes once it is there', () => {
    const s = started();
    s.company.cash = 0;
    runProjects(s);
    expect(s.projects.active!.stalled).toBe(true);
    expect(s.projects.active!.weeksDone).toBe(0);
    s.company.cash = 10_000_000_000;
    runProjects(s);
    expect(s.projects.active!.stalled).toBe(false);
    expect(s.projects.active!.weeksDone).toBe(1);
  });
});

describe('rewards', () => {
  it('breakthroughs raise the model ceiling', () => {
    const s = game();
    activeModel(s).radar = [10, 10, 10, 10, 10];
    expect(modelCeiling(s)).toBe(MODEL_RADAR_MAX);
    expect(atModelCeiling(s)).toBe(true);
    s.projects.done.push('lodestar');
    expect(modelCeiling(s)).toBe(MODEL_RADAR_MAX + 1);
    expect(atModelCeiling(s)).toBe(false);
  });

  it('the campus adds GPUs to the owned pool', () => {
    const s = game();
    const before = ownedGpus(s);
    s.projects.done.push('campus');
    expect(projectGpus(s)).toBeGreaterThan(0);
    expect(ownedGpus(s)).toBe(before + projectGpus(s));
  });

  it('the institute cuts exposure and company incident odds', () => {
    const s = game();
    const exposure = safetyExposure(s);
    const p = incidentPMult(s, 'JAILBREAK', 'company');
    s.projects.done.push('institute');
    expect(safetyExposure(s)).toBeLessThanOrEqual(exposure);
    expect(incidentPMult(s, 'JAILBREAK', 'company')).toBeCloseTo(
      p * FRONTIER_PROJECTS.instituteIncidentMult,
    );
  });

  it('the edge network lifts Service', () => {
    const s = game();
    expect(edgeServiceLift(s)).toBe(0);
    s.projects.done.push('edge');
    expect(edgeServiceLift(s)).toBeGreaterThan(0);
  });
});

describe('save migration 26 → 27', () => {
  it('adds an empty projects record', () => {
    const s = game();
    delete (s as Partial<GameState>).projects;
    migrations[26]!(s as never);
    expect(s.projects).toEqual({ done: [] });
  });
});
