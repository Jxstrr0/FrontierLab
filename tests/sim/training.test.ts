// Training runs, rival models and the frontier (stage C6b, SIMULATION §16.12):
// lift and odds, a run finishing into a trained model, cumulative lift,
// command validation, rival seeding and releases, the leaderboard, the quality
// bar's effect, and the 14 → 15 save migration.
import { describe, expect, it } from 'vitest';
import { MODEL_EFFECTS, RIVAL_MODEL, TRAINING } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { leaderboard } from '../../src/sim/leaderboard';
import { newGame } from '../../src/sim/newGame';
import { bestRivalModel, frontierRise, rivalModelsQuarter } from '../../src/sim/rivalModels';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { runTraining, trainingLift, trainingOdds } from '../../src/sim/training';
import { activeModel, modelQuality, priceHeadroom, qualityBar } from '../../src/sim/underwriting';
import { gameWithFloors } from '../helpers/productsFloor';

const run = { name: 'Gen 1', focus: 0, weeks: 4, weeklyBudget: 50_000 };

function finish(s: GameState): void {
  for (let i = 0; i < 40 && s.training.run; i++) runTraining(s);
}

describe('training odds and lift', () => {
  it('lifts every axis by the star lift and the focus axis by the focus lift too', () => {
    const lift = trainingLift(3, 2);
    expect(lift).toEqual([0.4, 0.4, 0.4 + 0.4, 0.4, 0.4]);
    expect(trainingLift(5, 0)[0]).toBeCloseTo(TRAINING.starLift[4]! + TRAINING.focusLift[4]!);
  });

  it('gives better odds for a bigger budget and a longer run', () => {
    const { s } = gameWithFloors(['products']);
    const mean = (o: number[]) => o.reduce((a, p, i) => a + p * (i + 1), 0);
    const small = trainingOdds(s, 4, TRAINING.minWeekly);
    expect(small.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(mean(trainingOdds(s, 4, 500_000))).toBeGreaterThan(mean(small));
    expect(mean(trainingOdds(s, 24, TRAINING.minWeekly))).toBeGreaterThan(mean(small));
  });
});

describe('a training run', () => {
  it('spends its budget and finishes into a trained model that is not switched on', () => {
    const { s } = gameWithFloors(['products']);
    const before = activeModel(s);
    expect(cmd.startTrainingRun(s, run).ok).toBe(true);
    finish(s);
    expect(s.training.run).toBeUndefined();
    expect(s.training.generation).toBe(1);
    const trained = Object.values(s.underwriting.models).find((m) => m.source === 'trained')!;
    expect(trained.name).toBe('Gen 1');
    expect(trained.generation).toBe(1);
    expect(modelQuality(trained)).toBeGreaterThan(modelQuality(before));
    expect(activeModel(s).id).toBe(before.id);
    expect(s.events.log.some((e) => e.type === 'MODEL_TRAINED')).toBe(true);
  });

  it('builds the next generation on the trained model in use', () => {
    const { s } = gameWithFloors(['products']);
    cmd.startTrainingRun(s, run);
    finish(s);
    const gen1 = Object.values(s.underwriting.models).find((m) => m.generation === 1)!;
    s.underwriting.activeModelId = gen1.id;
    cmd.startTrainingRun(s, { ...run, name: 'Gen 2' });
    finish(s);
    const gen2 = Object.values(s.underwriting.models).find((m) => m.generation === 2)!;
    for (let i = 0; i < 5; i++) expect(gen2.lift![i]!).toBeGreaterThan(gen1.lift![i]!);
  });

  it('pauses without a Products floor and can be cancelled', () => {
    const { s } = gameWithFloors(['products']);
    cmd.startTrainingRun(s, run);
    const floor = s.departments.products;
    delete s.departments.products;
    runTraining(s);
    expect(s.training.run!.progress).toBe(0);
    s.departments.products = floor;
    expect(cmd.cancelTrainingRun(s).ok).toBe(true);
    expect(s.training.run).toBeUndefined();
    expect(cmd.cancelTrainingRun(s).ok).toBe(false);
  });

  it('validates the run', () => {
    expect(cmd.startTrainingRun(newGame({ seed: 1, cityId: 'cal' }), run).ok).toBe(false);
    const { s } = gameWithFloors(['products']);
    expect(cmd.startTrainingRun(s, { ...run, name: '  ' }).ok).toBe(false);
    expect(cmd.startTrainingRun(s, { ...run, focus: 5 }).ok).toBe(false);
    expect(cmd.startTrainingRun(s, { ...run, weeks: 5 }).ok).toBe(false);
    expect(cmd.startTrainingRun(s, { ...run, weeklyBudget: TRAINING.minWeekly - 5_000 }).ok).toBe(
      false,
    );
    expect(cmd.startTrainingRun(s, run).ok).toBe(true);
    expect(cmd.startTrainingRun(s, run).ok).toBe(false);
  });
});

describe('rival models and the frontier', () => {
  it('gives every rival a model and starts the frontier level', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const rivals = Object.values(s.rivals);
    expect(rivals.every((r) => r.model)).toBe(true);
    expect(new Set(rivals.map((r) => r.model!.name)).size).toBe(rivals.length);
    expect(s.training.frontierBase).toBe(bestRivalModel(s));
    expect(frontierRise(s)).toBe(0);
    expect(qualityBar(s)).toBe(MODEL_EFFECTS.qualityRef);
  });

  it('releases new generations over the quarters, raising the bar and lowering headroom', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const headroom = priceHeadroom(s);
    for (let q = 0; q < 12; q++) rivalModelsQuarter(s);
    expect(frontierRise(s)).toBeGreaterThan(0);
    expect(qualityBar(s)).toBeCloseTo(
      MODEL_EFFECTS.qualityRef + MODEL_EFFECTS.frontierWeight * frontierRise(s),
    );
    expect(priceHeadroom(s)).toBeLessThan(headroom);
    expect(s.events.log.some((e) => e.type === 'RIVAL_MODEL_RELEASED')).toBe(true);
    expect(Object.values(s.rivals).some((r) => r.model!.generation > 2)).toBe(true);
  });

  it('starts a lab founded later a little behind the frontier', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const late = Object.values(s.rivals)[0]!;
    delete late.model;
    // Seeded before the others release this quarter, so behind today's best.
    const best = bestRivalModel(s)!;
    rivalModelsQuarter(s);
    expect(late.model!.quality).toBeCloseTo(best - RIVAL_MODEL.lateGap);
  });

  it('ranks every lab on the leaderboard, yours included', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Test Lab' });
    const rows = leaderboard(s);
    expect(rows.filter((r) => r.you)).toHaveLength(1);
    expect(rows.find((r) => r.you)!.lab).toBe('Test Lab');
    expect(rows.length).toBe(
      Object.values(s.rivals).filter((r) => r.status === 'active').length + 1,
    );
    for (let i = 1; i < rows.length; i++)
      expect(rows[i - 1]!.quality).toBeGreaterThanOrEqual(rows[i]!.quality);
  });
});

describe('save migration 14 → 15', () => {
  it('adds training state and seeds rival models', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const raw = s as unknown as Record<string, unknown>;
    delete raw.training;
    for (const r of Object.values(s.rivals)) delete r.model;
    migrations[14]!(raw as never);
    expect(s.training.generation).toBe(0);
    expect(Object.values(s.rivals).every((r) => r.model)).toBe(true);
    expect(frontierRise(s)).toBe(0);
  });
});
