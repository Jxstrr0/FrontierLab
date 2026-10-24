// Stadium pins (SCREENS §20): one per club on the city's stadium landmark,
// "For sale" while an outside group owns it, your brand-ink seal once yours,
// and Toronto's two clubs side by side.
import { describe, expect, it } from 'vitest';
import { stadiumPins } from '../../src/app/franchise/stadiumPin';
import { landmarkAnchor } from '../../src/app/map/landmarkPins';
import { generateCityMap } from '../../src/art/citygen';
import { CITIES } from '../../src/data/cities';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';

const mapFor = (cityId: string) => {
  const s = newGame({ seed: 42, cityId, bankName: 'Pin Bank' });
  const lots = Object.values(s.world.lots).filter((l) => l.cityId === cityId);
  return { s, map: generateCityMap(CITIES[cityId]!, s.meta.seed, lots) };
};

describe('stadium pins', () => {
  it('puts the club on the stadium, for sale until you buy it', () => {
    const { s, map } = mapFor('cal');
    const at = landmarkAnchor(map, 'stadium')!;
    const [pin] = stadiumPins(s, map);
    expect(pin).toMatchObject({
      id: 'stadium_bighorns',
      kind: 'stadium',
      clubId: 'bighorns',
      icon: 'sportsTeams',
      tag: 'For sale',
      x: at.x,
      y: at.y,
    });
    s.personal.cash = 2e9;
    expect(cmd.buyClub(s, 'bighorns', s.clubs.bighorns!.value, 'personal').ok).toBe(true);
    const [mine] = stadiumPins(s, map);
    expect(mine!.partner).toBe(true);
    expect(mine!.tag).toBeUndefined();
    expect(mine!.ink).toBe(s.meta.brandInk);
    expect(mine!.label).toMatch(/your club/);
  });

  it('spreads two clubs either side of one stadium, and none where there is no club', () => {
    const { s, map } = mapFor('tor');
    const pins = stadiumPins(s, map);
    expect(pins.map((p) => p.clubId)).toEqual(['lakehawks', 'ravens']);
    const at = landmarkAnchor(map, 'stadium')!;
    expect(pins[0]!.x).toBeLessThan(at.x);
    expect(pins[1]!.x).toBeGreaterThan(at.x);
    expect((pins[0]!.x + pins[1]!.x) / 2).toBeCloseTo(at.x, 9);
    const other = mapFor('mtl');
    expect(stadiumPins(other.s, other.map)).toEqual([]);
  });
});
