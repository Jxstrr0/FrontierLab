// Sports franchise formulas (SCREENS §20, FRANCHISE): win chance, finish
// position, the season and window calendar, the weekly finance split with the
// kit-sponsorship opportunity cost, and seeded payrolls.
import { describe, expect, it } from 'vitest';
import { FRANCHISE as F } from '../../src/config/balance';
import { FRANCHISES } from '../../src/data/franchises';
import {
  clubWeekFinances,
  finishFor,
  gamesInWeek,
  nextWindowStart,
  openWindow,
  payroll,
  seasonWeekIndex,
  squadStrength,
  winChance,
  winPct,
} from '../../src/sim/franchiseMath';
import { newGame } from '../../src/sim/newGame';
import type { ClubState } from '../../src/sim/state';

const game = () => newGame({ seed: 42, cityId: 'cal', bankName: 'Club Bank' });

describe('franchise formulas', () => {
  it('wins half the time at the league average, clamped at the extremes', () => {
    expect(winChance(F.winChance.avgRating)).toBeCloseTo(0.5, 9);
    expect(winChance(F.winChance.avgRating + 4)).toBeCloseTo(0.6, 9);
    expect(winChance(200)).toBe(F.winChance.range[1]);
    expect(winChance(0)).toBe(F.winChance.range[0]);
  });

  it('counts empty star slots at the replacement rating', () => {
    const p = (rating: number) => ({
      id: 'x',
      name: 'x',
      position: 'x',
      rating,
      salary: 1,
      years: 1,
    });
    expect(squadStrength([p(90), p(80), p(70), p(80), p(80)])).toBe(80);
    expect(squadStrength([p(90)])).toBe((90 + 4 * F.replacementRating) / 5);
    expect(squadStrength([p(90)])).toBeLessThan(squadStrength([p(90), p(70)]));
  });

  it('maps win % to a finish in a league of 12', () => {
    expect(finishFor(0.8)).toBe(1);
    expect(finishFor(0.75)).toBe(1);
    expect(finishFor(0.5)).toBe(7);
    expect(finishFor(0.25)).toBe(12);
    expect(finishFor(0.1)).toBe(12);
    expect(winPct([10, 10, 0])).toBe(0.5);
    expect(winPct([10, 6, 4])).toBe(0.6);
    expect(winPct([0, 0, 0])).toBe(0.5);
  });

  it('plays 40 games over the 40-week season from week 36, none off-season', () => {
    expect(seasonWeekIndex(36)).toBe(0);
    expect(seasonWeekIndex(52)).toBe(16);
    expect(seasonWeekIndex(1)).toBe(17);
    expect(seasonWeekIndex(23)).toBe(39);
    expect(seasonWeekIndex(24)).toBe(-1);
    expect(seasonWeekIndex(53)).toBe(-1);
    let games = 0;
    for (let w = 1; w <= 53; w++) games += gamesInWeek(seasonWeekIndex(w));
    expect(games).toBe(F.gamesPerSeason);
  });

  it('opens transfer windows in weeks 1–4 and 27–34', () => {
    expect(openWindow(1)).toEqual([1, 4]);
    expect(openWindow(4)).toEqual([1, 4]);
    expect(openWindow(5)).toBeUndefined();
    expect(openWindow(30)).toEqual([27, 34]);
    expect(nextWindowStart(5)).toBe(27);
    expect(nextWindowStart(40)).toBe(1);
  });
});

describe('club finances', () => {
  const club = (): ClubState => structuredClone(game().clubs.bighorns!);

  it('splits revenue ≈ 12% of value a year across the four lines', () => {
    const c = club();
    c.fanMood = 50; // fan factor 1.0
    const wk = clubWeekFinances(c, 1);
    const yearly = F.revenueYield * c.value;
    expect(wk.broadcasting).toBeCloseTo((yearly * 0.4) / 52, 4);
    expect(wk.merchandise).toBeCloseTo((yearly * 0.15) / 52, 4);
    expect(wk.sponsorship).toBeCloseTo((yearly * 0.15) / 52, 4);
    expect(wk.tickets).toBeCloseTo((yearly * 0.3) / F.gamesPerSeason, 4);
    expect(wk.operations).toBeCloseTo(F.opsShare * wk.revenue, 4);
    expect(wk.payroll).toBeCloseTo(payroll(c).total / 52, 4);
    // Off-season weeks sell no tickets.
    expect(clubWeekFinances(c, 0).tickets).toBe(0);
  });

  it('forgoes the sponsorship income while your bank is the kit sponsor', () => {
    const c = club();
    const outside = clubWeekFinances(c, 1);
    c.kit.sponsor = 'bank';
    const bank = clubWeekFinances(c, 1);
    expect(bank.sponsorship).toBe(0);
    expect(bank.tickets).toBe(outside.tickets);
    expect(outside.net - bank.net).toBeCloseTo(outside.sponsorship * (1 - F.opsShare), 4);
  });

  it('sells more tickets and shirts when the fans are happy', () => {
    const c = club();
    c.fanMood = 20;
    const sad = clubWeekFinances(c, 1);
    c.fanMood = 90;
    const happy = clubWeekFinances(c, 1);
    expect(happy.tickets).toBeGreaterThan(sad.tickets);
    expect(happy.merchandise).toBeGreaterThan(sad.merchandise);
    expect(happy.broadcasting).toBe(sad.broadcasting);
  });

  it('seeds every club with 5 stars and a payroll of 55% of revenue', () => {
    const s = game();
    expect(Object.keys(s.clubs).sort()).toEqual(Object.keys(FRANCHISES).sort());
    for (const c of Object.values(s.clubs)) {
      expect(c.stars).toHaveLength(F.maxStars);
      expect(c.owner).toBe('outside');
      expect(c.ownerName.length).toBeGreaterThan(3);
      const total = payroll(c).total;
      expect(Math.abs(total - F.payrollShare * F.revenueYield * c.value)).toBeLessThan(2);
      expect(payroll(c).stars / total).toBeCloseTo(F.starShare, 3);
      expect(c.lastFinish).toBeGreaterThanOrEqual(1);
      expect(c.lastFinish).toBeLessThanOrEqual(F.leagueSize);
      for (const p of c.stars) expect(p.name).toMatch(/^\S+ \S+/);
    }
  });
});
