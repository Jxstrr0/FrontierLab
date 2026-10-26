// Stage 9 state types (SIMULATION §22, DESIGN §5.16, SCREENS §19–20, §23): the
// founder's homes, cars and collectibles, auction houses' schedules, sports
// clubs, the rich list and insider-trading cases.
import type { Id, Money, Week } from '../data/types';

export interface OwnedHome {
  id: Id;
  homeId: string;
  price: Money;
  value: Money;
  boughtWeek: Week;
  /** The country's hpi when the value was last set (value tracks hpi). */
  hpiRef: number;
  /** A rebuild under way finishes this week (value +HOMES_CFG.rebuildGain). */
  rebuildDoneWeek?: Week;
  rebuilds?: number;
}

export interface OwnedCar {
  id: Id;
  carId: string;
  price: Money;
  value: Money;
  boughtWeek: Week;
}

export interface OwnedCollectible {
  id: Id;
  itemId: string;
  /** Where it was bought. */
  houseId: string;
  price: Money;
  /** Fair value as if genuine until appraised; 0 once found to be fake. */
  value: Money;
  /** Hidden from the player until appraised. */
  genuine: boolean;
  appraised: boolean;
  /** An appraisal under way reports this week. */
  appraisalWeek?: Week;
  /** Consigned for sale at this house's next auction. */
  consignedTo?: string;
  boughtWeek: Week;
}

export interface AuctionLot {
  id: Id;
  itemId: string;
  estimate: Money;
  /** Hidden: whether this lot is genuine. */
  genuine: boolean;
  /** Your consigned collectible being sold in this lot. */
  consignedId?: Id;
  /** Your max bid, if any. */
  maxBid?: Money;
}

export interface AuctionResult {
  week: Week;
  itemId: string;
  price: Money;
  /** 'you' won it, 'sold' (your consignment sold), or 'other'. */
  outcome: 'you' | 'sold' | 'other';
  /** The lot's pre-sale estimate. */
  estimate?: Money;
}

export interface AuctionHouseState {
  houseId: string;
  /** Week the next sale is held; its lots are listed from previewWeeks before. */
  nextWeek: Week;
  /** Week the next sale's lots were listed (unset until its preview window opens). */
  listedWeek?: Week;
  lots: AuctionLot[];
  history: AuctionResult[];
}

export interface Player {
  id: Id;
  name: string;
  position: string;
  /** 0–100. */
  rating: number;
  salary: Money;
  /** Contract years left. */
  years: number;
  /** Transfer fee to sign this player (transfer market only). */
  fee?: Money;
}

export interface ClubState {
  clubId: string;
  /** Who owns it: an outside group until you buy it. */
  owner: 'outside' | 'company' | 'personal';
  ownerName: string;
  value: Money;
  /** What you paid (when yours). */
  price?: Money;
  boughtWeek?: Week;
  /** Star players; the rest of the payroll is a lump. */
  stars: Player[];
  otherPayroll: Money;
  /** Transfer market players available while a window is open. */
  market: Player[];
  /** This season: wins, losses, draws. */
  record: [number, number, number];
  lastFinish?: number;
  /** 0–100. */
  fanMood: number;
  kit: { primary: string; secondary: string; sponsor: 'outside' | 'bank' };
  /** Finance this season so far (SCREENS §20 Finance). */
  season: {
    tickets: Money;
    broadcasting: Money;
    merchandise: Money;
    sponsorship: Money;
    payroll: Money;
    operations: Money;
    /** Transfer fees paid and release settlements this season. */
    transfers?: Money;
  };
}

export interface RichFortune {
  id: Id;
  name: string;
  source: string;
  worth: Money;
}

export interface InsiderCase {
  week: Week;
  side: 'buy' | 'sell';
  shares: number;
  price: Money;
  /** Quarter-end it resolves at (the trade's gain is measured then). */
  resolveWeek: Week;
}

export interface PersonalEmpire {
  homes: OwnedHome[];
  cars: OwnedCar[];
  collectibles: OwnedCollectible[];
  richList: { fortunes: RichFortune[]; rank?: number; lastRankWeek?: Week };
  insider: { pending: InsiderCase[] };
  /** Home id → week until which its seller won't hear another offer (a refusal). */
  offerLocks?: Record<string, Week>;
  /** Net worth at each weekly close, oldest first (WEALTH_HISTORY_WEEKS), for the weekly change. */
  netWorthLog?: Money[];
}
