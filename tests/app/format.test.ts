import { describe, expect, it } from 'vitest';
import { delta, gameDate, money, moneyFull, pct, signedPct } from '../../src/app/format/format';

describe('format', () => {
  it('compacts money for cards and headlines', () => {
    expect(money(1_482_000_000)).toBe('$1.48B');
    expect(money(29_800_000)).toBe('$29.8M');
    expect(money(83_700)).toBe('$83.7K');
    expect(money(950)).toBe('$950');
    expect(money(-12_500, '£')).toBe('−£12.5K');
  });

  it('prints full money and rates', () => {
    expect(moneyFull(1_482_140)).toBe('$1,482,140');
    expect(pct(0.0325)).toBe('3.25%');
    expect(signedPct(0.024)).toBe('+2.40%');
    expect(signedPct(-0.001)).toBe('−0.10%');
  });

  it('describes deltas with tone', () => {
    expect(delta(51_663, 50_000)).toEqual({ text: '+$1,663 (+3%)', tone: 'good' });
    expect(delta(900, 1000).tone).toBe('bad');
    expect(delta(5, 5).tone).toBe('flat');
  });

  it('formats game dates in UTC', () => {
    expect(gameDate('2027-01-04', 0)).toBe('4 Jan 2027');
    expect(gameDate('2027-01-04', 28)).toBe('1 Feb 2027');
  });
});
