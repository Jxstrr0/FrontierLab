// Shared pieces for The Weekly Ledger's composer (SIMULATION §24): the story
// candidate every source produces, the context they read (your bank's name,
// currency, home country, the countries and cities you operate in) and small
// name lookups. Stories carry a template key, a subject and raw tokens; news.ts
// picks the variant and renders the text.
import { CITIES } from '../data/cities';
import { COUNTRIES } from '../data/countries';
import { DISTRICT_SPECS } from '../data/districts';
import type { TemplateKey } from '../data/ledgerTemplates';
import { COUNTRIES_WITH_THE } from '../data/newsWorld';
import type { CountryId, DistrictId, Week } from '../data/types';
import type { GameEvent, GameState, LedgerTab } from './state';
import { homeCountry } from './treasury';

/** Icon vignette ids, drawn by src/app/weekly/ledgerIcons.tsx. */
export type LedgerIconId =
  | 'facade'
  | 'dome'
  | 'chart'
  | 'coin'
  | 'alert'
  | 'shield'
  | 'gavel'
  | 'trophy'
  | 'handshake'
  | 'house'
  | 'ballot'
  | 'person'
  | 'spark';

export interface Story {
  key: TemplateKey;
  /** What the story is about, for the no-repeat rule: `${key}:${subject}`. */
  subject: string;
  tab: LedgerTab;
  icon: LedgerIconId;
  priority: number;
  tokens: Record<string, string>;
  /** Caps how many stories of this kind one issue carries (NEWS_GROUP_CAPS). */
  group?: string;
}

export interface NewsContext {
  state: GameState;
  week: Week;
  sym: string;
  bank: string;
  home: CountryId;
  /** Countries with one of your branches, plus your home country. */
  operated: Set<CountryId>;
  /** Cities with one of your branches, plus your home city. */
  yourCities: Set<string>;
  /** This issue's events: this week's tick plus anything that arrived mid-week since the last issue. */
  events: GameEvent[];
}

export function newsContext(state: GameState, events: GameEvent[]): NewsContext {
  const home = homeCountry(state).id;
  const operated = new Set<CountryId>([home]);
  // Home rather than wherever you happen to stand, so a visit doesn't reshuffle the paper.
  const yourCities = new Set<string>([state.meta.homeCityId]);
  for (const b of Object.values(state.branches)) {
    yourCities.add(b.cityId);
    const country = CITIES[b.cityId]?.country;
    if (country) operated.add(country);
  }
  return {
    state,
    week: state.clock.week,
    sym: state.settings.currency,
    bank: state.meta.bankName,
    home,
    operated,
    yourCities,
    events,
  };
}

export const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
export const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export const cityName = (id: string): string => CITIES[id]?.name ?? 'town';
export const countryName = (id: CountryId): string => COUNTRIES[id]?.name ?? id;
/** The name as it reads mid-sentence: "the United States", "Canada". */
export const theCountryName = (id: CountryId): string =>
  COUNTRIES_WITH_THE.includes(id) ? `the ${countryName(id)}` : countryName(id);
export const districtName = (id: string): string =>
  DISTRICT_SPECS[id as DistrictId]?.name ?? 'the district';

/**
 * The city with most of your open branches (first opened wins a tie), limited
 * to one country when given; undefined if you have none there.
 */
export function busiestCity(state: GameState, country?: CountryId): string | undefined {
  const counts = new Map<string, number>();
  for (const b of Object.values(state.branches)) {
    if (b.status === 'closed') continue;
    if (country && CITIES[b.cityId]?.country !== country) continue;
    counts.set(b.cityId, (counts.get(b.cityId) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const [id, n] of counts) if (best === undefined || n > counts.get(best)!) best = id;
  return best;
}

/** The city the paper uses for a country: where most of your branches are, your home city, else its first city. */
export function cityFor(state: GameState, country: CountryId): string {
  const best = busiestCity(state, country);
  if (best) return cityName(best);
  if (CITIES[state.meta.homeCityId]?.country === country) return cityName(state.meta.homeCityId);
  return cityName(Object.values(CITIES).find((c) => c.country === country)?.id ?? '');
}
