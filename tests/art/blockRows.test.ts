import { describe, expect, it } from 'vitest';
import { frontageAt, rowPlan, splitUnits } from '../../src/art/blockRows';
import { generateCityMap, tileAt } from '../../src/art/citygen';
import { CITIES } from '../../src/data/cities';
import { newGame } from '../../src/sim/newGame';

const closed = { a0: false, a1: false, b0: false, b1: false };

describe('street-hugging rows', () => {
  it('runs a single-street row along that street, edge to edge into its neighbours', () => {
    const p = rowPlan({ ...closed, b1: true }, 0.6, 0.05);
    expect(p.rect).toEqual([0, 0.95 - 0.6, 1, 0.95]);
    expect(p.alongA).toBe(true);
    expect(p.face).toBe('left');
    const q = rowPlan({ ...closed, a0: true }, 0.6, 0.05);
    expect(q.rect).toEqual([0.05, 0, 0.65, 1]);
    expect(q.alongA).toBe(false);
    expect(q.face).toBeNull();
  });

  it('fills a corner tile and leaves an inner tile as a court', () => {
    const corner = rowPlan({ ...closed, a1: true, b1: true }, 0.6, 0.05);
    expect(corner.rect).toEqual([0, 0, 0.95, 0.95]);
    expect(corner.court).toBe(false);
    expect(rowPlan(closed, 0.6, 0.05).court).toBe(true);
  });

  it('splits a row into equal houses that tile the footprint', () => {
    const units = splitUnits([0, 0.3, 1, 0.9], true, 4);
    expect(units).toHaveLength(4);
    expect(units[0]![0]).toBe(0);
    expect(units[3]![2]).toBeCloseTo(1);
    for (let k = 1; k < 4; k++) expect(units[k]![0]).toBeCloseTo(units[k - 1]![2]);
  });

  it('reads street and water sides (and the map edge) from the city map', () => {
    const s = newGame({ seed: 42, cityId: 'lon' });
    const lots = Object.values(s.world.lots).filter((l) => l.cityId === 'lon');
    const map = generateCityMap(CITIES.lon!, 42, lots);
    const n = map.tiles;
    const open = (x: number, y: number) =>
      x < 0 || y < 0 || x >= n || y >= n || ['street', 'water'].includes(tileAt(map, x, y)!.kind);
    for (let y = 0; y < n; y += 3) {
      for (let x = 0; x < n; x += 2) {
        expect(frontageAt(map, x, y)).toEqual({
          a0: open(x - 1, y),
          a1: open(x + 1, y),
          b0: open(x, y - 1),
          b1: open(x, y + 1),
        });
      }
    }
  });
});
