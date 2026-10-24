// Who you may make an M&A offer to right now (SIMULATION §19.8, §15): a rival
// still active or on distressed sale, with branches, no offer of yours pending
// and no rejection inside the retry window, while your capital tier allows
// acquisitions. Shared by the offer command, the answer and the split rule.
import { MERGERS } from '../config/balance';
import { CITIES } from '../data/cities';
import type { GameState, MergerOffer } from './state';

export const cityLabel = (id: string) => CITIES[id]?.name ?? id;

/** The pending offer to a rival, if any. */
export function pendingOffer(state: GameState, rivalId: string): MergerOffer | undefined {
  return state.mergers.offers.find((o) => o.rivalId === rivalId && o.status === 'pending');
}

/** The week a rival last rejected you, if within the retry window (§19.8: once per 4 weeks). */
export function retryWeek(state: GameState, rivalId: string): number | undefined {
  const last = [...state.mergers.offers]
    .reverse()
    .find((o) => o.rivalId === rivalId && o.status === 'rejected');
  if (!last) return undefined;
  const at = last.respondWeek + MERGERS.retryWeeks;
  return at > state.clock.week ? at : undefined;
}

/** Why the company can't make this offer at all, before any price is considered. */
export function targetBlocker(state: GameState, rivalId: string): string | undefined {
  const bank = state.rivals[rivalId];
  if (!bank) return 'That bank no longer exists.';
  if (bank.status !== 'active' && bank.status !== 'distressed')
    return `${bank.name} is no longer for sale.`;
  if (bank.branches.length === 0) return `${bank.name} has no branches left to buy.`;
  const tier = state.company.tier;
  if (tier === 'restricted' || tier === 'critical')
    return `The regulator won't allow acquisitions at the ${tier} capital tier.`;
  if (pendingOffer(state, rivalId)) return `Your offer for ${bank.name} is awaiting an answer.`;
  const retry = retryWeek(state, rivalId);
  if (retry !== undefined) {
    const n = retry - state.clock.week;
    return `${bank.name} turned you down. You can try again in ${n} week${n === 1 ? '' : 's'}.`;
  }
  return undefined;
}
