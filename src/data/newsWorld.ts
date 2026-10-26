// The world The Weekly Ledger reports on beyond banking (SIMULATION §24,
// CONTENT §23): one fictional sports league per country, fictional neutral
// political parties, the policies they propose, market sectors, each country's
// share index and the reasons analysts give for house-price moves. Every name
// here is invented; none is a real club, league, party or index.
import type { CountryId, Phase } from './types';

export interface LeagueSpec {
  id: string;
  name: string;
  /** Final scores are drawn from this range for each side. */
  score: [number, number];
  /** Football-style leagues allow draws; the rest settle level games in extra time. */
  draws: boolean;
  /** Wording for a game settled after a draw (", after extra time"). */
  extraTime: string;
  /** Six clubs with a strength 0–1 (higher wins more often). */
  clubs: { id: string; name: string; strength: number }[];
}

const club = (id: string, name: string, strength: number) => ({ id, name, strength });

export const LEAGUES: Record<CountryId, LeagueSpec> = {
  CA: {
    id: 'nil',
    name: 'Northern Ice League',
    score: [0, 6],
    draws: false,
    extraTime: ' in overtime',
    clubs: [
      club('larchmere', 'Larchmere Kestrels', 0.66),
      club('ironbridge', 'Ironbridge Wolves', 0.58),
      club('cobaltbay', 'Cobalt Bay Herons', 0.52),
      club('pinecrest', 'Pinecrest Lumberjacks', 0.47),
      club('whitefrost', 'Whitefrost Owls', 0.42),
      club('copperhill', 'Copperhill Moose', 0.35),
    ],
  },
  US: {
    id: 'gdl',
    name: 'Grand Diamond League',
    score: [0, 9],
    draws: false,
    extraTime: ' in extra innings',
    clubs: [
      club('harlow', 'Harlow Falls Pioneers', 0.64),
      club('redmesa', 'Redmesa Coyotes', 0.57),
      club('bellwater', 'Bellwater Lanterns', 0.53),
      club('oakhaven', 'Oakhaven Engineers', 0.48),
      club('silverlake', 'Silverlake Comets', 0.43),
      club('ainsley', 'Port Ainsley Gulls', 0.36),
    ],
  },
  UK: {
    id: 'sfl',
    name: 'Shires Football League',
    score: [0, 4],
    draws: true,
    extraTime: '',
    clubs: [
      club('kettlemere', 'Kettlemere Town', 0.63),
      club('hollowford', 'Hollowford Athletic', 0.58),
      club('brackenmoor', 'Brackenmoor United', 0.52),
      club('ashwick', 'Ashwick Rovers', 0.48),
      club('saltmarsh', 'Saltmarsh Albion', 0.42),
      club('fernleigh', 'Fernleigh City', 0.37),
    ],
  },
  EA: {
    id: 'cfu',
    name: 'Continental Football Union',
    score: [0, 4],
    draws: true,
    extraTime: '',
    clubs: [
      club('valmont', 'Valmont Étoile', 0.65),
      club('rivasol', 'Sporting Rivasol', 0.58),
      club('kastelburg', 'Kastelburg 1898', 0.53),
      club('monteverra', 'AC Monteverra', 0.47),
      club('ostmeer', 'Ostmeer FC', 0.42),
      club('delvaux', 'Delvaux Olympique', 0.35),
    ],
  },
  CH: {
    id: 'ais',
    name: 'Alpine Ice Series',
    score: [0, 6],
    draws: false,
    extraTime: ' in overtime',
    clubs: [
      club('silberhorn', 'Silberhorn Ibex', 0.62),
      club('talwald', 'Talwald Owls', 0.57),
      club('lacbleu', 'Lac Bleu Lynx', 0.52),
      club('rotberg', 'Rotberg Falcons', 0.48),
      club('seeburg', 'Seeburg Bears', 0.44),
      club('montclair', 'Montclair Chamois', 0.37),
    ],
  },
  JP: {
    id: 'pdc',
    name: 'Pacific Diamond Circuit',
    score: [0, 9],
    draws: false,
    extraTime: ' in extra innings',
    clubs: [
      club('minato', 'Minato Tide', 0.63),
      club('kawabe', 'Kawabe Cranes', 0.58),
      club('hoshizora', 'Hoshizora Stars', 0.53),
      club('aokawa', 'Aokawa Thunder', 0.47),
      club('tsukimi', 'Tsukimi Owls', 0.42),
      club('yamabuki', 'Yamabuki Falcons', 0.37),
    ],
  },
  AU: {
    id: 'sol',
    name: 'Southern Oval League',
    score: [48, 118],
    draws: false,
    extraTime: ' after extra time',
    clubs: [
      club('wattlebrook', 'Wattlebrook Swifts', 0.64),
      club('redgum', 'Redgum Quolls', 0.58),
      club('coralbay', 'Coral Bay Rays', 0.52),
      club('ironbark', 'Ironbark Dingoes', 0.47),
      club('saltbush', 'Saltbush Emus', 0.43),
      club('kingfisher', 'Kingfisher Point Kookaburras', 0.36),
    ],
  },
  SG: {
    id: 'sfl_sg',
    name: 'Straits Football League',
    score: [0, 4],
    draws: true,
    extraTime: '',
    clubs: [
      club('bukitselatan', 'Bukit Selatan FC', 0.62),
      club('kampunglaut', 'Kampung Laut Rangers', 0.57),
      club('tanjongbiru', 'Tanjong Biru United', 0.53),
      club('hornbills', 'Harbourfront Hornbills', 0.48),
      club('pulaukecil', 'Pulau Kecil Mariners', 0.43),
      club('seletarvale', 'Seletar Vale', 0.37),
    ],
  },
  HK: {
    id: 'hrs',
    name: 'Harbour Rugby Series',
    score: [6, 38],
    draws: false,
    extraTime: ' after extra time',
    clubs: [
      club('jadecove', 'Jade Cove Dragons', 0.63),
      club('typhoon', 'Typhoon Point Junks', 0.57),
      club('silverstrand', 'Silver Strand Tigers', 0.52),
      club('lotushill', 'Lotus Hill Kites', 0.48),
      club('bambooridge', 'Bamboo Ridge Pandas', 0.43),
      club('harbourlights', 'Harbour Lights', 0.37),
    ],
  },
  RU: {
    id: 'rhl_ru',
    name: 'Northern Ice League',
    score: [0, 7],
    draws: false,
    extraTime: ' in overtime',
    clubs: [
      club('kremenets', 'Kremenets Bears', 0.63),
      club('nevawolves', 'Neva Wolves', 0.58),
      club('birchgrove', 'Birch Grove Lynx', 0.52),
      club('volgastars', 'Volga Stars', 0.47),
      club('uralforge', 'Ural Forge', 0.42),
      club('whitenights', 'White Nights', 0.37),
    ],
  },
};

