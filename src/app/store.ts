// App state outside the simulation: the live GameState, which screen is up, and
// the in-game overlays (panel, modal, sheet, toasts). The GameState is mutated in
// place by commands and ticks, so `rev` is bumped after every change and
// components read it (via useGame) to re-render.
import { signal } from '@preact/signals';
import type { CommandResult } from '../sim/commands';
import type { CountryId } from '../data/types';
import type { DeptId, GameState } from '../sim/state';

export type Screen = 'title' | 'newgame' | 'game' | 'saves' | 'settings' | 'credits';

/** Full-screen panels on phones, a right drawer on desktop (SCREENS §0.1). */
export type PanelRoute =
  | { type: 'storefront'; lotId: string }
  | { type: 'build'; lotId: string }
  | { type: 'branch'; branchId: string; tab?: BranchTab }
  | { type: 'office'; listingId: string }
  | { type: 'hq'; officeId?: string; dept?: DeptId }
  | { type: 'bureau'; siteId: string }
  | { type: 'agency'; siteId: string }
  // Stage 5 (FEATURES.competition)
  | { type: 'rivalBranch'; lotId: string }
  | { type: 'rivalHq'; siteId: string; tab?: 'overview' | 'loans' | 'credit' }
  | { type: 'centralBank'; countryId: CountryId }
  | { type: 'employer'; siteId: string }
  | { type: 'university'; siteId: string }
  | { type: 'ledger'; week?: number }
  // Stage 6 (FEATURES.capitalMarkets)
  | { type: 'investmentBank'; siteId: string; tab?: InvestmentBankTab }
  // Stage 7 (FEATURES.investments)
  | { type: 'startup'; startupId: string }
  | { type: 'property'; siteId: string }
  | { type: 'convention'; siteId: string }
  | { type: 'lobbyingFirm'; siteId: string }
  // Stage 9 (FEATURES.personalEmpire)
  | { type: 'wealth' }
  | { type: 'vacationHome'; siteId: string }
  | { type: 'carDealer'; siteId: string; tab?: 'showroom' | 'financing' }
  | { type: 'auctionHouse'; siteId: string; tab?: 'buy' | 'sell' }
  | { type: 'franchise'; clubId: string }
  // Stage 8 (FEATURES.multiCity): the airport's departures; `jet` = "Fly now" in your own plane.
  | { type: 'airport'; jet?: boolean }
  | { type: 'company' }
  | { type: 'branches' }
  | { type: 'cityList' }
  | { type: 'settings' }
  | { type: 'saves' }
  // Menu screens added by the audit fixes (SCREENS §0.3).
  | { type: 'portfolio' }
  | { type: 'milestones' }
  // Stage 10: the credits, opened from Settings in game (from the title it is a screen).
  | { type: 'credits' };

export type InvestmentBankTab = 'market' | 'equity' | 'mna';

export type BranchTab = 'service' | 'products' | 'loandesk' | 'marketing' | 'finance';

export type ModalRoute =
  | { type: 'weekly'; week: number }
  | { type: 'incident' }
  /** `reminder`: opened by the quarterly auto-pause, showing a prompt first (SIMULATION §2). */
  | { type: 'boardMeeting'; reminder?: boolean }
  | { type: 'gameover' };

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
  /** An optional button on the toast, e.g. "Export" when storage is full. */
  action?: { label: string; run: () => void };
}

export const screen = signal<Screen>('title');
export const panel = signal<PanelRoute | null>(null);
export const modal = signal<ModalRoute | null>(null);
export const sheet = signal<'menu' | 'layers' | 'travel' | null>(null);
export const toasts = signal<Toast[]>([]);

/** Bumped after every mutation of the current game. */
export const rev = signal(0);
let current: GameState | null = null;

export function setGame(state: GameState | null): void {
  current = state;
  panel.value = null;
  modal.value = null;
  sheet.value = null;
  rev.value++;
}

/** The current game, or null on the title screens. Does not subscribe. */
export function peekGame(): GameState | null {
  return current;
}

/** The current game for in-game components; subscribes the caller to changes. */
export function useGame(): GameState {
  void rev.value;
  if (!current) throw new Error('No game loaded');
  return current;
}

export function bump(): void {
  rev.value++;
}

let toastId = 0;
export function toast(
  text: string,
  tone: Toast['tone'] = 'info',
  ms = 3200,
  action?: Toast['action'],
): void {
  const t: Toast = { id: ++toastId, text, tone, action };
  toasts.value = [...toasts.value, t].slice(-3);
  setTimeout(() => {
    toasts.value = toasts.value.filter((x) => x.id !== t.id);
  }, ms);
}

/**
 * Runs a sim command against the current game, re-renders, and toasts the
 * reason when it fails. Returns the command's result.
 *   act(cmd.setPrice, branchId, 'savings', 0.025)
 */
export function act<A extends unknown[], R extends CommandResult>(
  fn: (state: GameState, ...args: A) => R,
  ...args: A
): R {
  if (!current) throw new Error('No game loaded');
  const result = fn(current, ...args);
  if (!result.ok) toast(result.reason, 'bad');
  bump();
  return result;
}

export function openPanel(route: PanelRoute): void {
  sheet.value = null;
  panel.value = route;
}

export function closePanel(): void {
  panel.value = null;
}
