// View helpers behind the HQ floor additions: the Treasury floor's partnership
// cards, the IT floor's app rating trend, yearly breach odds and the empty
// CTO seat drag, and the team card's capped staff figure row.
import { describe, expect, it } from 'vitest';
import { staffFigures } from '../../src/app/hq/deptSelectors';
import {
  APP_TREND_WEEKS,
  appRatingTrend,
  ctoVacancyDrag,
  yearlyOdds,
} from '../../src/app/hq/itView';
import { partnershipCards } from '../../src/app/hq/treasury/partnershipCardsView';
import { APP_RATING, WEEKS_PER_YEAR } from '../../src/config/balance';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import type { WeeklySnapshot } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

function partnerGame() {
  const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Card Bank' });
  const branchId = openScriptedBranch(s, 'midtown');
  // Extra paid-in capital so fees are affordable (keeps the balance identity).
  s.company.paidInCapital += 5_000_000;
  s.company.cash += 5_000_000;
  advanceWeeks(s, 2);
  const sites = Object.values(s.world.sites).filter((x) => x.cityId === 'cal');
  const employer = sites.find((x) => x.kind === 'employer')!;
  const university = sites.find((x) => x.kind === 'university')!;
  return { s, branchId, employer, university };
}

describe('partnership cards', () => {
  it('is empty without partnerships', () => {
    expect(partnershipCards(partnerGame().s)).toEqual([]);
  });

  it('lists active deals with the people, term and panel route, runoffs last', () => {
    const { s, branchId, employer, university } = partnerGame();
    const pay = cmd.signPartnership(s, employer.id, branchId, 'plus');
    const stu = cmd.signPartnership(s, university.id, branchId, 'plus', 'student');
    if (!pay.ok) throw new Error(pay.reason);
    if (!stu.ok) throw new Error(stu.reason);
    s.partnerships[pay.partnershipId]!.balance = 1_000;
    const student = s.partnerships[stu.partnershipId]!;
    student.status = 'runoff';
    student.runoffWeeksLeft = 1;
    student.balance = 9_000;

    const cards = partnershipCards(s);
    expect(cards.map((c) => c.id)).toEqual([pay.partnershipId, stu.partnershipId]);
    const [a, b] = cards as [(typeof cards)[0], (typeof cards)[0]];
    expect(a.name).toBe(employer.employer!.name);
    expect(a.kindLabel).toBe('Staff plans');
    expect(a.people).toBe(employer.employer!.employees);
    expect(a.peopleLabel).toBe('Employees');
    expect(a.termText).toMatch(/^Year 1 of \d+$/);
    expect(a.route).toEqual({ type: 'employer', siteId: employer.id });
    expect(b.active).toBe(false);
    expect(b.kindLabel).toBe('Student plans');
    expect(b.peopleLabel).toBe('Students');
    expect(b.termText).toBe('Running off · 1 week left');
    expect(b.route).toEqual({ type: 'university', siteId: university.id });
  });
});

describe('IT floor views', () => {
  const snap = (week: number, appRating?: number) => ({ week, appRating }) as WeeklySnapshot;

  it('keeps the last 26 weeks and skips snapshots without a rating', () => {
    const weekly = Array.from({ length: 30 }, (_, i) => snap(i, i % 2 ? 3 + i / 100 : undefined));
    const t = appRatingTrend(weekly);
    expect(t.every((x) => x.week >= 30 - APP_TREND_WEEKS && x.week % 2 === 1)).toBe(true);
    expect(t).toHaveLength(APP_TREND_WEEKS / 2);
    expect(appRatingTrend([snap(0), snap(1)])).toEqual([]);
  });

  it('turns weekly breach odds into yearly odds', () => {
    expect(yearlyOdds(0)).toBe(0);
    expect(yearlyOdds(0.001)).toBeCloseTo(1 - 0.999 ** WEEKS_PER_YEAR, 10);
    expect(yearlyOdds(1)).toBe(1);
  });

  it('drags the app rating only when a CTO seat once filled is empty', () => {
    const s = newGame({ seed: 7, cityId: 'cal', bankName: 'Seat Bank' });
    expect(ctoVacancyDrag(s)).toBe(0);
    s.executives.hadCto = true;
    expect(ctoVacancyDrag(s)).toBe(APP_RATING.ctoVacancy);
  });
});

describe('team figures', () => {
  it('shows staff then open positions, capped with a remainder', () => {
    expect(staffFigures(4, 6)).toEqual({ filled: 4, open: 2, more: 0, staffOpen: 2 });
    expect(staffFigures(10, 15, 12)).toEqual({ filled: 10, open: 2, more: 3, staffOpen: 5 });
    expect(staffFigures(20, 18, 12)).toEqual({ filled: 12, open: 0, more: 8, staffOpen: 0 });
  });
});
