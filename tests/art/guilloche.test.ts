import { describe, expect, it } from 'vitest';
import { rosettePaths, rosetteRingPath } from '../../src/art/guilloche';

describe('guilloche rosette', () => {
  it('draws a closed path with one point per step', () => {
    const d = rosetteRingPath(0, 0, { radius: 10, petals: 6, depth: 0.2 }, 12);
    expect(d.startsWith('M8 0')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/[ML]/g)).toHaveLength(13);
  });

  it('pulls petal valleys in by the depth fraction', () => {
    // At θ = 0 the cosine term is +1, so r = R × (1 − depth).
    const d = rosetteRingPath(0, 0, { radius: 100, petals: 4, depth: 0.5 }, 4);
    expect(d.startsWith('M50 0')).toBe(true);
  });

  it('is deterministic and returns one ring per copy', () => {
    const a = rosettePaths(50, 50, { radius: 40, petals: 8, depth: 0.3 }, 5);
    const b = rosettePaths(50, 50, { radius: 40, petals: 8, depth: 0.3 }, 5);
    expect(a).toHaveLength(5);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(5);
  });
});
