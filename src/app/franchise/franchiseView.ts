// Read-only views for the sports franchise panel (SCREENS §20): the club with
// its spec, who owns it, whether you can buy here, the offer stepper's bounds,
// the transfer-window status line and the Finance tab's statement rows.
import { FRANCHISE } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { COUNTRIES } from '../../data/countries';
import { FRANCHISES, type FranchiseSpec } from '../../data/franchises';
import { clubWeek, nextWindowStart, openWindow, seasonNet } from '../../sim/franchiseMath';
import type { ClubState, GameState } from '../../sim/state';

export interface ClubView {
  spec: FranchiseSpec;
  club: ClubState;
  owned: boolean;
  /** Who owns it, as a phrase: "the Delgado family", "Club Bank", "you". */
  ownerLabel: string;
  city: string;
  country: string;
  inCity: boolean;
}

export function clubView(s: GameState, clubId: string): ClubView | undefined {
  const spec = FRANCHISES[clubId];
  const club = s.clubs?.[clubId];
  if (!spec || !club) return undefined;
  const owned = club.owner !== 'outside';
  const countryId = CITIES[spec.cityId]?.country;
  return {
    spec,
    club,
    owned,
    ownerLabel:
      club.owner === 'company'
        ? s.meta.bankName
        : club.owner === 'personal'
          ? `You (${s.meta.founderName})`
          : club.ownerName.charAt(0).toUpperCase() + club.ownerName.slice(1),
    city: CITIES[spec.cityId]?.name ?? spec.cityId,
    country: countryId ? COUNTRIES[countryId].name : '',
    inCity: s.world.currentCityId === spec.cityId,
  };
}

/** Offer stepper: offerFloor × value up to the valuation, in steps of offerStep × value. */
export function offerBounds(value: number): { min: number; max: number; step: number } {
  const step = Math.max(1000, Math.round((value * FRANCHISE.offerStep) / 1000) * 1000);
  const min = Math.round((value * FRANCHISE.offerFloor) / step) * step;
  return { min, max: Math.round(value / step) * step, step };
}

/** "Open until week 34" or "Transfer window closed until week 27". */
export function windowStatus(s: GameState): { open: boolean; text: string } {
  const woy = clubWeek(s);
  const w = openWindow(woy);
  if (w) return { open: true, text: `Transfer window open until week ${w[1]}` };
  return { open: false, text: `Transfer window closed until week ${nextWindowStart(woy)}` };
}

/** Fan mood in words for the Club tab. */
export function moodWord(mood: number): string {
  if (mood >= 75) return 'Ecstatic';
  if (mood >= 60) return 'Happy';
  if (mood >= 40) return 'Steady';
  if (mood >= 25) return 'Restless';
  return 'Angry';
}

export interface FinanceRows {
  revenue: [string, number][];
  expenses: [string, number][];
  totalRevenue: number;
  totalExpenses: number;
  net: number;
}

/** SCREENS §20 Finance: this season's revenue and expense lines and net income. */
export function financeRows(club: ClubState): FinanceRows {
  const s = club.season;
  const revenue: [string, number][] = [
    ['Tickets', s.tickets],
    ['Broadcasting', s.broadcasting],
    ['Merchandise', s.merchandise],
    ['Sponsorship', s.sponsorship],
  ];
  const expenses: [string, number][] = [
    ['Payroll', s.payroll],
    ['Operations', s.operations],
  ];
  if (s.transfers) expenses.push(['Transfers and releases', s.transfers]);
  const sum = (rows: [string, number][]) => rows.reduce((t, [, v]) => t + v, 0);
  return {
    revenue,
    expenses,
    totalRevenue: sum(revenue),
    totalExpenses: sum(expenses),
    net: seasonNet(club),
  };
}
