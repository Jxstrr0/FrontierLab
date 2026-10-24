// Sports franchises (DESIGN §5.16, SCREENS §20, FRANCHISE in balance.ts): every
// club's value and outside owner, its season (games, finish, fan mood) and
// transfer market; for yours the weekly finances and kit sponsorship, which
// raises your bank's brand awareness across the club's country (SIMULATION §7).
// Stream: `franchise`.
import { FRANCHISE } from '../config/balance';
import { CITIES } from '../data/cities';
import { FRANCHISES, SPORT_DRAWS, type FranchiseSpec } from '../data/franchises';
import { pushEvent } from './events';
import {
  clubWeek,
  clubWeekFinances,
  emptySeason,
  finishFor,
  gamesInWeek,
  openWindow,
  recordText,
  seasonWeekIndex,
  squadStrength,
  winChance,
  winPct,
} from './franchiseMath';
import { makeMarket, ownerName, seedSquad } from './franchisePlayers';
import { earn, spend } from './ledger';
import { clamp } from './math';
import { withAssetMarks } from './portfolio';
import { stream, type Rng } from './rng';
import type { ClubState, GameState } from './state';

const F = FRANCHISE;
const WEEKS_PER_YEAR = 52;
const MOOD_MID = 50;

/** Every club with its outside owner and squad (newGame and migration 9 → 10). */
export function seedClubs(state: GameState): void {
  const rng = stream(state, 'franchise');
  const window = openWindow(clubWeek(state));
  for (const spec of Object.values(FRANCHISES)) {
    if (state.clubs[spec.id]) continue;
    const { stars, otherPayroll } = seedSquad(state, rng, spec);
    const last = winChance(squadStrength(stars)) + rng.normal(0, F.seedFinishNoise);
    state.clubs[spec.id] = {
      clubId: spec.id,
      owner: 'outside',
      ownerName: ownerName(rng),
      value: spec.value,
      stars,
      otherPayroll,
      market: [],
      record: [0, 0, 0],
      lastFinish: finishFor(last),
      fanMood: rng.int(F.fanMood.start[0], F.fanMood.start[1]),
      kit: { primary: spec.kit[0], secondary: spec.kit[1], sponsor: 'outside' },
      season: emptySeason(),
    };
    // A game that starts mid-window finds the market already open.
    if (window) state.clubs[spec.id]!.market = makeMarket(state, rng, spec, spec.value);
  }
}

export const isYours = (club: ClubState | undefined): boolean => !!club && club.owner !== 'outside';

/** Clubs you own, company or personally, in FRANCHISES order. */
export function yourClubs(state: GameState): ClubState[] {
  return Object.values(state.clubs ?? {}).filter(isYours);
}

/** You own a club playing in this city (Arena Naming Rights needs one, CONTENT §11). */
export function ownsClubIn(state: GameState, cityId: string): boolean {
  return yourClubs(state).some((c) => FRANCHISES[c.clubId]?.cityId === cityId);
}

/** Weekly (tick step 11): games, transfer market, value; for yours finances and kit awareness. */
export function runFranchises(state: GameState): void {
  if (!state.clubs) return;
  const rng = stream(state, 'franchise');
  const woy = clubWeek(state);
  const k = seasonWeekIndex(woy);
  const games = gamesInWeek(k);
  const window = openWindow(woy);
  for (const spec of Object.values(FRANCHISES)) {
    const club = state.clubs[spec.id];
    if (!club) continue;
    if (k === 0) {
      club.record = [0, 0, 0];
      club.season = emptySeason();
    }
    playGames(rng, spec, club, games);
    club.fanMood = clamp(club.fanMood + (MOOD_MID - club.fanMood) * F.fanMood.drift, 0, 100);
    if (isYours(club)) payWeek(state, club, games);
    const growth = F.leagueGrowth / WEEKS_PER_YEAR + rng.normal(0, F.valueNoise);
    markClub(state, club, club.value * (1 + growth));
    if (k === F.seasonWeeks - 1) endSeason(state, rng, spec, club);
    if (!window) club.market = [];
    else if (woy === window[0] && club.market.length === 0)
      club.market = makeMarket(state, rng, spec, club.value);
  }
  kitAwareness(state);
}

