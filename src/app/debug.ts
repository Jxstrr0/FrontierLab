// Debug hook for development and screenshots: with `?debug` in the URL,
// `window.__vs` exposes the live game, commands and a fast-forward. Not used by
// the game itself.
import { REFERENCE_BUILDS } from '../data/equipment';
import * as cmd from '../sim/commands';
import { advanceWeeks } from '../sim/engine';
import { act, bump, openPanel, peekGame, screen, setGame } from './store';
import { newGame } from '../sim/newGame';

export function installDebug(): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const api = {
    game: peekGame,
    act,
    cmd,
    openPanel,
    builds: REFERENCE_BUILDS,
    /** Starts a game in Calgary with seed 42 and opens the game screen. */
    start(seed = 42) {
      setGame(newGame({ seed, cityId: 'cal', version: 'debug' }));
      screen.value = 'game';
    },
    /** Builds a mid branch on the first free Midtown lot and returns its id. */
    quickBranch(): string | undefined {
      const s = peekGame();
      if (!s) return undefined;
      const lot = Object.values(s.world.lots).find((l) => !l.occupant && l.district === 'midtown');
      if (!lot) return undefined;
      const r = act(cmd.buildBranch, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
      return r.ok ? r.branchId : undefined;
    },
    /** Runs whole weeks instantly. */
    advance(weeks: number) {
      const s = peekGame();
      if (s) advanceWeeks(s, weeks);
      bump();
    },
  };
  (window as unknown as { __vs: typeof api }).__vs = api;
}
