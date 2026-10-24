// App state outside the simulation: the live GameState, which screen is up, and
// the in-game overlays (panel, modal, sheet, toasts). The GameState is mutated in
// place by commands and ticks, so `rev` is bumped after every change and
// components read it (via useGame) to re-render.
import { signal } from '@preact/signals';
import type { CommandResult } from '../sim/commands';
import type { GameState } from '../sim/state';

export type Screen = 'title' | 'newgame' | 'game' | 'saves' | 'settings';

/** Full-screen panels on phones, a right drawer on desktop (SCREENS §0.1). */
export type PanelRoute =
  | { type: 'storefront'; lotId: string }
  | { type: 'build'; lotId: string }
  | { type: 'branch'; branchId: string; tab?: BranchTab }
  | { type: 'company' }
  | { type: 'branches' }
  | { type: 'cityList' }
  | { type: 'settings' }
  | { type: 'saves' };

export type BranchTab = 'service' | 'products' | 'loandesk' | 'marketing' | 'finance';

export type ModalRoute = { type: 'weekly'; week: number } | { type: 'gameover' };

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
}

export const screen = signal<Screen>('title');
export const panel = signal<PanelRoute | null>(null);
export const modal = signal<ModalRoute | null>(null);
export const sheet = signal<'menu' | 'layers' | null>(null);
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
export function toast(text: string, tone: Toast['tone'] = 'info', ms = 3200): void {
  const t = { id: ++toastId, text, tone };
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
