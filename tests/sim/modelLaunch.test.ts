// Model launches and open weights (SIMULATION §16.15–16.16, owner's review A3,
// B3): the first switch to a trained model launches it (story, awareness, a
// fading headroom boost, rival price cuts when it tops the board); agency
// launch campaigns hold the hype; open weights trade usage headroom for
// awareness and API sign-ups.
import { describe, expect, it } from 'vitest';
import { MODEL_LAUNCH, OPEN_WEIGHTS } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { takeupMult } from '../../src/sim/incident/effects';
import { launchHeadroom, launchWindowOpen, openWeightsDrag } from '../../src/sim/modelLaunch';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState, UnderwritingModel } from '../../src/sim/state';
import { activeModel, modelQuality, priceHeadroom } from '../../src/sim/underwriting';
import { addTrainedModel, openBank } from '../helpers/incidents';

/** A trained model `lift` points better on every axis than the house model. */
function trained(s: GameState, lift: number, id = 'm_new'): UnderwritingModel {
  const m = addTrainedModel(s, id);
  m.radar = m.radar.map((v) => v + lift) as UnderwritingModel['radar'];
  return m;
}

/** Ends the two-week blend so headroom reads the new model alone. */
const settle = (s: GameState) => delete s.underwriting.switching;

/** Every rival model at `q`. */
function rivalsAt(s: GameState, q: number): void {
  for (const r of Object.values(s.rivals)) if (r.model) r.model.quality = q;
}

describe('model launches', () => {
  it('launches a trained model the first time it is switched on', () => {
    const { s, b } = openBank();
    rivalsAt(s, 99);
    const before = b.awareness;
    const m = trained(s, 1);
    expect(cmd.activateModel(s, m.id).ok).toBe(true);
    expect(m.launchedWeek).toBe(s.clock.week);
    const l = s.underwriting.launch!;
    // gain of 1 point: base + perPoint, under the cap
    expect(l.headroom).toBeCloseTo(MODEL_LAUNCH.headroomBase + MODEL_LAUNCH.headroomPerPoint, 10);
    expect(b.awareness).toBeCloseTo(
      Math.min(1, before + MODEL_LAUNCH.awarenessBase + MODEL_LAUNCH.awarenessPerPoint),
      10,
    );
    const e = s.events.log.find((x) => x.type === 'MODEL_LAUNCHED');
    expect(e?.payload).toMatchObject({ modelId: m.id, leads: false, rivalsCut: 0 });
    expect(launchWindowOpen(s)).toBe(true);
  });

  it('adds hype to headroom that fades to nothing over a quarter', () => {
    const { s } = openBank();
    rivalsAt(s, 99);
    const m = trained(s, 1);
    cmd.activateModel(s, m.id);
    settle(s);
    const hype = s.underwriting.launch!.headroom;
    const base = priceHeadroom(s) - launchHeadroom(s);
    expect(priceHeadroom(s)).toBeCloseTo(base + hype, 10);
    s.clock.week += Math.round(MODEL_LAUNCH.hypeWeeks / 2);
    expect(launchHeadroom(s)).toBeGreaterThan(0);
    expect(launchHeadroom(s)).toBeLessThan(hype);
    s.clock.week += MODEL_LAUNCH.hypeWeeks;
    expect(launchHeadroom(s)).toBe(0);
    expect(launchWindowOpen(s)).toBe(false);
  });

  it('does not launch twice, nor a vendor or custom model', () => {
    const { s } = openBank();
    const house = s.underwriting.activeModelId;
    const m = trained(s, 1);
    cmd.activateModel(s, m.id);
    cmd.activateModel(s, house);
    cmd.activateModel(s, m.id);
    expect(s.events.log.filter((x) => x.type === 'MODEL_LAUNCHED')).toHaveLength(1);
    // Switching away ends the hype.
    cmd.activateModel(s, house);
    expect(launchHeadroom(s)).toBe(0);
  });

  it('caps the hype for a huge jump', () => {
    const { s } = openBank();
    rivalsAt(s, 99);
    cmd.activateModel(s, trained(s, 5).id);
    expect(s.underwriting.launch!.headroom).toBe(MODEL_LAUNCH.headroomMax);
    expect(s.underwriting.launch!.awareness).toBe(MODEL_LAUNCH.awarenessMax);
  });

  it('makes rivals cut plan prices where you sell when it tops the board', () => {
    const { s, b } = openBank();
    rivalsAt(s, 1);
    const local = Object.values(s.rivals).filter(
      (r) => r.status === 'active' && r.cities.includes(b.cityId),
    );
    expect(local.length).toBeGreaterThan(0);
    const plus = local.map((r) => r.prices.plus);
    cmd.activateModel(s, trained(s, 1).id);
    const e = s.events.log.find((x) => x.type === 'MODEL_LAUNCHED')!;
    expect(e.payload.leads).toBe(true);
    expect(e.payload.rivalsCut).toBeGreaterThanOrEqual(local.length);
    local.forEach((r, i) => {
      expect(r.priceWar[b.cityId]).toBeCloseTo(MODEL_LAUNCH.rivalCut, 10);
      if (plus[i] !== undefined) expect(r.prices.plus!).toBeLessThan(plus[i]!);
    });
  });

  it('holds the hype at full while an agency launch campaign runs', () => {
    const { s } = openBank();
    rivalsAt(s, 99);
    cmd.activateModel(s, trained(s, 1).id);
    const hype = s.underwriting.launch!.headroom;
    s.underwriting.launch!.holdUntil = s.clock.week + 10;
    s.clock.week += 10;
    expect(launchHeadroom(s)).toBeCloseTo(hype, 10);
    s.clock.week += MODEL_LAUNCH.hypeWeeks;
    expect(launchHeadroom(s)).toBe(0);
  });
});

