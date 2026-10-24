// When the game makes a sound (ART_DIRECTION §8), for the cues that follow the
// screen rather than one button: the vault latch when a panel opens (the paper
// slide for the Ledger archive), and the paper slide plus a coin clink when the
// weekly results open on a profitable week. Approvals and counterfeit reveals
// call play('stamp') where they happen.
import { effect } from '@preact/signals';
import type { GameState } from '../../sim/state';
import { modal, panel, peekGame, type ModalRoute, type PanelRoute } from '../store';
import { installAudioUnlock, play } from './sound';

/** The coin lands just after the Ledger has slid in. */
const COIN_DELAY_S = 0.24;

/** A panel's identity without its tab, so switching tabs doesn't relatch. */
export function panelKey(p: PanelRoute | null): string | null {
  if (!p) return null;
  const rest: Record<string, unknown> = { ...p };
  delete rest.tab;
  return JSON.stringify(rest);
}

/** Net income of the week the weekly results report (the snapshot numbered week + 1). */
export function profitableWeek(s: GameState, week: number): boolean {
  const list = s.history.weekly;
  const snap = list.find((w) => w.week === week + 1) ?? list.at(-1);
  return (snap?.netIncome ?? 0) > 0;
}

/** Starts the cues; returns the stop function (GameScreen mounts it). */
export function watchSoundCues(): () => void {
  installAudioUnlock();
  let lastPanel = panelKey(panel.peek());
  let lastModal: ModalRoute | null = modal.peek();
  const stopPanel = effect(() => {
    const p = panel.value;
    const key = panelKey(p);
    if (p && key !== lastPanel) play(p.type === 'ledger' ? 'paper' : 'latch');
    lastPanel = key;
  });
  const stopModal = effect(() => {
    const m = modal.value;
    if (m?.type === 'weekly' && m !== lastModal) {
      play('paper');
      const s = peekGame();
      if (s && profitableWeek(s, m.week)) play('coin', COIN_DELAY_S);
    }
    lastModal = m;
  });
  return () => {
    stopPanel();
    stopModal();
  };
}
