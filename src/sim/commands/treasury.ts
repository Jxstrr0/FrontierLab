// Treasury commands (SIMULATION §13): transfers of corporate cash into liquid
// assets, the treasury policy, borrowing from and repaying the funding market
// (§13.6), and the central bank's standing lending facility (§13.5, SCREENS §8).
import { BOND_SHARE_MAX, LIQ_MIN, LIQ_TARGET_RANGE } from '../../config/balance';
import { FUNDING_TYPES } from '../../data/fundingTypes';
import { totalDeposits } from '../balanceSheet';
import { hasTreasuryFloor, maxBorrow } from '../fundingMarket';
import { newId } from '../ids';
import { postCash } from '../ledger';
import type { GameState } from '../state';
import { applyWindowStigma, liquidAssets, transferIn } from '../treasury';
import { fail, money, ok, type CommandResult } from './result';

/** Moves corporate cash into treasury reserves. There is no way back (SIMULATION §13.2). */
export function transferToTreasury(state: GameState, amount: number): CommandResult {
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  if (amount > state.company.cash)
    return fail(`You only have ${money(state.company.cash)} in corporate cash.`);
  postCash(state, -amount, 'investing');
  transferIn(state, amount);
  return ok();
}

export interface TreasuryPolicy {
  /** Target liquidity ratio, LIQ_TARGET_RANGE (0.10–0.40). */
  liqTarget?: number;
  /** Share of liquid assets above the minimum held in bonds, 0–BOND_SHARE_MAX (0.8). */
  bondShare?: number;
  autoFunding?: boolean;
}

/** Sets any of the target liquidity ratio, bond share and auto-funding (§13.3–13.5). */
export function setTreasuryPolicy(state: GameState, policy: TreasuryPolicy): CommandResult {
  const { liqTarget, bondShare, autoFunding } = policy;
  const [lo, hi] = LIQ_TARGET_RANGE;
  if (liqTarget !== undefined && !(liqTarget >= lo && liqTarget <= hi))
    return fail(`The liquidity target must be between ${lo * 100}% and ${hi * 100}%.`);
  if (bondShare !== undefined && !(bondShare >= 0 && bondShare <= BOND_SHARE_MAX))
    return fail(`The bond share must be between 0% and ${BOND_SHARE_MAX * 100}%.`);
  const t = state.treasury;
  if (liqTarget !== undefined) t.liqTarget = liqTarget;
  if (bondShare !== undefined) t.bondShare = bondShare;
  if (autoFunding !== undefined) t.autoFunding = autoFunding;
  return ok();
}

/** Liquid assets left above LIQ_MIN × deposits, the most that can leave L voluntarily. */
function liquidityHeadroom(state: GameState): number {
  return Math.min(state.treasury.reserves, liquidAssets(state) - LIQ_MIN * totalDeposits(state));
}

/** Borrows from a funding market offer at its fixed rate; L rises by the amount (§13.6). */
export function borrowOffer(
  state: GameState,
  offerId: string,
  amount: number,
): CommandResult<{ lotId: string }> {
  if (!hasTreasuryFloor(state)) return fail('The funding market needs a Treasury floor at HQ.');
  const t = state.treasury;
  const offer = t.offers.find((o) => o.id === offerId);
  if (!offer) return fail('That offer is no longer available.');
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  const max = maxBorrow(state, offer);
  const cover = FUNDING_TYPES[offer.type]?.mortgageCover;
  if (cover && amount > max)
    return fail(
      `Covered bonds need mortgages worth ${cover}× the bonds. You can borrow up to ${money(max)}.`,
    );
  if (amount > max) return fail(`This offer is for at most ${money(max)}.`);
  const lotId = newId(state, 'fl');
  t.lots.push({
    id: lotId,
    type: offer.type,
    counterparty: offer.counterparty,
    amount,
    rate: offer.rate,
    startWeek: state.clock.week,
    maturityWeek: state.clock.week + offer.termWeeks,
    radar: [...offer.radar],
  });
  t.reserves += amount;
  offer.amount -= amount;
  if (offer.amount < 1) t.offers = t.offers.filter((o) => o.id !== offerId);
  return ok({ lotId });
}

/**
 * Repays a lot early, in full and at par from reserves. Only types flexible
 * enough to allow it (FundingTypeSpec.earlyRepay), and never below LIQ_MIN.
 */
export function repayLot(state: GameState, lotId: string): CommandResult {
  const t = state.treasury;
  const lot = t.lots.find((l) => l.id === lotId);
  if (!lot) return fail('That funding lot no longer exists.');
  const spec = FUNDING_TYPES[lot.type];
  if (!spec?.earlyRepay)
    return fail(`${spec?.name ?? 'This funding'} can't be repaid early; it runs to maturity.`);
  if (lot.amount > liquidityHeadroom(state))
    return fail(
      `Repaying ${money(lot.amount)} would take liquid assets below the ${LIQ_MIN * 100}% minimum. ` +
        'Transfer cash to Treasury first.',
    );
  t.reserves -= lot.amount;
  t.lots = t.lots.filter((l) => l.id !== lotId);
  return ok();
}

/** Borrows from the central bank's standing facility (window). Each use carries stigma (§13.5). */
export function borrowWindow(state: GameState, amount: number): CommandResult {
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  const t = state.treasury;
  t.window += amount;
  t.reserves += amount;
  applyWindowStigma(state, amount);
  return ok();
}

/** Repays central bank window borrowing from reserves, keeping liquidity above the minimum. */
export function repayWindow(state: GameState, amount: number): CommandResult {
  const t = state.treasury;
  if (t.window <= 0) return fail('You have no central bank borrowing to repay.');
  if (!Number.isFinite(amount) || amount <= 0) return fail('Enter an amount above zero.');
  if (amount > t.window) return fail(`You only owe ${money(t.window)} at the window.`);
  if (amount > liquidityHeadroom(state))
    return fail(
      `You can repay at most ${money(Math.max(0, liquidityHeadroom(state)))} ` +
        `without dropping below the ${LIQ_MIN * 100}% liquidity minimum.`,
    );
  t.window -= amount;
  t.reserves -= amount;
  return ok();
}
