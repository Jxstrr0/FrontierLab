// Rival sales offices (stage C2b, SIMULATION §18.4): one office per lab per
// city, sized by the branches it stands for; folding offices that meet in a
// city; and the schema 2 → 3 migration that folds old rival networks.
import { describe, expect, it } from 'vitest';
import { sizeMultOf } from '../../src/sim/branch/officeSize';
import { newGame } from '../../src/sim/newGame';
import {
  foldRivalCity,
  giveRivalOffice,
  growStep,
  nearestSize,
  rivalUnits,
} from '../../src/sim/rivalOffices';
import { migrations } from '../../src/sim/save/migrations';
import type { GameState, RivalBank } from '../../src/sim/state';

function game(): GameState {
  return newGame({ seed: 42, cityId: 'cal', competitors: 3 });
}

/** Splits a rival's Calgary office back into `n` Starter branches on free lots. */
function split(s: GameState, bank: RivalBank, n: number): void {
  const office = bank.branches[0]!;
  office.size = 0;
  const free = Object.values(s.world.lots).filter((l) => l.cityId === 'cal' && !l.occupant);
  for (let i = 1; i < n; i++) {
    const lot = free[i]!;
    lot.occupant = { type: 'rival', id: bank.id };
    bank.branches.push({ ...office, id: `${office.id}_${i}`, lotId: lot.id });
  }
}

describe('rival offices', () => {
  it('seeds one office per lab per city', () => {
    const s = game();
    for (const bank of Object.values(s.rivals)) {
      const cities = bank.branches.map((b) => b.cityId);
      expect(new Set(cities).size).toBe(cities.length);
    }
    const rivalLots = Object.values(s.world.lots).filter((l) => l.occupant?.type === 'rival');
    expect(rivalLots).toHaveLength(Object.keys(s.rivals).length);
  });

  it('sizes to the nearest multiplier and grows a step at a time', () => {
    expect(nearestSize(1)).toBe(0);
    expect(nearestSize(2)).toBe(1);
    expect(nearestSize(3)).toBe(1);
    expect(nearestSize(4)).toBe(2);
    expect(nearestSize(30)).toBe(3);
    expect(growStep({ size: 0 })).toBeCloseTo(sizeMultOf(1) - sizeMultOf(0), 9);
    expect(growStep({ size: 3 })).toBe(0);
  });

  it('folds a city into one office, adding books and freeing lots', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    split(s, bank, 4);
    const customers = bank.branches.reduce((x, b) => x + b.customers, 0);
    const arr = bank.branches.reduce((x, b) => x + b.arr, 0);
    const lots = bank.branches.map((b) => b.lotId);
    const office = foldRivalCity(s, bank, 'cal')!;
    expect(bank.branches).toEqual([office]);
    expect(office.size).toBe(nearestSize(4));
    expect(office.customers).toBeCloseTo(customers, 6);
    expect(office.arr).toBeCloseTo(arr, 0);
    for (const id of lots.slice(1)) expect(s.world.lots[id]!.occupant).toBeUndefined();
  });

  it('hands an office to a lab already in the city by folding it in', () => {
    const s = game();
    const [a, b] = Object.values(s.rivals);
    const units = rivalUnits(a!);
    const lot = b!.branches[0]!.lotId;
    giveRivalOffice(s, a!, b!.branches[0]!);
    expect(a!.branches).toHaveLength(1);
    expect(rivalUnits(a!)).toBeGreaterThan(units);
    expect(s.world.lots[lot]!.occupant).toBeUndefined();
  });

  it('migrates schema 2 saves: each rival network folds to one office per city', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    split(s, bank, 3);
    for (const b of bank.branches) delete (b as { size?: number }).size;
    const raw = JSON.parse(JSON.stringify({ ...s, schemaVersion: 2 }));
    const out = migrations[2]!(raw) as unknown as GameState;
    const migrated = out.rivals[bank.id]!;
    expect(migrated.branches).toHaveLength(1);
    expect(migrated.branches[0]!.size).toBe(nearestSize(3));
    const occupied = Object.values(out.world.lots).filter((l) => l.occupant?.id === bank.id);
    expect(occupied).toHaveLength(1);
  });
});
