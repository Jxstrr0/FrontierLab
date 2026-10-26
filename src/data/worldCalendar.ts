// The world calendar (CONTENT §23.6): the Nations Cup and World Games every
// four years, a World Expo every five, and the annual fixtures (film awards,
// a science prize, New Year fireworks and the big sale weekend). Each nation's
// strength at football and across the Games, the prize fields and the films
// that win. Every name is invented; nations are the game's ten economies.
import type { CountryId } from './types';

export interface NationSpec {
  /** How the nation's teams are named ("Europa" for the eurozone). */
  team: string;
  /** 0–1: football strength at the Nations Cup. */
  cup: number;
  /** 0–1: strength across the World Games. */
  games: number;
}

export const NATIONS: Record<CountryId, NationSpec> = {
  CA: { team: 'Canada', cup: 0.45, games: 0.55 },
  US: { team: 'United States', cup: 0.55, games: 0.9 },
  UK: { team: 'United Kingdom', cup: 0.7, games: 0.65 },
  EA: { team: 'Europa', cup: 0.85, games: 0.85 },
  CH: { team: 'Switzerland', cup: 0.45, games: 0.35 },
  JP: { team: 'Japan', cup: 0.55, games: 0.7 },
  AU: { team: 'Australia', cup: 0.5, games: 0.6 },
  SG: { team: 'Singapore', cup: 0.25, games: 0.2 },
  HK: { team: 'Hong Kong', cup: 0.25, games: 0.2 },
  RU: { team: 'Russia', cup: 0.5, games: 0.7 },
};

/**
 * When each fixture runs: the week of the year it starts, which years (year %
 * every === offset), how far ahead it is announced and how long it lasts.
 */
export const FIXTURES = {
  cup: { name: 'Nations Cup', every: 4, offset: 2, week: 25, announceWeeks: 4 },
  games: { name: 'World Games', every: 4, offset: 0, week: 30, announceWeeks: 4 },
  expo: { name: 'World Expo', every: 5, offset: 0, week: 18, runWeeks: 26 },
  filmAwards: { name: 'Gilded Reel Awards', week: 10 },
  prize: { name: 'Aldermere Prize', week: 41 },
  fireworks: { week: 1 },
  saleWeekend: { name: 'Grand Sale Weekend', week: 47 },
};

export const PRIZE_FIELDS = [
  { field: 'physics', work: 'a material that conducts electricity without loss' },
  { field: 'medicine', work: 'a vaccine that needs no refrigeration' },
  { field: 'economics', work: 'research on why people save too little' },
  { field: 'chemistry', work: 'a plastic that dissolves in seawater' },
  { field: 'literature', work: 'a trilogy about three generations of fishermen' },
  { field: 'peace', work: 'brokering a water-sharing treaty' },
];

export const FILMS = [
  'The Last Ferry to Morrow',
  'Paper Kingdoms',
  'A Quiet Harbour',
  'The Orchard Keeper',
  'Static Bloom',
  'Nine Winters',
  'The Salt Road',
];

/** World Games sports for "{name} won {n} golds in {sport}". */
export const GAMES_SPORTS = ['swimming', 'athletics', 'cycling', 'rowing', 'gymnastics', 'sailing'];
