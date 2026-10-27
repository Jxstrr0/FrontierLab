// Customer businesses (stage C5a, SIMULATION §11.0): seeding on spare
// storefronts and employer sites, rival contracts, the renewal season, and
// the 11 → 12 save migration.
import { describe, expect, it } from 'vitest';
import { BUSINESS } from '../../src/config/balance';
import { DEAL_SECTOR_BY_ID } from '../../src/data/dealSectors';
import { businessesIn, businessLotCount, renewContracts } from '../../src/sim/businesses';
import { isQuarterStart, quarterStartWeek } from '../../src/sim/calendar';
import { newGame } from '../../src/sim/newGame';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState } from '../../src/sim/state';
import { generateCity } from '../../src/sim/worldGen';

const game = () => newGame({ seed: 42, cityId: 'cal' });

describe('seeding businesses', () => {
  it('turns part of every district’s free storefronts into businesses', () => {
    const s = game();
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const biz = businessesIn(s, 'cal');
    const onLots = biz.filter((b) => b.lotId);
    expect(onLots.length).toBeGreaterThan(5);
    for (const b of onLots) {
      expect(s.world.lots[b.lotId!]!.occupant).toEqual({ type: 'business', id: b.id });
      expect(DEAL_SECTOR_BY_ID[b.sector]).toBeDefined();
      expect(b.budget).toBeGreaterThan(0);
      expect(b.pentagon.every((v) => v >= 1 && v <= 10)).toBe(true);
    }
    // Each district keeps a storefront free for offices.
    for (const d of new Set(onLots.map((b) => s.world.lots[b.lotId!]!.district))) {
      expect(lots.some((l) => l.district === d && !l.occupant)).toBe(true);
    }
    expect(new Set(biz.map((b) => b.name)).size).toBe(biz.length);
    expect(businessLotCount(1)).toBe(0);
    expect(businessLotCount(10)).toBe(Math.round(10 * BUSINESS.lotShare));
  });

  it('makes every employer an anchor account', () => {
    const s = game();
    const employers = Object.values(s.world.sites).filter(
      (x) => x.cityId === 'cal' && x.kind === 'employer',
    );
    const anchors = businessesIn(s, 'cal').filter((b) => b.size === 'anchor');
    expect(anchors.map((b) => b.siteId).sort()).toEqual(employers.map((e) => e.id).sort());
    const small = businessesIn(s, 'cal').filter((b) => b.size === 'small');
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(avg(anchors.map((b) => b.budget))).toBeGreaterThan(10 * avg(small.map((b) => b.budget)));
  });

  it('starts some on contracts with rival labs in the city, renewing at a quarter start', () => {
    const s = game();
    const held = businessesIn(s, 'cal').filter((b) => b.vendor);
    expect(held.length).toBeGreaterThan(0);
    for (const b of held) {
      expect(b.vendor!.type).toBe('rival');
      const rival = s.rivals[b.vendor!.id]!;
      expect(rival.branches.some((r) => r.cityId === 'cal')).toBe(true);
      expect(b.contractValue!).toBeLessThanOrEqual(b.budget);
      expect(isQuarterStart(s.meta.startDate, b.renewalWeek! * 7)).toBe(true);
    }
  });

  it('gives a city the same businesses whenever it is first visited', () => {
    const a = game();
    generateCity(a, 'van');
    generateCity(a, 'tor');
    const b = game();
    generateCity(b, 'tor');
    generateCity(b, 'van');
    expect(businessesIn(a, 'van')).toEqual(businessesIn(b, 'van'));
    expect(businessesIn(a, 'tor')).toEqual(businessesIn(b, 'tor'));
  });
});

describe('the renewal season', () => {
  it('rolls a due contract over and drops one whose vendor left the city', () => {
    const s = game();
    const held = businessesIn(s, 'cal').filter((b) => b.vendor);
    const leave = held[0]!;
    const stay = held.find((b) => b.vendor!.id !== leave.vendor!.id)!;
    expect(stay).toBeDefined();
    const due = quarterStartWeek(s.meta.startDate, 0, 1);
    s.clock.week = stay.renewalWeek = leave.renewalWeek = due;
    const gone = s.rivals[leave.vendor!.id]!;
    gone.branches = gone.branches.filter((r) => r.cityId !== 'cal');
    renewContracts(s);
    expect(stay.renewalWeek).toBeGreaterThan(due);
    expect(isQuarterStart(s.meta.startDate, stay.renewalWeek! * 7)).toBe(true);
    expect(leave.vendor).toBeUndefined();
    expect(leave.renewalWeek).toBeUndefined();
  });
});

describe('save migration 11 → 12', () => {
  it('seeds businesses in every generated city', () => {
    const s = game();
    generateCity(s, 'van');
    const expected = businessesIn(s, 'van');
    // Back to a schema-11 save: no businesses, their storefronts free.
    for (const lot of Object.values(s.world.lots))
      if (lot.occupant?.type === 'business') delete lot.occupant;
    const raw = s as unknown as Record<string, unknown>;
    delete raw.businesses;
    delete (s.rng as Record<string, unknown>)['businesses:cal'];
    delete (s.rng as Record<string, unknown>)['businesses:van'];
    migrations[11]!(raw as never);
    const after = raw as unknown as GameState;
    expect(businessesIn(after, 'van')).toEqual(expected);
    expect(businessesIn(after, 'cal').length).toBeGreaterThan(0);
  });
});
