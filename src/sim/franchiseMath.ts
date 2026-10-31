// Sports franchise formulas (SCREENS §20, FRANCHISE in balance.ts): squad
// strength and win chance, the finish position from win %, the season and
// transfer-window calendar, salaries by rating, payroll, and a week's revenue
// split. Pure functions of their inputs; franchise.ts applies them.
import { FRANCHISE, WEEKS_PER_YEAR } from '../config/balance';
import { FRANCHISES, SPORT_DRAWS } from '../data/franchises';
import { dateOf, weekOfYear } from './calendar';
import { clamp } from './math';
import type { ClubState, GameState, Player } from './state';

const F = FRANCHISE;

/** Mean star rating over maxStars slots, an empty slot at the replacement rating. */
export function squadStrength(stars: readonly Player[]): number {
  const slots = Math.max(F.maxStars, stars.length);
  const empty = (slots - stars.length) * F.replacementRating;
  return (stars.reduce((s, p) => s + p.rating, 0) + empty) / slots;
}

/** A game's win chance against an average opponent. */
export function winChance(strength: number): number {
  const w = F.winChance;
  return clamp(0.5 + (strength - w.avgRating) * w.perRating, w.range[0], w.range[1]);
}

/** Win % of a record, a draw counting half. */
export function winPct(record: readonly [number, number, number]): number {
  const [w, l, d] = record;
  const games = w + l + d;
  return games === 0 ? 0.5 : (w + d / 2) / games;
}

/** Finish position in the notional league: finishWinPct[1] → 1st, finishWinPct[0] → last. */
export function finishFor(pct: number): number {
  const [lo, hi] = F.finishWinPct;
  const share = clamp((hi - pct) / (hi - lo), 0, 1);
  return 1 + Math.round(share * (F.leagueSize - 1));
}

/** The record as text: W–D–L for football, W–L otherwise. */
export function recordText(clubId: string, record: readonly [number, number, number]): string {
  const [w, l, d] = record;
  return SPORT_DRAWS[FRANCHISES[clubId]?.sport ?? 'hockey'] ? `${w}–${d}–${l}` : `${w}–${l}`;
}

/** This tick's week of the year (1–53). */
export function clubWeek(state: GameState): number {
  return weekOfYear(dateOf(state.meta.startDate, state.clock.day));
}

/**
 * Week index within the season (0 = opening week) or −1 off-season. A 53rd
 * week of the year is off-season, so no week is played twice.
 */
export function seasonWeekIndex(weekOfYear: number): number {
  if (weekOfYear > WEEKS_PER_YEAR) return -1;
  const k = (weekOfYear - F.seasonStartWeek + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
  return k < F.seasonWeeks ? k : -1;
}

/** Games played in season week k: gamesPerSeason spread evenly over seasonWeeks. */
export function gamesInWeek(k: number): number {
  if (k < 0) return 0;
  const G = F.gamesPerSeason;
  const W = F.seasonWeeks;
  return Math.floor((G * (k + 1)) / W) - Math.floor((G * k) / W);
}

/** The transfer window open in this week of the year, if any. */
export function openWindow(weekOfYear: number): readonly [number, number] | undefined {
  return F.transferWindows.find(([a, b]) => weekOfYear >= a && weekOfYear <= b);
}

/** The first week of the next window after this week of the year. */
export function nextWindowStart(weekOfYear: number): number {
  const starts = F.transferWindows.map(([a]) => a);
  return starts.find((a) => a > weekOfYear) ?? starts[0]!;
}

/** Salary weight by rating (SCREENS §20 Squad: better players earn more). */
export function salaryWeight(rating: number): number {
  return Math.max(F.salaryFloor, 1 + (rating - F.salaryPivot) * F.salaryPerRating);
}

/** Yearly salary of a star at the pivot rating for a club worth `value`. */
export function baseStarSalary(value: number): number {
  return (F.revenueYield * value * F.payrollShare * F.starShare) / F.maxStars;
}

export interface Payroll {
  stars: number;
  others: number;
  total: number;
}

/** Yearly payroll: stars, the rest of the squad, total. */
export function payroll(club: ClubState): Payroll {
  const stars = club.stars.reduce((s, p) => s + p.salary, 0);
  return { stars, others: club.otherPayroll, total: stars + club.otherPayroll };
}

/** Tickets and merchandise scale with fan mood: 1.0 at mood 50. */
export function fanFactor(fanMood: number): number {
  return F.fanRevenue.base + (F.fanRevenue.perMood * fanMood) / 100;
}

export interface ClubWeek {
  tickets: number;
  broadcasting: number;
  merchandise: number;
  sponsorship: number;
  payroll: number;
  operations: number;
  revenue: number;
  net: number;
}

/**
 * One week's finances while you own the club: revenue ≈ revenueYield × value
 * a year, tickets paid per home game, sponsorship 0 while your bank is on the
 * shirt (the opportunity cost), payroll/52 and operations at opsShare.
 */
export function clubWeekFinances(club: ClubState, games: number): ClubWeek {
  const yearly = F.revenueYield * club.value;
  const split = F.revenueSplit;
  const fans = fanFactor(club.fanMood);
  const tickets = ((yearly * split.tickets) / F.gamesPerSeason) * games * fans;
  const broadcasting = (yearly * split.broadcasting) / WEEKS_PER_YEAR;
  const merchandise = ((yearly * split.merchandise) / WEEKS_PER_YEAR) * fans;
  const sponsorship =
    club.kit.sponsor === 'bank' ? 0 : (yearly * split.sponsorship) / WEEKS_PER_YEAR;
  const revenue = tickets + broadcasting + merchandise + sponsorship;
  const pay = payroll(club).total / WEEKS_PER_YEAR;
  const operations = F.opsShare * revenue;
  return {
    tickets,
    broadcasting,
    merchandise,
    sponsorship,
    payroll: pay,
    operations,
    revenue,
    net: revenue - pay - operations,
  };
}

/** Net income this season so far (SCREENS §20 Finance). */
export function seasonNet(club: ClubState): number {
  const s = club.season;
  return (
    s.tickets +
    s.broadcasting +
    s.merchandise +
    s.sponsorship -
    s.payroll -
    s.operations -
    (s.transfers ?? 0)
  );
}

export const emptySeason = (): ClubState['season'] => ({
  tickets: 0,
  broadcasting: 0,
  merchandise: 0,
  sponsorship: 0,
  payroll: 0,
  operations: 0,
  transfers: 0,
});
