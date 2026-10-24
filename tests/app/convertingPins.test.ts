// Acquired branches still converting (SIMULATION §19.8, SCREENS §2): your pin
// wears the old bank's ink and monogram with progress and an accessible label,
// re-renders as the weeks count down, and the renderer flags the old ink.
import { describe, expect, it } from 'vitest';
import { buildPins, occupantsOf, pinsKey } from '../../src/app/map/pins';
import { generateCityMap } from '../../src/art/citygen';
import { FEATURES, MERGERS } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';

const NO_HQ = { ...FEATURES, hq: false, competition: false };

describe('converting branch pins', () => {
  it('shows the old brand, progress and weeks left, and changes key as it counts down', () => {
    const s = newGame({ seed: 42, cityId: 'cal', bankName: 'Pin Bank' });
    const branchId = openScriptedBranch(s, 'midtown');
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'cal');
    const map = generateCityMap(CITIES.cal!, s.meta.seed, lots);
    const branch = s.branches[branchId]!;
    branch.converting = {
      rivalId: 'x',
      name: 'Old Bank',
      ink: '#123456',
      monogram: 'OB',
      weeksLeft: 3,
    };
    const pins = buildPins(s, map, lots, NO_HQ);
    const mine = pins.find((p) => p.branchId === branchId)!;
    expect(mine.kind).toBe('mine');
    expect(mine.ink).toBe('#123456');
    expect(mine.monogram).toBe('OB');
    expect(mine.label).toContain('converting from Old Bank, 3 weeks left');
    const total = MERGERS.conversionWeeks;
    expect(mine.converting?.progress).toBeCloseTo((total - 3) / total, 10);
    expect(occupantsOf(s, lots, NO_HQ)[branch.lotId]).toEqual({ type: 'player', ink: '#123456' });

    const before = pinsKey(pins);
    branch.converting.weeksLeft = 2;
    expect(pinsKey(buildPins(s, map, lots, NO_HQ))).not.toBe(before);
    delete branch.converting;
    const done = buildPins(s, map, lots, NO_HQ).find((p) => p.branchId === branchId)!;
    expect(done.ink).toBe(s.meta.brandInk);
    expect(done.converting).toBeUndefined();
  });
});
