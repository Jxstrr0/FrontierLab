// Great-circle distances (geo.ts) and the deterministic atan/acos/sin behind them.
import { describe, expect, it } from 'vitest';
import { dacos, datan, dsin } from '../../src/sim/detmath';
import { cityDistanceKm, greatCircleKm } from '../../src/sim/geo';

describe('deterministic trig', () => {
  it('matches Math on a sweep', () => {
    for (let x = -5; x <= 5; x += 0.037) {
      expect(datan(x)).toBeCloseTo(Math.atan(x), 13);
      expect(dsin(x + 5)).toBeCloseTo(Math.sin(x + 5), 13);
    }
    for (let x = -1; x <= 1; x += 0.0123) expect(dacos(x)).toBeCloseTo(Math.acos(x), 12);
    expect(dacos(1)).toBe(0);
    expect(dacos(-1)).toBeCloseTo(Math.PI, 15);
  });
});

describe('city distances', () => {
  it('gives familiar great-circle distances', () => {
    expect(cityDistanceKm('cal', 'cal')).toBe(0);
    expect(cityDistanceKm('cal', 'van')).toBeGreaterThan(660);
    expect(cityDistanceKm('cal', 'van')).toBeLessThan(690);
    expect(cityDistanceKm('nyc', 'lon')).toBeGreaterThan(5540);
    expect(cityDistanceKm('nyc', 'lon')).toBeLessThan(5600);
    expect(cityDistanceKm('lon', 'syd')).toBeGreaterThan(16900);
    expect(cityDistanceKm('lon', 'syd')).toBeLessThan(17050);
    expect(cityDistanceKm('tor', 'nyc')).toBe(cityDistanceKm('nyc', 'tor'));
  });

  it('is accurate for short hops', () => {
    // Amsterdam–Frankfurt is about 365 km.
    expect(greatCircleKm(52.37, 4.9, 50.11, 8.68)).toBeCloseTo(365, -1);
  });
});