describe('open weights', () => {
  it('only takes a trained model, once', () => {
    const { s } = openBank();
    expect(cmd.openWeights(s, s.underwriting.activeModelId).ok).toBe(false);
    const m = trained(s, 0);
    expect(cmd.openWeights(s, m.id).ok).toBe(true);
    expect(m.openWeek).toBe(s.clock.week);
    expect(cmd.openWeights(s, m.id).ok).toBe(false);
    expect(s.events.log.filter((x) => x.type === 'WEIGHTS_OPENED')).toHaveLength(1);
  });

  it('wins awareness and API sign-ups', () => {
    const { s, b } = openBank();
    const before = b.awareness;
    cmd.openWeights(s, trained(s, 0).id);
    expect(b.awareness).toBeCloseTo(Math.min(1, before + OPEN_WEIGHTS.awareness), 10);
    expect(takeupMult(s, OPEN_WEIGHTS.apiProduct)).toBeCloseTo(OPEN_WEIGHTS.apiTakeup, 10);
    expect(takeupMult(s, 'plus')).toBe(1);
  });

  it('drags usage headroom only, and only while the open model is close', () => {
    const { s } = openBank();
    const open = trained(s, 0, 'm_open');
    cmd.openWeights(s, open.id);
    const q = modelQuality(activeModel(s));
    // Same quality as the AI model: the full drag, on usage prices only.
    expect(openWeightsDrag(s, q)).toBeCloseTo(OPEN_WEIGHTS.maxDrag, 10);
    expect(priceHeadroom(s, 'plan') - priceHeadroom(s, 'usage')).toBeCloseTo(
      OPEN_WEIGHTS.maxDrag,
      10,
    );
    // Half the gap: half the drag. A full gap: none.
    expect(openWeightsDrag(s, q + OPEN_WEIGHTS.nearGap / 2)).toBeCloseTo(
      OPEN_WEIGHTS.maxDrag / 2,
      10,
    );
    expect(openWeightsDrag(s, q + OPEN_WEIGHTS.nearGap)).toBe(0);
  });
});

describe('save migration 33 → 34', () => {
  it('marks the trained model in use as launched and leaves others to launch later', () => {
    const { s } = openBank();
    const used = trained(s, 1, 'm_used');
    const waiting = trained(s, 2, 'm_waiting');
    s.underwriting.activeModelId = used.id;
    migrations[33]!(s as never);
    expect(used.launchedWeek).toBe(used.trainedWeek);
    expect(waiting.launchedWeek).toBeUndefined();
  });
});
