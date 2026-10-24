// Pure HQ panel selectors (Stage 4 UI): the release previews must match what
// the release commands actually do, founder-mode coverage wording, the HR
// benefit words and which departments the Add floor sheet offers.
import { describe, expect, it } from 'vitest';
import { benefitEffects, benefitUnit, benefitValueText } from '../../src/app/hq/benefitText';
import { coverageView } from '../../src/app/hq/deptSelectors';
import {
  addableDepts,
  floorToRelease,
  releaseFloorPreview,
  releaseOfficePreview,
} from '../../src/app/hq/officeSelectors';
import { FEATURES } from '../../src/config/balance';
import { BENEFITS } from '../../src/data/benefits';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';

/** A bank with one office: Finance on floors 0 and 2, HR on floor 1. */
function setup() {
  const s = newGame({ seed: 42, cityId: 'cal', bankName: 'HQ Bank' });
  s.company.cash = 50_000_000;
  const listing = Object.values(s.world.officeListings).find(
    (l) => l.cityId === 'cal' && l.floors >= 3,
  )!;
  const r = cmd.leaseOffice(s, listing.id, ['finance', 'hr']);
  if (!r.ok) throw new Error(r.reason);
  const officeId = r.officeId;
  if (!cmd.addFloor(s, officeId, 'finance').ok) throw new Error('addFloor failed');
  const desks = s.offices[officeId]!.desksPerFloor;
  return { s, officeId, desks };
}

describe('HQ release previews', () => {
  it('releasing one of two Finance floors lets go only the staff above the desks left', () => {
    const { s, officeId, desks } = setup();
    const fin = s.departments.finance!;
    fin.staff = fin.target = desks + 5;
    const target = floorToRelease(s, officeId, 'finance')!;
    expect(target).toEqual({ officeId, floor: 2 });
    const p = releaseFloorPreview(s, officeId, target.floor)!;
    expect(p.closes).toBe(false);
    expect(p.letGo).toBe(5);
    const cash = s.company.cash;
    expect(cmd.releaseFloor(s, officeId, target.floor).ok).toBe(true);
    expect(s.departments.finance!.staff).toBe(desks);
    expect(cash - s.company.cash).toBeCloseTo(p.severance, 6);
  });

  it('closing the only HR floor closes the department and pays everyone off', () => {
    const { s, officeId } = setup();
    s.departments.hr!.staff = 4;
    const p = releaseFloorPreview(s, officeId, 1)!;
    expect(p).toMatchObject({ dept: 'hr', closes: true, letGo: 4, desksAfter: 0 });
    const cash = s.company.cash;
    cmd.releaseFloor(s, officeId, 1);
    expect(s.departments.hr).toBeUndefined();
    expect(cash - s.company.cash).toBeCloseTo(p.severance, 6);
  });

  it('releasing the office returns the deposit net of severance', () => {
    const { s, officeId } = setup();
    s.departments.finance!.staff = 3;
    s.departments.hr!.staff = 2;
    const p = releaseOfficePreview(s, officeId)!;
    expect(p.letGo).toBe(5);
    expect(p.depts.every((d) => d.closes)).toBe(true);
    expect(p.writeOff).toBeGreaterThan(0);
    const cash = s.company.cash;
    expect(cmd.releaseOffice(s, officeId).ok).toBe(true);
    expect(s.company.cash - cash).toBeCloseTo(p.deposit - p.severance, 6);
    expect(releaseOfficePreview(s, officeId)).toBeNull();
  });
});

describe('coverage view', () => {
  it('uses founder-mode wording while nothing is required', () => {
    const { s } = setup();
    s.hq.ramp = 0;
    s.hq.coverage.finance = { required: 0, k: 1.2, kPrime: 1, eff: 1 };
    const v = coverageView(s, 'finance');
    expect(v.status).toBe('founder');
    expect(v.text).toBe('Not required yet · Coverage 120%');
    expect(v.note).not.toContain('would need');
  });

  it('reports a shortfall once requirements apply', () => {
    const { s } = setup();
    s.hq.ramp = 1;
    s.hq.coverage.risk = { required: 2.4, k: 0.5, kPrime: 0.5, eff: 0.5 };
    const v = coverageView(s, 'risk');
    expect(v.status).toBe('short');
    expect(v.text).toBe('Needs 3 · Coverage 50%');
  });
});

describe('benefit words', () => {
  it('formats each control type', () => {
    expect(benefitValueText(BENEFITS.tuition!, 1000)).toBe('$1,000 /yr');
    expect(benefitValueText(BENEFITS.pension!, 0.04)).toBe('4.0%');
    expect(benefitValueText(BENEFITS.remote_fri!, 1)).toBe('On');
    expect(benefitUnit(BENEFITS.remote_fri!)).toBe('HQ staff only');
    expect(benefitUnit(BENEFITS.mortgage_disc!)).toBe('discount on the mortgage rate');
  });

  it('shows tuition skill growth at the value, capped', () => {
    expect(benefitEffects(BENEFITS.tuition!, 1000)).toEqual(['+3% skill growth']);
    expect(benefitEffects(BENEFITS.tuition!, 100_000)[0]).toBe('+40% skill growth');
  });
});

describe('add floor choices', () => {
  it('offers no departments with the HQ stage off', () => {
    expect(addableDepts({ ...FEATURES, hq: false })).toEqual([]);
    expect(addableDepts({ ...FEATURES, hq: true })).toContain('finance');
  });
});