/** Sets a club's value; a company club's change is marked to the books (investmentGains). */
export function markClub(state: GameState, club: ClubState, value: number): void {
  if (club.owner === 'company') withAssetMarks(state, () => (club.value = value));
  else club.value = value;
}

/** This week's games against an average opponent; fan mood moves with each result. */
function playGames(rng: Rng, spec: FranchiseSpec, club: ClubState, games: number): void {
  const p = winChance(squadStrength(club.stars));
  for (let g = 0; g < games; g++) {
    if (SPORT_DRAWS[spec.sport] && rng.chance(F.drawChance)) {
      club.record[2] += 1;
    } else if (rng.chance(p)) {
      club.record[0] += 1;
      club.fanMood = Math.min(100, club.fanMood + F.fanMood.perWin);
    } else {
      club.record[1] += 1;
      club.fanMood = Math.max(0, club.fanMood - F.fanMood.perLoss);
    }
  }
}

/** Your club's week: revenue and costs to the owner, and the season totals. */
function payWeek(state: GameState, club: ClubState, games: number): void {
  const wk = clubWeekFinances(club, games);
  const s = club.season;
  s.tickets += wk.tickets;
  s.broadcasting += wk.broadcasting;
  s.merchandise += wk.merchandise;
  s.sponsorship += wk.sponsorship;
  s.payroll += wk.payroll;
  s.operations += wk.operations;
  if (club.owner === 'company') {
    earn(state, 'franchiseRevenue', wk.revenue);
    spend(state, 'franchiseCosts', wk.payroll + wk.operations);
  } else {
    // Personal money may go negative; the founder covers it.
    state.personal.cash += wk.net;
  }
}

/**
 * Season end: finish from win %, fan mood by place, contracts run down (an
 * expiring star re-signs) and ratings drift. Yours: value ± performanceSwing
 * by results (SIMULATION §22), a CLUB_SEASON event for the Ledger.
 */
function endSeason(state: GameState, rng: Rng, spec: FranchiseSpec, club: ClubState): void {
  const pct = winPct(club.record);
  const pos = finishFor(pct);
  club.lastFinish = pos;
  const midTable = (F.leagueSize + 1) / 2;
  club.fanMood = clamp(club.fanMood + (midTable - pos) * F.fanMood.perPlace, 0, 100);
  for (const p of club.stars) {
    p.years -= 1;
    if (p.years <= 0) p.years = rng.int(F.contractYears[0], F.contractYears[1]);
    const drift = rng.int(-F.ratingDrift, F.ratingDrift);
    p.rating = clamp(p.rating + drift, F.ratingRange[0], F.ratingRange[1]);
  }
  if (!isYours(club)) return;
  const swing = clamp((pct - 0.5) / (F.finishWinPct[1] - 0.5), -1, 1);
  markClub(state, club, club.value * (1 + F.performanceSwing * swing));
  pushEvent(
    state,
    'CLUB_SEASON',
    {
      clubId: spec.id,
      club: spec.name,
      league: spec.league,
      pos,
      record: recordText(spec.id, club.record),
    },
    4,
    spec.id,
  );
}

/** §7: your bank on the shirt adds kitAwareness × (1 − b) to every generated city of the club's country. */
function kitAwareness(state: GameState): void {
  for (const club of yourClubs(state)) {
    if (club.kit.sponsor !== 'bank') continue;
    const country = CITIES[FRANCHISES[club.clubId]?.cityId ?? '']?.country;
    if (!country) continue;
    for (const city of Object.values(state.world.cities)) {
      if (!city.generated || CITIES[city.id]?.country !== country) continue;
      const b = city.brandAwareness;
      city.brandAwareness = clamp(b + F.kitAwareness * (1 - b), 0, 1);
    }
  }
}
