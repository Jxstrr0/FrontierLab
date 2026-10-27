// The Chief Scientist and the talent war (stage C6c, SIMULATION §16.13):
// seeding, hire terms and commands, the training-odds lift, rivals' release
// lift, the quarterly market, the RESEARCHER_POACHED case, the Chief
// Scientist's delegation and the 15 → 16 save migration.
import { describe, expect, it } from 'vitest';
import { CHIEF_SCIENTIST, RESEARCHERS, TRAINING } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { csciTraining } from '../../src/sim/execDelegationsResearch';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState, Researcher } from '../../src/sim/state';
import {
  allResearchers,
  chiefScientistBonus,
  hireTerms,
  poachChance,
  researchBonus,
  researcherMarketSalary,
  rivalResearchGain,
  talentQuarter,
  yourResearchers,
} from '../../src/sim/talent';
import { trainingOdds } from '../../src/sim/training';
import { activeModel } from '../../src/sim/underwriting';
import { execGame, hire } from '../helpers/executives';
import { gameWithFloors } from '../helpers/productsFloor';

const free = (s: GameState) => allResearchers(s).find((r) => !r.employer)!;
const atRival = (s: GameState) => allResearchers(s).find((r) => r.employer?.type === 'rival')!;
const mean = (o: number[]) => o.reduce((a, p, i) => a + p * (i + 1), 0);

describe('researchers', () => {
  it('seeds the market with named researchers, most at rival labs', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const all = allResearchers(s);
    expect(all).toHaveLength(RESEARCHERS.count);
    expect(all.filter((r) => r.employer?.type === 'rival').length).toBeGreaterThan(all.length / 3);
    for (const r of all) {
      expect(r.stars).toBeGreaterThanOrEqual(1);
      expect(r.stars).toBeLessThanOrEqual(5);
      expect(r.salary).toBe(researcherMarketSalary(s, r.stars));
    }
    expect(researcherMarketSalary(s, 5)).toBeGreaterThan(researcherMarketSalary(s, 1));
  });

  it('charges a premium and a signing bonus to hire from a rival', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const f = hireTerms(s, free(s));
    expect(f.signing).toBe(0);
    const r = atRival(s);
    const t = hireTerms(s, r);
    expect(t.salary).toBeGreaterThan(r.salary);
    expect(t.signing).toBeCloseTo((t.salary * RESEARCHERS.signingWeeks) / 52);
  });

  it('hires and lets go through commands, paying the signing bonus', () => {
    const { s } = gameWithFloors(['products']);
    expect(cmd.hireResearcher(newGame({ seed: 1, cityId: 'cal' }), free(s).id).ok).toBe(false);
    const r = atRival(s);
    const rivalName = s.rivals[(r.employer as { id: string }).id]!.name;
    const cash = s.company.cash;
    const { signing } = hireTerms(s, r);
    expect(cmd.hireResearcher(s, r.id).ok).toBe(true);
    expect(s.company.cash).toBeCloseTo(cash - signing);
    expect(r.employer).toEqual({ type: 'player' });
    expect(s.events.log.at(-1)).toMatchObject({ type: 'RESEARCHER_HIRED' });
    expect(s.events.log.at(-1)!.payload.from).toBe(rivalName);
    expect(cmd.hireResearcher(s, r.id).ok).toBe(false);
    expect(cmd.releaseResearcher(s, r.id).ok).toBe(true);
    expect(r.employer).toBeUndefined();
    expect(cmd.releaseResearcher(s, r.id).ok).toBe(false);
  });

  it('caps the team', () => {
    const { s } = gameWithFloors(['products']);
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    for (const r of allResearchers(s).slice(0, RESEARCHERS.maxTeam)) cmd.hireResearcher(s, r.id);
    expect(yourResearchers(s)).toHaveLength(RESEARCHERS.maxTeam);
    const next = allResearchers(s).find((r) => r.employer?.type !== 'player')!;
    expect(cmd.hireResearcher(s, next.id).ok).toBe(false);
  });
});

