// Read-only views for the rival branch and rival head office panels (SCREENS
// §6, §7): labels, the rate sheet against our nearest branch, the capital band
// and what a rival offers us as a lender.
import type { Tier } from '../../data/types';
import { isDeposit, PRODUCTS, type ProductSpec } from '../../data/products';
import { tileDistance } from '../../sim/citygen';
import { branchPrice, isOffered } from '../../sim/branch/pricing';
import { tierFor } from '../../sim/capital';
import type { Branch, GameState, RivalBank, RivalBranch } from '../../sim/state';

export const STRATEGY_LABEL: Record<RivalBank['strategy'], string> = {
  incumbent: 'Incumbent bank',
  disruptor: 'Disruptor',
  premium: 'Premium bank',
  community: 'Community bank',
};

export const STRATEGY_BLURB: Record<RivalBank['strategy'], string> = {
  incumbent: 'Big, steady and pricey. Sales offices everywhere and fees to match.',
  disruptor: 'App-first, thin on sales offices, generous on savings. Runs on thin capital.',
  premium: 'Marble lobbies for wealthy clients. Low savings rates, high service.',
  community: 'Local and friendly. Fair rates, modest sales offices.',
};

export const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong',
  adequate: 'Adequate',
  watch: 'Watch',
  restricted: 'Restricted',
  critical: 'Critical',
};

export const TIER_TONE: Record<Tier, 'good' | 'info' | 'warn' | 'bad'> = {
  strong: 'good',
  adequate: 'info',
  watch: 'warn',
  restricted: 'bad',
  critical: 'bad',
};

/** The capital band a rival's ratio falls in, on the same scale as yours (§15). */
export function rivalTier(bank: RivalBank): Tier {
  return tierFor(bank.capitalRatio);
}

/** Products on the price sheet, plans first (C3a). */
export const RATE_SHEET: { title: string; ids: string[] }[] = [
  { title: 'Plans', ids: ['plus', 'pro', 'team'] },
  { title: 'API and apps', ids: ['api', 'batch_api', 'code_assistant', 'agent_studio'] },
];

/** Our open branch nearest to a rival branch, in the same city. */
export function nearestOwnBranch(s: GameState, rb: RivalBranch): Branch | undefined {
  const lot = s.world.lots[rb.lotId];
  let best: Branch | undefined;
  let bestD = Infinity;
  for (const b of Object.values(s.branches)) {
    if (b.status === 'closed' || b.cityId !== rb.cityId) continue;
    const other = s.world.lots[b.lotId];
    const d = lot && other ? tileDistance(lot, other) : Infinity;
    if (!best || d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

/** Our price for a product at a branch, if it offers it. */
export function ourPrice(s: GameState, b: Branch | undefined, id: string): number | undefined {
  if (!b || !isOffered(b, id)) return undefined;
  return branchPrice(s, b, id);
}

/** 'good' when ours is better for the customer (higher deposit rate, lower loan rate or fee). */
export function comparison(
  spec: ProductSpec,
  ours: number,
  theirs: number,
): 'good' | 'bad' | 'flat' {
  const eps = spec.priceType === 'rate' || spec.priceType === 'pctFee' ? 1e-5 : 0.5;
  if (Math.abs(ours - theirs) < eps) return 'flat';
  const higherBetter = spec.priceType === 'rate' && isDeposit(spec);
  return ours > theirs === higherBetter ? 'good' : 'bad';
}

export function productOf(id: string): ProductSpec | undefined {
  return PRODUCTS[id];
}

/** The rival branch on a lot, with its bank. */
export function rivalBranchAt(
  s: GameState,
  lotId: string,
): { bank: RivalBank; branch: RivalBranch } | undefined {
  for (const bank of Object.values(s.rivals)) {
    const branch = bank.branches.find((b) => b.lotId === lotId);
    if (branch) return { bank, branch };
  }
  return undefined;
}

/** The head office site of a rival in a city (for "Visit head office"). */
export function rivalHqSite(s: GameState, rivalId: string, cityId: string): string | undefined {
  return Object.values(s.world.sites).find(
    (x) => x.kind === 'rivalHq' && x.refId === rivalId && x.cityId === cityId,
  )?.id;
}

/** Status line for a failed rival. */
export function failedText(s: GameState, bank: RivalBank): string | undefined {
  if (bank.status === 'distressed') {
    const weeks = Math.max(0, (bank.distressedUntil ?? s.clock.week) - s.clock.week);
    return `Regulators seized ${bank.name}. Its network is for sale at any investment bank's M&A desk for ${weeks} more week${weeks === 1 ? '' : 's'}; then other labs take its sales offices.`;
  }
  if (bank.status === 'seized')
    return `${bank.name} failed. Its sales offices now belong to other labs.`;
  if (bank.status === 'acquired') return `${bank.name} has been acquired.`;
  if (bank.status === 'merged') {
    const buyer = bank.mergedInto ? s.rivals[bank.mergedInto]?.name : undefined;
    return `${bank.name} was bought by ${buyer ?? 'another bank'}. Its sales offices now carry the buyer's name.`;
  }
  return undefined;
}
