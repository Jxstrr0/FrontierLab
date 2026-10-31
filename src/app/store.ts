// App state outside the simulation: the live GameState, which screen is up, and
// the in-game overlays (panel, modal, sheet, toasts). The GameState is mutated in
// place by commands and ticks, so `rev` is bumped after every change and
// components read it (via useGame) to re-render.
import { signal } from '@preact/signals';
import type { CommandResult } from '../sim/commands';
import type { CountryId } from '../data/types';
import type { DeptId, GameState } from '../sim/state';
import { localizeMoney } from './format/format';

export type Screen = 'title' | 'newgame' | 'game' | 'saves' | 'settings' | 'credits';

/** Full-screen panels on phones, a right drawer on desktop (SCREENS §0.1). */
export type PanelRoute =
  | { type: 'storefront'; lotId: string }
  | { type: 'build'; lotId: string }
  | { type: 'branch'; branchId: string; tab?: BranchTab }
  // Stage C2c: data centers, on a free storefront or a regional energy site.
  | { type: 'buildDataCenter'; lotId?: string; siteId?: string }
  | { type: 'dataCenter'; dataCenterId: string }
  | { type: 'office'; listingId: string }
  | { type: 'hq'; officeId?: string; dept?: DeptId }
  | { type: 'bureau'; siteId: string }
  | { type: 'agency'; siteId: string }
  // Stage 5 (FEATURES.competition)
  | { type: 'rivalBranch'; lotId: string }
  | { type: 'rivalHq'; siteId: string }
  | { type: 'centralBank'; countryId: CountryId }
  | { type: 'employer'; siteId: string }
  // Stage C5a: a customer business on a storefront.
  | { type: 'business'; businessId: string }
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
  | { type: 'carDealer'; siteId: string }
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
  // Late game (§16.14): the frontier projects list.
  | { type: 'projects' }
  // Stage 10: the credits, opened from Settings in game (from the title it is a screen).
  | { type: 'credits' };

export type InvestmentBankTab = 'market' | 'equity' | 'debt' | 'mna';

export type BranchTab = 'service' | 'products' | 'loandesk' | 'marketing' | 'finance';

export type ModalRoute =
  /** `period`: a monthly or quarterly roll-up of the weeks ending at `week` (SCREENS §21); absent for one week. */
  | { type: 'weekly'; week: number; period?: 'monthly' | 'quarterly' }
  | { type: 'incident' }
  | { type: 'boardMeeting' }
  /** The annual report (SCREENS §21b); `year` absent = the latest. */
  | { type: 'annual'; year?: number }
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
  held.length = 0;
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
/** Toasts on screen at once; notices beyond this wait their turn (see notice()). */
const MAX_TOASTS = 3;
/** Week-end notices queued behind a popup or a full toast stack. */
const NOTICE_QUEUE_MAX = 12;
const held: { text: string; tone: Toast['tone']; ms: number }[] = [];

function show(text: string, tone: Toast['tone'], ms: number, action?: Toast['action']): void {
  // Amounts the simulation wrote in dollars follow the currency setting.
  const sym = current?.settings.currency ?? '$';
  const t: Toast = { id: ++toastId, text: localizeMoney(text, sym), tone, action };
  toasts.value = [...toasts.value, t].slice(-MAX_TOASTS);
  setTimeout(() => {
    toasts.value = toasts.value.filter((x) => x.id !== t.id);
    pumpNotices();
  }, ms);
}

/** Immediate feedback for something the player just did (a failed command, a purchase). */
export function toast(
  text: string,
  tone: Toast['tone'] = 'info',
  ms = 3200,
  action?: Toast['action'],
): void {
  show(text, tone, ms, action);
}

/**
 * A notice from the week's events (loop.ts): it waits while a popup is open, so
 * it isn't hidden behind the weekly results, and queues rather than pushing
 * older notices off when several land at once.
 */
export function notice(text: string, tone: Toast['tone'] = 'info', ms = 4200): void {
  held.push({ text, tone, ms });
  if (held.length > NOTICE_QUEUE_MAX) held.splice(0, held.length - NOTICE_QUEUE_MAX);
  pumpNotices();
}

function pumpNotices(): void {
  if (modal.value) return;
  while (held.length > 0 && toasts.value.length < MAX_TOASTS) {
    const n = held.shift()!;
    show(n.text, n.tone, n.ms);
  }
}

modal.subscribe((v) => {
  if (!v) pumpNotices();
});

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

/**
 * Time passes only on the map (DESIGN §5.1): any open panel, sheet or modal
 * holds the clock, so the weekly results and other popups never land on top of
 * a screen you are reading.
 */
export function clockHeld(): boolean {
  return panel.value !== null || sheet.value !== null || modal.value !== null;
}

/**
 * Panels opened from inside another panel stack up, so the header can offer a
 * Back button (SCREENS §0.1) instead of dumping you on the map. Moving within one
 * kind of screen (a tab, an HQ floor) replaces the top rather than stacking.
 */
export const panelHistory = signal<PanelRoute[]>([]);
const MAX_PANEL_HISTORY = 8;

/** Moving within one kind of screen (a tab, an HQ floor, another office) replaces rather than stacks. */
function sameScreen(a: PanelRoute, b: PanelRoute): boolean {
  return a.type === b.type;
}

export function openPanel(route: PanelRoute): void {
  sheet.value = null;
  const from = panel.value;
  if (from && !sameScreen(from, route))
    panelHistory.value = [...panelHistory.value, from].slice(-MAX_PANEL_HISTORY);
  panel.value = route;
}

export function closePanel(): void {
  panel.value = null;
}

/** Back to the panel this one was opened from (Panel header). */
export function backPanel(): void {
  const prev = panelHistory.value.at(-1);
  if (!prev) return closePanel();
  panelHistory.value = panelHistory.value.slice(0, -1);
  panel.value = prev;
}

// Whatever closes the panel (Close, a flight, a new game) ends the trail.
panel.subscribe((v) => {
  if (v === null && panelHistory.value.length > 0) panelHistory.value = [];
});
