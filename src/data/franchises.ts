// Sports franchises (docs/CONTENT.md §20 "Sports franchises"): one club per
// listed city, playing at the city's stadium. Each plays in a fictional league
// of its sport (separate from the Weekly Ledger's national leagues). Also the
// positions each sport fields, the kit palette, the clubs' starting kits and
// the outside owners' name shapes. All names are original.
export type Sport = 'hockey' | 'football' | 'basketball' | 'baseball' | 'rugby';

export interface FranchiseSpec {
  id: string;
  name: string;
  cityId: string;
  sport: Sport;
  league: string;
  value: number;
  /** The ground the club plays at (the city's stadium landmark). */
  stadium: string;
  /** Starting kit: palette ids (KIT_COLOURS). */
  kit: [string, string];
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
    stadium: 'Prairie Gardens',
    kit: ['gold', 'forest'],
  }),
  bighorns: f({
    id: 'bighorns',
    name: 'Calgary Bighorns',
    cityId: 'cal',
    sport: 'hockey',
    league: 'Dominion Hockey Association',
    value: 900_000_000,
    stadium: 'Foothills Dome',
    kit: ['crimson', 'ivory'],
  }),
  lakehawks: f({
    id: 'lakehawks',
    name: 'Toronto Lakehawks',
    cityId: 'tor',
    sport: 'hockey',
    league: 'Dominion Hockey Association',
    value: 2_400_000_000,
    stadium: 'Harbourfront Arena',
    kit: ['navy', 'ivory'],
  }),
  ravens: f({
    id: 'ravens',
    name: 'Toronto Ravens FC',
    cityId: 'tor',
    sport: 'football',
    league: 'Atlantic Football Conference',
    value: 650_000_000,
    stadium: 'Lakeshore Park',
    kit: ['black', 'crimson'],
  }),
  empire: f({
    id: 'empire',
    name: 'New York Empire FC',
    cityId: 'nyc',
    sport: 'football',
    league: 'Atlantic Football Conference',
    value: 1_900_000_000,
    stadium: 'Riverside Grounds',
    kit: ['royal', 'gold'],
  }),
  ironmen: f({
    id: 'ironmen',
    name: 'Chicago Ironmen',
    cityId: 'chi',
    sport: 'basketball',
    league: 'National Court League',
    value: 3_100_000_000,
    stadium: 'Westgate Hall',
    kit: ['black', 'gold'],
  }),
  kingsbridge: f({
    id: 'kingsbridge',
    name: 'London Kingsbridge FC',
    cityId: 'lon',
    sport: 'football',
    league: 'Premier Shires Division',
    value: 3_600_000_000,
    stadium: 'Kingsbridge Lane',
    kit: ['crimson', 'navy'],
  }),
  lumiere: f({
    id: 'lumiere',
    name: 'Paris Lumière FC',
    cityId: 'par',
    sport: 'football',
    league: 'Ligue Continentale',
    value: 2_800_000_000,
    stadium: 'Parc des Lumières',
    kit: ['royal', 'crimson'],
  }),
  tide: f({
    id: 'tide',
    name: 'Tokyo Tide',
    cityId: 'tyo',
    sport: 'baseball',
    league: 'Pacific Diamond League',
    value: 1_400_000_000,
    stadium: 'Bayfront Field',
    kit: ['teal', 'ivory'],
  }),
  breakers: f({
    id: 'breakers',
    name: 'Sydney Breakers',
    cityId: 'syd',
    sport: 'rugby',
    league: 'Southern Rugby Union',
    value: 480_000_000,
    stadium: 'Headland Oval',
    kit: ['teal', 'navy'],
  }),
};

export const franchisesIn = (cityId: string): FranchiseSpec[] =>
  Object.values(FRANCHISES).filter((x) => x.cityId === cityId);

export const SPORT_LABEL: Record<Sport, string> = {
  hockey: 'Hockey',
  football: 'Football',
  basketball: 'Basketball',
  baseball: 'Baseball',
  rugby: 'Rugby',
};

/** Positions a star can play, per sport. */
export const SPORT_POSITIONS: Record<Sport, readonly string[]> = {
  hockey: ['Centre', 'Winger', 'Defence', 'Goaltender'],
  football: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  basketball: ['Guard', 'Forward', 'Centre'],
  baseball: ['Pitcher', 'Catcher', 'Infielder', 'Outfielder'],
  rugby: ['Prop', 'Lock', 'Flanker', 'Scrum-half', 'Fly-half', 'Wing', 'Fullback'],
};

/** Only football games can end level (the record reads W–D–L). */
export const SPORT_DRAWS: Record<Sport, boolean> = {
  hockey: false,
  football: true,
  basketball: false,
  baseball: false,
  rugby: false,
};

/** The kit palette (SCREENS §20 Kit colour pickers). */
export const KIT_COLOURS: Record<string, { name: string; hex: string }> = {
  crimson: { name: 'Crimson', hex: '#9e2b2b' },
  navy: { name: 'Navy', hex: '#1f2f4f' },
  royal: { name: 'Royal blue', hex: '#2f5aa8' },
  teal: { name: 'Teal', hex: '#1f7a74' },
  forest: { name: 'Forest', hex: '#2f5a3a' },
  gold: { name: 'Gold', hex: '#c9a23a' },
  black: { name: 'Black', hex: '#1c1c1c' },
  ivory: { name: 'Ivory', hex: '#f3ecd8' },
};

/** Outside owners: {first} and {last} come from the name pools (CONTENT §26). */
export const OWNER_NAME_SHAPES = [
  'the {last} family',
  '{first} {last}',
  '{last} Sports Holdings',
  'the {last} Group',
] as const;
