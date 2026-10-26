import { describe, expect, it } from 'vitest';
import {
  capitalRatioText,
  delta,
  exactMoney,
  figure,
  gameDate,
  money,
  moneyFull,
  moneyStepper,
  pct,
  percentText,
  signedPct,
} from '../../src/app/format/format';

describe('format', () => {
  it('compacts money for cards and headlines', () => {
    expect(money(1_482_000_000)).toBe('$1.48B');
    expect(money(2_100_000_000_000)).toBe('$2.10T');
    expect(money(29_800_000)).toBe('$29.8M');
    expect(money(83_700)).toBe('$83.7K');
    expect(money(950)).toBe('$950');
    expect(money(-12_500, '£')).toBe('−£10.0K');
  });

  it('converts money to the chosen currency at fixed rates', () => {
    expect(money(900_000, '$')).toBe('$900K');
    expect(money(900_000, 'C$')).toBe('C$1.22M');
    expect(money(900_000, '£')).toBe('£720K');
    expect(money(900_000, '€')).toBe('€810K');
    expect(money(900_000, '¥')).toBe('¥135M');
    expect(moneyFull(1_000, '¥')).toBe('¥150,000');
    expect(figure(1_000, '€')).toBe('900');
    expect(exactMoney(4.5, '$')).toBe('$4.50');
    expect(exactMoney(4.5, '¥')).toBe('¥675');
    expect(delta(1_100, 1_000, '¥').text).toBe('+¥15,000 (+10%)');
  });

  it('lets money steppers be typed in the chosen currency', () => {
    const yen = moneyStepper('¥');
    expect(yen.format(1_000)).toBe('¥150,000');
    expect(yen.editText(1_000)).toBe('150000');
    expect(yen.parse('¥150,000')).toBe(1_000);
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

  it('prints rates as editable percents and caps the capital ratio', () => {
    expect(percentText(0.0325)).toBe('3.25');
    expect(percentText(0.07)).toBe('7');
    expect(percentText(0.1 + 0.2)).toBe('30');
    expect(capitalRatioText(0.125)).toBe('12.5%');
    expect(capitalRatioText(8.4)).toBe('100%+');
  });
});