describe('what researchers do', () => {
  it('lift your training odds, twice as much on their specialty, up to a cap', () => {
    const { s } = gameWithFloors(['products']);
    const r = free(s);
    const before = mean(trainingOdds(s, 4, TRAINING.minWeekly, r.specialty));
    cmd.hireResearcher(s, r.id);
    expect(researchBonus(s, r.specialty)).toBeCloseTo(
      RESEARCHERS.scorePerStar * r.stars * RESEARCHERS.focusMatch,
    );
    expect(researchBonus(s, (r.specialty + 1) % 5)).toBeCloseTo(RESEARCHERS.scorePerStar * r.stars);
    expect(mean(trainingOdds(s, 4, TRAINING.minWeekly, r.specialty))).toBeGreaterThan(before);
    for (const x of allResearchers(s)) x.employer = { type: 'player' };
    expect(researchBonus(s, 0)).toBe(RESEARCHERS.maxBonus);
  });

  it('make a rival’s releases bigger', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r = atRival(s);
    const id = (r.employer as { id: string }).id;
    const stars = allResearchers(s)
      .filter((x) => x.employer?.type === 'rival' && x.employer.id === id)
      .reduce((n, x) => n + x.stars, 0);
    expect(rivalResearchGain(s, id)).toBeCloseTo(RESEARCHERS.rivalGainPerStar * stars);
  });

  it('are bid for less often when paid well', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r: Researcher = { ...free(s) };
    const base = poachChance(s, r);
    expect(base).toBeCloseTo(RESEARCHERS.poachQuarterly);
    r.salary *= 1 + RESEARCHERS.counterRaise;
    expect(poachChance(s, r)).toBeLessThan(base);
  });
});

describe('the quarterly talent market', () => {
  it('raises RESEARCHER_POACHED cases; countering keeps them, letting go sends them to the rival', () => {
    const { s } = gameWithFloors(['products']);
    s.company.cash += 50_000_000;
    s.company.paidInCapital += 50_000_000;
    for (const r of allResearchers(s).filter((x) => !x.employer)) cmd.hireResearcher(s, r.id);
    const mine = yourResearchers(s);
    for (const r of mine) r.salary = 1; // underpaid: rivals bid every quarter
    talentQuarter(s);
    const cases = s.incidents.active.filter((i) => i.type === 'RESEARCHER_POACHED');
    expect(cases.length).toBe(mine.length);
    expect(cmd.resolveIncident(s, cases[0]!.id, 'counter').ok).toBe(true);
    expect(s.talent.researchers[String(cases[0]!.data.researcherId)]!.employer?.type).toBe(
      'player',
    );
    if (cases[1]) {
      expect(cmd.resolveIncident(s, cases[1].id, 'release').ok).toBe(true);
      const gone = s.talent.researchers[String(cases[1].data.researcherId)]!;
      expect(gone.employer).toEqual({ type: 'rival', id: cases[1].data.rivalId });
      expect(s.events.log.some((e) => e.type === 'RESEARCHER_LEFT')).toBe(true);
    }
  });

  it('keeps researchers on the market and frees those at closed labs', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const r = atRival(s);
    const closed = (r.employer as { id: string }).id;
    s.rivals[closed]!.status = 'merged';
    for (let q = 0; q < 8; q++) {
      talentQuarter(s);
      expect(allResearchers(s).filter((x) => !x.employer).length).toBeGreaterThanOrEqual(
        RESEARCHERS.freeMin,
      );
    }
    expect(
      allResearchers(s).some((x) => x.employer?.type === 'rival' && x.employer.id === closed),
    ).toBe(false);
  });
});

describe('the Chief Scientist', () => {
  it('lifts training odds by their expertise', () => {
    const s = execGame(['products']);
    expect(chiefScientistBonus(s)).toBe(0);
    const before = mean(trainingOdds(s, 4, TRAINING.minWeekly));
    const csci = hire(s, 'csci');
    expect(chiefScientistBonus(s)).toBeCloseTo((CHIEF_SCIENTIST.scoreMax * csci.expertise) / 100);
    expect(mean(trainingOdds(s, 4, TRAINING.minWeekly))).toBeGreaterThan(before);
  });

  it('starts routine runs on the weakest axis and switches to a better trained model', () => {
    const s = execGame(['products']);
    s.company.cash += 20_000_000;
    s.company.paidInCapital += 20_000_000;
    csciTraining(s);
    const run = s.training.run!;
    expect(run.weeks).toBe(CHIEF_SCIENTIST.runWeeks);
    const radar = activeModel(s).radar;
    expect(run.focus).toBe(radar.indexOf(Math.min(...radar)));
    expect(run.weeklyBudget).toBeLessThanOrEqual(CHIEF_SCIENTIST.maxWeekly);
    // A better trained model waiting in Manage Models gets switched on.
    const house = activeModel(s);
    s.underwriting.models.m_better = {
      ...house,
      id: 'm_better',
      source: 'trained',
      radar: house.radar.map((v) => v + 1) as typeof house.radar,
      lift: [1, 1, 1, 1, 1],
      generation: 1,
    };
    csciTraining(s);
    expect(s.underwriting.activeModelId).toBe('m_better');
  });
});

describe('save migration 15 → 16', () => {
  it('seeds researchers and Chief Scientist candidates', () => {
    const s = execGame();
    const raw = s as unknown as Record<string, unknown>;
    delete raw.talent;
    delete s.executives.candidates.csci;
    migrations[15]!(raw as never);
    expect(allResearchers(s).length).toBe(RESEARCHERS.count);
    expect(s.executives.candidates.csci!.length).toBeGreaterThan(0);
  });
});
