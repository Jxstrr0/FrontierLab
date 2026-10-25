// Departures board view (SCREENS §18): one row per destination except where
// you are, nearest first, with its distance, what the flight would cost (free
// inside the weekly allowance, a one-way fare past it, or your jet), whether
// you've been there, and how many of your branches it has. Pure reads of
// GameState through the sim's flight quote; distances convert to miles for
// display only.
import { KM_PER_MILE } from '../../config/balance';
import { CITIES, DESTINATIONS } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import type { CountryId } from '../../data/types';
import type { GameState } from '../../sim/state';
import { flightQuote, kmRemaining, type FlightQuote } from '../../sim/travel';
import { count, money } from '../format/format';

export type Units = 'km' | 'mi';

/** Board filter: everywhere, or one part of the world. */
export type RegionId = 'all' | 'americas' | 'europe' | 'asiaPacific';

/** Which part of the world each country's airports sit in (a UI grouping only). */
export const REGION_OF: Record<CountryId, Exclude<RegionId, 'all'>> = {
  CA: 'americas',
  US: 'americas',
  UK: 'europe',
  EA: 'europe',
  CH: 'europe',
  JP: 'asiaPacific',
  AU: 'asiaPacific',
  SG: 'asiaPacific',
  HK: 'asiaPacific',
  RU: 'europe',
};

export const REGION_OPTIONS: { value: RegionId; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'americas', label: 'Americas' },
  { value: 'europe', label: 'Europe' },
  { value: 'asiaPacific', label: 'Asia-Pac' },
];

export interface DepartureRow {
  id: string;
  name: string;
  code: string;
  country: CountryId;
  countryName: string;
  region: Exclude<RegionId, 'all'>;
  km: number;
  quote: FlightQuote;
  /** Never visited: the city is generated on arrival. */
  isNew: boolean;
  regional: boolean;
  /** Your open branches there. */
  branches: number;
}

/** A distance for display: "686 km" or "426 mi". */
export function distanceText(km: number, units: Units): string {
  const v = units === 'mi' ? km / KM_PER_MILE : km;
  return `${count(v)} ${units}`;
}

/** Your open (not closed) branches per city. */
function branchesByCity(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of Object.values(s.branches)) {
    if (b.status === 'closed') continue;
    out[b.cityId] = (out[b.cityId] ?? 0) + 1;
  }
  return out;
}

/**
 * Every destination but the current city, nearest first (ties by name). `jet`
 * quotes your own plane where it reaches; elsewhere the normal rules apply.
 */
export function departureRows(s: GameState, jet = false, region: RegionId = 'all'): DepartureRow[] {
  const here = s.world.currentCityId;
  const mine = branchesByCity(s);
  const rows: DepartureRow[] = [];
  for (const id of DESTINATIONS) {
    const spec = CITIES[id];
    if (!spec || id === here) continue;
    const r = REGION_OF[spec.country];
    if (region !== 'all' && r !== region) continue;
    const quote = flightQuote(s, id, jet);
    rows.push({
      id,
      name: spec.name,
      code: spec.airport.code,
      country: spec.country,
      countryName: COUNTRIES[spec.country].name,
      region: r,
      km: quote.km,
      quote,
      isNew: !s.world.cities[id],
      regional: !!spec.regional,
      branches: mine[id] ?? 0,
    });
  }
  return rows.sort((a, b) => a.km - b.km || a.name.localeCompare(b.name));
}

/** The right-hand status of a row: "Free", "Jet" or "C$86.0K ticket". */
export function fareLabel(q: FlightQuote, symbol: string): string {
  if (q.mode === 'jet') return 'Jet';
  if (q.mode === 'free') return 'Free';
  return `${money(q.fare, symbol)} ticket`;
}

/** The small note under a destination's name: country, regional, your branches, new. */
export function rowNote(r: DepartureRow): string {
  const parts = [r.countryName];
  if (r.regional) parts.push('regional site');
  if (r.branches > 0) parts.push(`${r.branches} branch${r.branches === 1 ? '' : 'es'}`);
  return parts.join(' · ');
}

/** Flown this week and the free distance left, in the player's units. */
export function allowanceText(s: GameState): { flown: string; remaining: string } {
  const units = s.settings.units;
  return {
    flown: distanceText(s.world.travel.kmThisWeek, units),
    remaining: distanceText(kmRemaining(s), units),
  };
}

/** The arrival toast: "Welcome to London · first visit · Ticket C$124K (the bank paid C$84.0K)". */
export function arrivalText(
  cityName: string,
  landed: { mode: FlightQuote['mode']; fare: number; bankPays: number; firstVisit: boolean },
  symbol: string,
): string {
  const parts = [`Welcome to ${cityName}`];
  if (landed.firstVisit) parts.push('first visit');
  if (landed.mode === 'fare') {
    const bank = landed.bankPays > 0 ? ` (the bank paid ${money(landed.bankPays, symbol)})` : '';
    parts.push(`Ticket ${money(landed.fare, symbol)}${bank}`);
  }
  return parts.join(' · ');
}
