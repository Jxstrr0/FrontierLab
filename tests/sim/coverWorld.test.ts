// Title cover (docs/COVER_SCREEN.md §4.2): a save card's cover record rebuilds
// the player's current city with the same lots, offices and sites as the saved
// game, so the skyline matches the in-game map and the flags land on the right
// rooftops, for the start city, a city flown to later, odd rival counts and
// old saves' layout.
import { describe, expect, it } from 'vitest';
import { COVER_MAX_FLAGS } from '../../src/config/cover';
import { coverMetaFor } from '../../src/sim/coverMeta';
import { coverWorld } from '../../src/sim/coverWorld';
import { newGame } from '../../src/sim/newGame';
import type { GameState } from '../../src/sim/state';
import { runScript, openScriptedBranch } from '../helpers/scenario';
import { addCapital } from '../helpers/markets';
import { fly } from '../helpers/world';

/** Positions of everything the map generator places in a city, keyed by id. */
function places(s: GameState, cityId: string) {
  const at = (t: { x: number; y: number }) => `${t.x},${t.y}`;
  const pick = <T extends { id: string; cityId: string; tile: { x: number; y: number } }>(
    list: Record<string, T>,
  ) =>
    Object.fromEntries(
      Object.values(list)
        .filter((x) => x.cityId === cityId)
        .map((x) => [x.id, at(x.tile)]),
    );
  return {
    lots: pick(s.world.lots),
    offices: pick(s.world.officeListings),
    sites: pick(s.world.sites),
  };
}

function expectSameCity(s: GameState) {
  const cover = coverMetaFor(s)!;
  const fresh = coverWorld(cover);
  expect(places(fresh, cover.cityId)).toEqual(places(s, cover.cityId));
  expect(fresh.world.cities[cover.cityId]!.layout).toBe(cover.layout);
  return cover;
}

describe('cover world', () => {
  it('rebuilds the start city of a played game with its flags', () => {
    const s = runScript(52);
    const cover = expectSameCity(s);
    expect(cover.cityId).toBe(s.world.currentCityId);
    const mine = Object.values(s.world.lots).filter((l) => l.occupant?.type === 'player');
    expect(mine.length).toBeGreaterThan(0);
    for (const lot of mine) expect(cover.flags).toContain(lot.id);
    for (const [lotId, ink] of Object.entries(cover.rivals)) {
      const occ = s.world.lots[lotId]!.occupant!;
      expect(occ.type).toBe('rival');
      expect(s.rivals[occ.id]!.ink).toBe(ink);
    }
  });

  it('rebuilds a city flown to later, with an unusual rival count', () => {
    const s = newGame({ seed: 9, cityId: 'cal', competitors: 5 });
    addCapital(s, 20_000_000);
    openScriptedBranch(s);
    fly(s, 'nyc');
    fly(s, 'lon');
    const branch = openScriptedBranch(s);
    const cover = expectSameCity(s);
    expect(cover.cityId).toBe('lon');
    expect(cover.homeCityId).toBe('cal');
    expect(cover.flags).toEqual([s.branches[branch]!.lotId]);
  });

  it('keeps old saves on their original layout', () => {
    const s = newGame({ seed: 3, cityId: 'sas', layout: 1 });
    expect(expectSameCity(s).layout).toBe(1);
  });

  it('caps the flags a card remembers', () => {
    const s = newGame({ seed: 4, cityId: 'sas' });
    const lots = Object.values(s.world.lots).filter((l) => !l.occupant);
    for (const lot of lots) lot.occupant = { type: 'player', id: 'b' };
    expect(coverMetaFor(s)!.flags).toHaveLength(Math.min(COVER_MAX_FLAGS, lots.length));
  });
});
