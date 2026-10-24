// Stage 7 state types (schema v8): startups and the venture pipeline,
// conventions, real estate (properties and listings), foreclosed-home modes and
// lobbying campaigns. Re-exported from state.ts. See docs/DATA_MODEL.md §7 and
// SIMULATION §20, §21 and DESIGN §5.8.10.
import type { CountryId, Id, Money, Pct, Pentagon, Rate, Week } from '../data/types';
import type { AvatarSpec } from './state';

// ─── Ventures (SIMULATION §20) ────────────────────────────────────────────────

export type StartupStage = 'seed' | 'A' | 'B' | 'C' | 'D' | 'public' | 'acquired' | 'failed';

export interface StartupHolder {
  /** 'company', 'personal', or a generated holder id (founders, funds). */
  id: Id;
  name: string;
  kind: 'company' | 'personal' | 'founder' | 'fund';
  shares: number;
  /** What you paid in total (company and personal holders), for gain display. */
  cost?: Money;
}

/** One of the two 15% offer lots in an open round (REFERENCE_NOTES §12). */
export interface RoundLot {
  shares: number;
  /** Share of post-round shares, 0–1. */
  pct: Pct;
  /** Price for the whole lot. */
  price: Money;
  taken?: 'company' | 'personal' | 'fund';
}

export interface StartupRound {
  /** "Series B", "Seed" … */
  name: string;
  pricePerShare: Money;
  /** New money raised in the round. */
  amount: Money;
  lots: RoundLot[];
  openedWeek: Week;
  closesWeek: Week;
}

export interface VentureDebt {
  principal: Money;
  balance: Money;
  rate: Rate;
  weeksLeft: number;
  /** Weekly amortized payment. */
  payment: Money;
  /** Lender: your company or you personally. */
  lender: 'company' | 'personal';
  startWeek: Week;
}

export interface Startup {
  id: Id;
  name: string;
  /** Sector id in src/data/startups.ts. */
  sector: string;
  description: string;
  /** Founding year. */
  founded: number;
  ceo: { name: string; portrait: AvatarSpec };
  /** Management, Product maturity, Market size, Competitiveness, Financial health (1–10). */
  pentagon: Pentagon;
  stage: StartupStage;
  shares: number;
  /** Post-money valuation of the latest round. */
  postMoney: Money;
  /** Price per share of the latest round (marks, §20.6). */
  lastPrice: Money;
  cash: Money;
  /** Quarterly results, oldest first (last 12); cash and debt at quarter end when known. */
  quarters: { revenue: Money; netIncome: Money; cash?: Money; debt?: Money }[];
  round?: StartupRound;
  history: { round: string; amount: Money; week: Week }[];
  holders: StartupHolder[];
  ventureDebt?: VentureDebt;
  /** Where you can see it: the Investment floor pipeline or a convention only. */
  seenAt: 'pipeline' | 'convention';
  conventionId?: Id;
  /** Listed company id once it has IPO'd (§20.2). */
  listedCompanyId?: Id;
  /** Price per share paid in an acquisition. */
  exitPrice?: Money;
  endedWeek?: Week;
}

export interface VenturesState {
  startups: Record<Id, Startup>;
  /** Startups the Investment floor currently shows (§20.3). */
  pipeline: Id[];
  pipelineRefreshWeek: Week;
  /** Portfolio totals at last week's step 8, for the Investment floor's weekly change. */
  valueLog?: { week: Week; company: Money; personal: Money };
}

// ─── Conventions (CONTENT §19) ────────────────────────────────────────────────

export interface ConventionRun {
  /** Convention id in src/data/conventions.ts. */
  conventionId: Id;
  cityId: Id;
  year: number;
  /** First week it is open (announced two weeks before). */
  startWeek: Week;
  endWeek: Week;
  /** Exclusive startups shown only here (§20.3). */
  startupIds: Id[];
  announced: boolean;
  /** CONVENTION_OPEN has been sent. */
  opened?: boolean;
}

export interface ConventionsState {
  /** This year's and next year's runs, oldest first. */
  runs: ConventionRun[];
}

// ─── Real estate (SIMULATION §21) ─────────────────────────────────────────────

export interface Property {
  /** The building's site id. */
  id: Id;
  cityId: Id;
  owner: 'company' | 'personal';
  sqm: number;
  purchasePrice: Money;
  boughtWeek: Week;
  value: Money;
  /** Annual rent per m² you charge. */
  rent: number;
  /** Market rent per m² per year (district × city rentIndex). */
  marketRent: number;
  occupancy: Pct;
  forSale: boolean;
  /** Week the sale completes while listed for sale. */
  saleWeek?: Week;
}

/** A building currently for sale (refreshed every 4 weeks per city, §21.1). */
export interface PropertyListing {
  siteId: Id;
  estimate: Money;
  asking: Money;
  occupancy: Pct;
  listedWeek: Week;
  /** An offer the seller turned down; no further offers until the listings refresh. */
  rejectedOffer?: Money;
}

export interface RealEstateState {
  /** Owned buildings, keyed by site id. */
  properties: Record<Id, Property>;
  /** Buildings for sale, keyed by site id. */
  listings: Record<Id, PropertyListing>;
  listingsRefreshWeek: Record<Id, Week>;
}

// ─── Lobbying (DESIGN §5.8.10, SCREENS §15) ───────────────────────────────────

export interface LobbyCampaign {
  id: Id;
  /** Firm id and campaign id in src/data/lobbying.ts. */
  firmId: string;
  campaignId: string;
  country: CountryId;
  cost: Money;
  startWeek: Week;
  resolveWeek: Week;
  status: 'pending' | 'won' | 'lost';
  exposed?: boolean;
}

export interface LobbyingState {
  /** Campaigns, newest last (resolved ones kept for the firm's history). */
  campaigns: LobbyCampaign[];
  /** A won "Fast-track a merger review": the next deal's city share limit is relaxed (§19.8). */
  fastTrack?: boolean;
  /** A won "Ease the capital buffer": your home tier thresholds drop by pp until the week. */
  bufferRelief?: { country: CountryId; pp: number; untilWeek: Week };
  /** A won "Stall the capital buffer bill": the pending bill in that country fails its vote. */
  blockBill?: { country: CountryId; untilWeek: Week };
}

// ─── Currencies (SIMULATION §19.10) ───────────────────────────────────────────

export interface FxPosition {
  /** Currency units held; value = units × the currency's rate vs home. */
  units: number;
  /** Total paid, for gain display. */
  cost: Money;
}

export interface FxState {
  /**
   * Each country's strength level (starts at FX_START_INDEX). A currency's rate
   * against your home currency is level[c] / level[home] × FX_START_INDEX.
   */
  level: Partial<Record<CountryId, number>>;
  /** Weekly rates vs your home currency, oldest first. */
  history: Partial<Record<CountryId, number[]>>;
  positions: {
    company: Partial<Record<CountryId, FxPosition>>;
    personal: Partial<Record<CountryId, FxPosition>>;
  };
}