/** Fictional, neutral parties per country; each poll and proposal names one. */
export const PARTIES: Record<CountryId, string[]> = {
  CA: ['Civic Alliance', 'Unity Party', 'Common Ground Party'],
  US: ['Forward Union', 'Heritage League', 'Citizens’ Forum'],
  UK: ['Commonwealth League', 'New Horizons', 'Bridge Party'],
  EA: ['Progress Coalition', 'Civic Alliance', 'Union of Regions'],
  CH: ['Cantonal Forum', 'Common Ground Party', 'Alpine Union'],
  JP: ['Harmony Party', 'New Horizons', 'Citizens’ Forum'],
  AU: ['Southern Union', 'Common Ground Party', 'Coastal Party'],
  SG: ['Unity Party', 'Harbour Party', 'Progress Coalition'],
  HK: ['Harbour Party', 'Civic Alliance', 'Forward Union'],
  RU: ['Union of Regions', 'Northern Front', 'Common Ground Party'],
};

export interface PolicySpec {
  id: string;
  name: string;
  /** "would {effect}" / "will {effect}". Honest: only CAPITAL_BUFFER changes the game. */
  effect: string;
  /** Extra line when it passes, for policies with an in-game effect. */
  impact?: string;
}

export const CAPITAL_BUFFER_POLICY = 'capital_buffer';

