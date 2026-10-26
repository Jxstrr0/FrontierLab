// Trophy asset commands (SIMULATION §22a, SCREENS §23): buy one of each with
// personal cash at today's asking price, or sell it for its value less the fee.
import { TROPHIES } from '../../data/trophies';
import { pushEvent } from '../events';
import { newId } from '../ids';
import { listLevel } from '../nominal';
import { ownedTrophy, trophyPrice, trophySalePrice } from '../trophies';
import type { GameState } from '../state';
import { fail, money, ok, type CommandResult } from './result';

/** Why a trophy can't be bought now, or undefined. */
export function trophyBlocker(state: GameState, trophyId: string): string | undefined {
  const spec = TROPHIES[trophyId];
  if (!spec) return 'That is not for sale.';
  if (ownedTrophy(state, trophyId)) return `You already own ${spec.name}.`;
  const price = trophyPrice(state, trophyId);
  if (state.personal.cash < price) return `You need ${money(price)} of your own.`;
  return undefined;
}

export function buyTrophy(state: GameState, trophyId: string): CommandResult {
  const blocker = trophyBlocker(state, trophyId);
  if (blocker) return fail(blocker);
  const spec = TROPHIES[trophyId]!;
  const price = trophyPrice(state, trophyId);
  state.personal.cash -= price;
  (state.personal.empire.trophies ??= []).push({
    id: newId(state, 'tr'),
    trophyId,
    price,
    value: price,
    boughtWeek: state.clock.week,
    levelRef: listLevel(state),
  });
  pushEvent(state, 'TROPHY_BOUGHT', { trophyId, name: spec.name, kind: spec.kind, price }, 6);
  return ok();
}

export function sellTrophy(state: GameState, trophyId: string): CommandResult<{ raised: number }> {
  const owned = ownedTrophy(state, trophyId);
  const spec = TROPHIES[trophyId];
  if (!owned || !spec) return fail('You do not own that.');
  const raised = trophySalePrice(owned);
  state.personal.cash += raised;
  state.personal.empire.trophies = state.personal.empire.trophies!.filter((t) => t !== owned);
  pushEvent(state, 'TROPHY_SOLD', { trophyId, name: spec.name, kind: spec.kind, price: raised }, 4);
  return ok({ raised });
}
