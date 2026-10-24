// Sports franchises (docs/CONTENT.md §20 "Sports franchises"): one club per
// listed city, playing at the city's stadium. Each plays in a fictional league
// of its sport (separate from the Daily Ledger's national leagues).
export type Sport = 'hockey' | 'football' | 'basketball' | 'baseball' | 'rugby';

export interface FranchiseSpec {
  id: string;
  name: string;
  cityId: string;
  sport: Sport;
  league: string;
  value: number;
}

const f = (s: FranchiseSpec) => s;

export const FRANCHISES: Record<string, FranchiseSpec> = {
  harvest: f({
    id: 'harvest',
    name: 'Saskatoon Harvest',
    cityId: 'sas',
    sport: 'hockey',
    league: 'Dominion Hockey Association',
    value: 320_000_000,
  }),
  bighorns: f({
    id: 'bighorns',
    name: 'Calgary Bighorns',
    cityId: 'cal',
    sport: 'hockey',
    league: 'Dominion Hockey Association',
    value: 900_000_000,
  }),
  lakehawks: f({
    id: 'lakehawks',
    name: 'Toronto Lakehawks',
    cityId: 'tor',
    sport: 'hockey',
    league: 'Dominion Hockey Association',
    value: 2_400_000_000,
  }),
  ravens: f({
    id: 'ravens',
    name: 'Toronto Ravens FC',
    cityId: 'tor',
    sport: 'football',
    league: 'Atlantic Football Conference',
    value: 650_000_000,
  }),
  empire: f({
    id: 'empire',
    name: 'New York Empire FC',
    cityId: 'nyc',
    sport: 'football',
    league: 'Atlantic Football Conference',
    value: 1_900_000_000,
  }),
  ironmen: f({
    id: 'ironmen',
    name: 'Chicago Ironmen',
    cityId: 'chi',
    sport: 'basketball',
    league: 'National Court League',
    value: 3_100_000_000,
  }),
  kingsbridge: f({
    id: 'kingsbridge',
    name: 'London Kingsbridge FC',
    cityId: 'lon',
    sport: 'football',
    league: 'Premier Shires Division',
    value: 3_600_000_000,
  }),
  lumiere: f({
    id: 'lumiere',
    name: 'Paris Lumière FC',
    cityId: 'par',
    sport: 'football',
    league: 'Ligue Continentale',
    value: 2_800_000_000,
  }),
  tide: f({
    id: 'tide',
    name: 'Tokyo Tide',
    cityId: 'tyo',
    sport: 'baseball',
    league: 'Pacific Diamond League',
    value: 1_400_000_000,
  }),
  breakers: f({
    id: 'breakers',
    name: 'Sydney Breakers',
    cityId: 'syd',
    sport: 'rugby',
    league: 'Southern Rugby Union',
    value: 480_000_000,
  }),
};

export const franchisesIn = (cityId: string): FranchiseSpec[] =>
  Object.values(FRANCHISES).filter((x) => x.cityId === cityId);