export const POLICIES: PolicySpec[] = [
  {
    id: CAPITAL_BUFFER_POLICY,
    name: 'a temporary capital buffer for banks',
    effect: 'raise capital requirements for banks by one percentage point for a year',
    impact: ' Banks must hold more capital from today.',
  },
  {
    id: 'infrastructure',
    name: 'a ten-year infrastructure plan',
    effect: 'fund new transit lines and bridge repairs',
  },
  {
    id: 'digital_id',
    name: 'a national digital identity card',
    effect: 'let residents prove who they are online',
  },
  { id: 'permits', name: 'faster planning approvals', effect: 'speed up permits for new homes' },
  {
    id: 'apprentice',
    name: 'an apprenticeship guarantee',
    effect: 'fund a training place for every school leaver who wants one',
  },
  {
    id: 'parks',
    name: 'a national parks fund',
    effect: 'protect coastline and forest land for future generations',
  },
  {
    id: 'clocks',
    name: 'an end to clock changes',
    effect: 'keep the clocks on summer time all year round',
  },
  {
    id: 'libraries',
    name: 'longer library hours',
    effect: 'keep public libraries open into the evening',
  },
];

/** Sectors for the weekly market story ("{sector} stocks"). */
export const MARKET_SECTORS = [
  'technology',
  'energy',
  'bank',
  'retail',
  'healthcare',
  'industrial',
  'property',
  'telecom',
  'mining',
  'travel',
];

/** Country names that take "the" mid-sentence ("in the United States"). */
export const COUNTRIES_WITH_THE: CountryId[] = ['US', 'UK', 'EA'];

/** Each country's fictional share index, as the paper names it. */
export const INDEX_NAMES: Record<CountryId, string> = {
  CA: 'Ledger Canada Index',
  US: 'Ledger US Composite',
  UK: 'Ledger UK Index',
  EA: 'Ledger Eurozone Index',
  CH: 'Ledger Swiss Index',
  JP: 'Ledger Japan Index',
  AU: 'Ledger Australia Index',
  SG: 'Ledger Singapore Index',
  HK: 'Ledger Hong Kong Index',
  RU: 'Ledger Russia Index',
};

/** What analysts blame for a year of rising or falling home prices, by phase. */
export const HOUSING_REASONS: Record<'up' | 'down', Record<Phase, string[]>> = {
  up: {
    expansion: [
      'strong wage growth and a shortage of listings',
      'a wave of first-time buyers',
      'bidding wars for family homes',
    ],
    slowdown: [
      'a thin supply of homes even as demand cools',
      'buyers locking in before conditions change',
    ],
    recession: [
      'a lack of new building despite the downturn',
      'few sellers willing to accept less',
    ],
    recovery: [
      'returning confidence and cheaper mortgages',
      'buyers coming back after the downturn',
    ],
  },
  down: {
    expansion: ['a glut of new apartments', 'investors cashing in their gains'],
    slowdown: ['higher mortgage costs cooling demand', 'buyers waiting on the sidelines'],
    recession: ['job losses and tighter lending', 'forced sales as unemployment rises'],
    recovery: ['a slow return of buyers after the downturn', 'stock left over from the slump'],
  },
};

/** Your bank's capital tier as the paper describes it. */
export const TIER_COPY: Record<string, string> = {
  watch: 'a thin cushion that the regulator is watching',
  restricted: 'a cushion so thin that growth is restricted',
  critical: 'a critical shortfall that stops all new lending',
};

/** Why a partnership ended, completing "The partnership has …". */
export const PARTNERSHIP_END_COPY: Record<string, string> = {
  terminated: 'been terminated by the employer',
  lapsed: 'lapsed at the end of its term',
  released: 'been released by the bank',
};
