// Debug hook for development and screenshots: with `?debug` in the URL,
// `window.__vs` exposes the live game, commands and a fast-forward. Not used by
// the game itself.
import { tileCenter } from '../art/iso';
import { CITIES } from '../data/cities';
import { REFERENCE_BUILDS } from '../data/equipment';
import * as cmd from '../sim/commands';
import { advanceWeeks } from '../sim/engine';
import { forceIncident } from '../sim/incidents';
import { INCIDENT_SPECS } from '../data/incidents';
import { investmentBanksIn } from '../data/investmentBanks';
import { listPendingIpo } from '../sim/equityIpo';
import { listLots } from '../sim/auctions';
import {
  act,
  bump,
  closePanel,
  modal,
  openPanel,
  peekGame,
  screen,
  setGame,
  type ModalRoute,
} from './store';
import { newGame } from '../sim/newGame';
import { importCode } from '../sim/save/serialize';
import { startFlight } from './airport/flight';
import { activeMap } from './map/MapView';
import { loadFromSlot, saveToSlot, type SlotId } from './saves';

export function installDebug(): void {
  if (!new URLSearchParams(location.search).has('debug')) return;
  const api = {
    game: peekGame,
    act,
    cmd,
    openPanel,
    closePanel,
    builds: REFERENCE_BUILDS,
    /** Starts a game (Calgary, seed 42 by default) and opens the game screen. */
    start(seed = 42, cityId = 'cal') {
      setGame(newGame({ seed, cityId, version: 'debug' }));
      screen.value = 'game';
    },
    /** Builds a mid branch on the first free Midtown lot and returns its id. */
    quickBranch(): string | undefined {
      const s = peekGame();
      if (!s) return undefined;
      const lot = Object.values(s.world.lots).find(
        (l) => !l.occupant && l.district === 'midtown' && l.cityId === s.world.currentCityId,
      );
      if (!lot) return undefined;
      const r = act(cmd.buildBranch, { lotId: lot.id, build: REFERENCE_BUILDS.mid });
      return r.ok ? r.branchId : undefined;
    },
    /** Opens a modal by route, e.g. a monthly results report, for screenshots. */
    openModal(route: ModalRoute) {
      modal.value = route;
    },
    /** Pauses the clock and closes any open modal (weekly results, game over). */
    pause() {
      const s = peekGame();
      if (s) s.clock.speed = 0;
      modal.value = null;
      bump();
    },
    /** The map camera ({cx, cy, zoom}: world point at screen centre), viewport and pin cost. */
    camera() {
      const m = activeMap();
      return m ? { ...m.camera, viewport: m.viewport, pinUpdateMs: m.pinUpdateMs } : null;
    },
    /** Centres the map on a lot or a site (zoom defaults to 1). */
    flyTo(lotId: string, zoom = 1) {
      const s = peekGame();
      const lot = s?.world.lots[lotId] ?? s?.world.sites[lotId];
      const city = s && CITIES[s.world.currentCityId];
      if (!lot || !city) return false;
      activeMap()?.flyTo(tileCenter(city.tiles, lot.tile.x, lot.tile.y), zoom);
      return true;
    },
    /** Saves the game to a slot; resolves to an error message or null. */
    save(slot: SlotId = '1') {
      const s = peekGame();
      return s ? saveToSlot(slot, s) : Promise.resolve('No game');
    },
    /** Opens a save code (an exported save, e.g. a tests/fixtures file) in the game screen. */
    importSave(code: string) {
      setGame(importCode(code.trim()));
      screen.value = 'game';
    },
    /** Loads a slot into the game screen. */
    async load(slot: SlotId = '1') {
      setGame(await loadFromSlot(slot));
      screen.value = 'game';
    },
    /**
     * Raises an incident now (a robbery at your first branch by default) and opens
     * the incident modal. Scope defaults to the first branch, the city or 'company'.
     */
    incident(type = 'ROBBERY', scope?: string) {
      const s = peekGame();
      const spec = INCIDENT_SPECS[type];
      if (!s || !spec) return undefined;
      const fallback =
        spec.scope === 'branch'
          ? Object.keys(s.branches)[0]
          : spec.scope === 'city'
            ? s.world.currentCityId
            : spec.scope;
      const inc = forceIncident(s, type, scope ?? fallback ?? 'company');
      if (inc && s.incidents.active.includes(inc)) modal.value = { type: 'incident' };
      bump();
      return inc?.id;
    },
    /**
     * Flies to a city or regional site (Stage 8) with the plane animation, by
     * the normal rules or, with `jet`, in your own plane where it reaches.
     * `animate: false` runs the travelTo command at once instead.
     */
    travel(cityId: string, jet = false, animate = true) {
      if (animate) return startFlight(cityId, jet);
      return act(cmd.travelTo, cityId, { jet }).ok;
    },
    /** Sets the founder's personal cash (e.g. to try buying a jet or paying a fare). */
    personalCash(amount: number) {
      const s = peekGame();
      if (s) s.personal.cash = amount;
      bump();
      return s?.personal.cash;
    },
    /**
     * Auctions (Stage 9): moves a house's next sale to next week with its lots
     * on view; `fake` makes every lot a counterfeit. Returns the lot ids.
     */
    auctionSoon(houseId = 'marlowe', fake = false) {
      const s = peekGame();
      const h = s?.auctions[houseId];
      if (!s || !h) return undefined;
      h.nextWeek = s.clock.week + 1;
      if (h.listedWeek === undefined) listLots(s, h);
      if (fake) for (const l of h.lots) l.genuine = false;
      bump();
      return h.lots.map((l) => l.id);
    },
    /** Runs whole weeks instantly. */
    advance(weeks: number) {
      const s = peekGame();
      if (s) advanceWeeks(s, weeks);
      bump();
    },
    /**
     * Lists the bank at once (Stage 6 screenshots): adds paid-in capital, writes
     * four profitable quarters, launches the IPO with the city's investment bank
     * and lists it without waiting for quarter-end.
     */
    goPublic(capital = 40_000_000) {
      const s = peekGame();
      const bankId = s && investmentBanksIn(s.world.currentCityId)[0];
      if (!s || !bankId || s.stock.status === 'public') return false;
      s.company.cash += capital;
      s.company.paidInCapital += capital;
      const income = capital * 0.03;
      s.history.quarterly = [1, 2, 3, 4].map((q) => ({
        endWeek: s.clock.week - 1,
        year: 2027,
        q: q as 1 | 2 | 3 | 4,
        revenue: income * 3,
        netIncome: income,
        eps: income / s.company.sharesOutstanding,
        roe: 0.12,
      }));
      s.company.tier = 'strong';
      const r = cmd.launchIpo(s, bankId, 0.25);
      const listed = r.ok && listPendingIpo(s);
      bump();
      return listed;
    },
  };
  (window as unknown as { __vs: typeof api }).__vs = api;
}
