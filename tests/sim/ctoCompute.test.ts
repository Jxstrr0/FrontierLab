// The CTO's Compute delegation (SIMULATION §17.2, post-C8): reserves GPU lots
// up to the cover target, counts fit-outs and existing capacity, follows the
// chip cycle for terms, never pays spot or more, the dial command, the seat
// now leading the Compute floor, and the 19 → 20 migration.
import { describe, expect, it } from 'vitest';
import { CTO_COMPUTE, GPU_MARKET } from '../../src/config/balance';
import { EXEC_SEATS } from '../../src/data/executives';
import * as cmd from '../../src/sim/commands';
import { spotPrice } from '../../src/sim/compute';
import { advanceWeeks } from '../../src/sim/engine';
import { computeCoverPlan, ctoCompute, offerOrder } from '../../src/sim/execDelegationsCompute';
import { execMult } from '../../src/sim/execSeats';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState, GpuLot, GpuOffer } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { bankWithFloors } from '../helpers/scenario';

/** A lab with a Compute floor, a set demand and three known offers. */
function market(demand = 2_000): GameState {
  const s = bankWithFloors(['treasury']);
  advanceWeeks(s, 1);
  const spot = spotPrice(s);
  const offer = (id: string, termWeeks: number, price: number): GpuOffer => ({
    id,
    type: 'reserved_1y',
    provider: 'Cobalt Grid',
    gpus: 1_000,
    price,
    termWeeks,
    radar: [5, 5, 5, 5, 5],
    expiresWeek: s.clock.week + GPU_MARKET.refreshWeeks,
  });
  s.compute.offers = [
    offer('short', 26, spot * 0.9),
    offer('mid', 52, spot * 0.82),
    offer('long', 156, spot * 0.72),
  ];
  s.compute.lots = [];
  s.compute.rentedGpus = 0;
  s.compute.demandGpus = demand;
  return s;
}

const reserved = (s: GameState) => s.compute.lots.reduce((n, l) => n + l.gpus, 0);
const term = (l: GpuLot) => l.endWeek - l.startWeek;

describe('CTO compute cover', () => {
  it('reserves up to the cover target of demand, cheapest first in a normal market', () => {
    const s = market();
    s.compute.phase = 'normal';
    ctoCompute(s);
    expect(reserved(s)).toBe(CTO_COMPUTE.coverTarget * 2_000);
    expect(term(s.compute.lots[0]!)).toBe(156);
    expect(identityGap(s)).toBeLessThan(1);
    // Covered: a second run reserves nothing more.
    ctoCompute(s);
    expect(reserved(s)).toBe(1_500);
  });

  it('locks long terms in a glut and short ones in a shortage', () => {
    expect(offerOrder(market().compute.offers, 'glut').map((o) => o.id)).toEqual([
      'long',
      'mid',
      'short',
    ]);
    expect(offerOrder(market().compute.offers, 'shortage').map((o) => o.id)).toEqual([
      'short',
      'mid',
      'long',
    ]);
    const s = market();
    s.compute.phase = 'shortage';
    ctoCompute(s);
    expect(s.compute.lots.map(term)).toEqual([26, 52]);
  });

  it('counts what you already have, including data centers in fit-out', () => {
    const s = market();
    s.compute.ownedGpus = 1_000;
    const before = computeCoverPlan(s, 0.9);
    expect(before.takes.reduce((n, t) => n + t.gpus, 0)).toBe(800);
    s.dataCenters.dc_test = {
      status: 'fitout',
      build: { hall: 'hall_row', power: 'power_grid', cooling: 'cool_air' },
    } as never;
    const plan = computeCoverPlan(s, 0.9);
    expect(plan.capacity).toBeGreaterThan(1_000);
    const gpus = plan.takes.reduce((n, t) => n + t.gpus, 0);
    expect(gpus).toBe(Math.max(0, Math.floor((1_800 - plan.capacity) / 50) * 50));
  });

  it('leaves small gaps to spot and never pays spot or more', () => {
    const s = market();
    s.compute.ownedGpus = 1_450; // gap 50 GPUs, under the 5% slack
    expect(computeCoverPlan(s, 0.75).takes).toEqual([]);
    const t = market();
    for (const o of t.compute.offers) o.price = spotPrice(t);
    expect(computeCoverPlan(t, 0.75).takes).toEqual([]);
  });

  it('does nothing without a Compute floor or demand', () => {
    const none = bankWithFloors([]);
    none.compute.demandGpus = 2_000;
    expect(computeCoverPlan(none, 0.75).active).toBe(false);
    expect(computeCoverPlan(market(0), 0.75).takes).toEqual([]);
  });
});

describe('the cover dial and the seat', () => {
  it('takes only the dial stops', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(s.executives.computeCover).toBe(CTO_COMPUTE.coverTarget);
    expect(cmd.setComputeCover(s, 0.9).ok).toBe(true);
    expect(s.executives.computeCover).toBe(0.9);
    expect(cmd.setComputeCover(s, 0.5).ok).toBe(false);
  });

  it('puts the Compute floor under the CTO, not the CFO', () => {
    expect(EXEC_SEATS.cto.depts).toContain('treasury');
    expect(EXEC_SEATS.cfo.depts).not.toContain('treasury');
    expect(EXEC_SEATS.cto.delegations.map((d) => d.id)).toContain('compute');
    const s = newGame({ seed: 42, cityId: 'cal' });
    expect(execMult(s, 'treasury')).toBe(1);
  });
});

describe('save migration 19 → 20', () => {
  it('adds the cover dial at its default', () => {
    const s = newGame({ seed: 42, cityId: 'cal' });
    const ex = s.executives as unknown as Record<string, unknown>;
    delete ex.computeCover;
    migrations[19]!(s as never);
    expect(s.executives.computeCover).toBe(CTO_COMPUTE.coverTarget);
  });
});
