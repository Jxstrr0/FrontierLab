// The GPU market on the Compute floor (stage C4b, SIMULATION §13.0): offers
// need the floor, rented GPUs cover office demand from the next close, lots are
// billed weekly for exactly their term, and the 9 → 10 migration.
import { describe, expect, it } from 'vitest';
import { GPU_MARKET } from '../../src/config/balance';
import { GPU_LOT_TYPES } from '../../src/data/gpuLots';
import * as cmd from '../../src/sim/commands';
import { computePriceFactor, ownedShare, spotPrice } from '../../src/sim/compute';
import { advanceWeeks } from '../../src/sim/engine';
import { billGpuLots, gpuLotPrice, refreshGpuOffers } from '../../src/sim/gpuMarket';
import { offerCount } from '../../src/sim/fundingMarket';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { identityGap } from '../helpers/mergers';
import { bankWithFloors } from '../helpers/scenario';

const withMarket = () => {
  const s = bankWithFloors(['treasury']);
  advanceWeeks(s, 1);
  return s;
};

describe('GPU market offers', () => {
  it('appear only with a Compute floor, counted like funding offers', () => {
    const none = bankWithFloors([]);
    refreshGpuOffers(none);
    expect(none.compute.offers).toEqual([]);
    expect(none.compute.offersRefreshWeek).toBe(-1);

    const s = withMarket();
    expect(s.compute.offers).toHaveLength(offerCount(s));
    for (const o of s.compute.offers) {
      const spec = GPU_LOT_TYPES[o.type]!;
      expect(o.termWeeks).toBe(spec.termWeeks);
      expect(o.gpus % GPU_MARKET.sizeStep).toBe(0);
      const base = gpuLotPrice(s, spec);
      expect(o.price).toBeGreaterThanOrEqual(base * (1 - GPU_MARKET.priceNoise) - 1e-9);
      expect(o.price).toBeLessThanOrEqual(base * (1 + GPU_MARKET.priceNoise) + 1e-9);
      expect(o.price).toBeLessThan(spotPrice(s) * (1 + GPU_MARKET.understaffedMarkup));
    }
  });
});

describe('renting GPUs', () => {
  it('validates the floor, the offer and the size', () => {
    const s = withMarket();
    const offer = s.compute.offers[0]!;
    expect(cmd.rentGpus(s, 'nope', 100).ok).toBe(false);
    expect(cmd.rentGpus(s, offer.id, GPU_MARKET.sizeStep - 1).ok).toBe(false);
    expect(cmd.rentGpus(s, offer.id, offer.gpus + GPU_MARKET.sizeStep).ok).toBe(false);
    const none = bankWithFloors([]);
    none.compute.offers = [{ ...offer }];
    expect(cmd.rentGpus(none, offer.id, offer.gpus).ok).toBe(false);
  });

  it('adds capacity at once, lowers the spot bill and shrinks the offer', () => {
    const s = withMarket();
    const offer = s.compute.offers[0]!;
    const before = computePriceFactor(s);
    const take = GPU_MARKET.sizeStep;
    const left = offer.gpus - take;
    const r = cmd.rentGpus(s, offer.id, take);
    expect(r.ok).toBe(true);
    expect(s.compute.rentedGpus).toBe(take);
    expect(s.compute.lots).toHaveLength(1);
    if (left >= GPU_MARKET.sizeStep) expect(offer.gpus).toBe(left);
    else expect(s.compute.offers.find((o) => o.id === offer.id)).toBeUndefined();
    expect(ownedShare(s)).toBeGreaterThan(0);
    expect(computePriceFactor(s)).toBeLessThan(before);
  });

  it('bills each lot exactly termWeeks times, then retires it, keeping the books balanced', () => {
    const s = withMarket();
    const offer = s.compute.offers.find((o) => o.type === 'reserved_6m') ?? s.compute.offers[0]!;
    const start = s.clock.week;
    cmd.rentGpus(s, offer.id, GPU_MARKET.sizeStep);
    const lot = s.compute.lots[0]!;
    expect(lot.endWeek - lot.startWeek).toBe(offer.termWeeks);
    let bills = 0;
    const probe = structuredClone(s) as GameState;
    for (let w = start; w < start + offer.termWeeks + 3; w++) {
      const before = probe.compute.lots.length;
      probe.clock.week = w;
      billGpuLots(probe);
      if (before > 0) bills += 1;
    }
    expect(bills).toBe(offer.termWeeks);
    expect(probe.compute.lots).toHaveLength(0);
    expect(probe.compute.rentedGpus).toBe(0);

    advanceWeeks(s, 4);
    expect(identityGap(s)).toBeLessThan(1);
  });
});

describe('save migration 9 → 10', () => {
  it('adds empty GPU lots and offers', () => {
    const s = bankWithFloors([]);
    const c = s.compute as unknown as Record<string, unknown>;
    delete c.lots;
    delete c.offers;
    delete c.rentedGpus;
    delete c.offersRefreshWeek;
    const m = migrations[9]!(s as never) as unknown as GameState;
    expect(m.compute.lots).toEqual([]);
    expect(m.compute.offers).toEqual([]);
    expect(m.compute.rentedGpus).toBe(0);
    expect(m.compute.offersRefreshWeek).toBe(-1);
  });
});
