// Funding rounds (SIMULATION §20.2, §20.4, REFERENCE_NOTES §12): opening a
// round at a new price (the mark moves at once, through withAssetMarks), the
// two offer lots, taking a lot (you, your company or a fund) and closing the
// round, when unsold lots go to a fund. Also who holds what.
import { VENTURE_NEWS } from '../config/balance';
import { FUND_NAMES } from '../data/names';
import { ROUND_NAMES, STAGE_ORDER, type StartupStageId } from '../data/startups';
import { pushEvent } from './events';
import { withAssetMarks, type Account } from './portfolio';
import type { Rng } from './rng';
import type { GameState, RoundLot, Startup, StartupHolder } from './state';
import { fundHolderId } from './ventureGen';
import { roundTerms } from './ventureModel';

/** True when you (company or personally) own shares or have lent to it. */
export function heldByYou(s: Startup): boolean {
  if (s.ventureDebt) return true;
  return s.holders.some((h) => (h.kind === 'company' || h.kind === 'personal') && h.shares > 0);
}

/** A private startup's next stage after a round (Series E keeps stage D). */
function nextStage(stage: StartupStageId): StartupStageId {
  const i = STAGE_ORDER.indexOf(stage);
  return STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, i + 1)]!;
}

/**
 * Opens a round at lastPrice × step raising `fraction` of post-money, open
 * until `closesWeek`. The new price is the startup's mark from now (§20.6).
 */
export function openRound(
  state: GameState,
  s: Startup,
  step: number,
  fraction: number,
  closesWeek: number,
): void {
  const stage = s.stage as StartupStageId;
  const name = ROUND_NAMES[stage];
  const price = s.lastPrice * step;
  const t = roundTerms(s.shares, price, fraction);
  withAssetMarks(state, () => {
    s.lastPrice = price;
  });
  const lot = (): RoundLot => ({
    shares: t.lotShares,
    pct: t.lotShares / (s.shares + t.newShares),
    price: t.lotShares * price,
  });
  s.postMoney = t.postMoney;
  s.round = {
    name,
    pricePerShare: price,
    amount: t.amount,
    lots: [lot(), lot()],
    openedWeek: state.clock.week,
    closesWeek,
  };
  s.stage = nextStage(stage);
  s.history.push({ round: name, amount: t.amount, week: state.clock.week });
  const big = t.amount >= VENTURE_NEWS.bigRound;
  const held = heldByYou(s);
  pushEvent(
    state,
    'VENTURE_ROUND',
    {
      startupId: s.id,
      name: s.name,
      round: name,
      amount: t.amount,
      postMoney: t.postMoney,
      down: step < 1,
      held,
    },
    held ? 3 : big ? 2 : 0,
    s.id,
  );
}

function holderFor(state: GameState, s: Startup, account: Account): StartupHolder {
  let h = s.holders.find((x) => x.id === account);
  if (!h) {
    h = {
      id: account,
      name: account === 'company' ? state.meta.bankName : state.meta.founderName,
      kind: account,
      shares: 0,
      cost: 0,
    };
    s.holders.push(h);
  }
  return h;
}

/** Issues a lot's shares to its buyer; the money goes into the startup's cash. */
export function takeLot(
  state: GameState,
  s: Startup,
  lot: RoundLot,
  taker: Account | { fund: string },
): void {
  if (typeof taker === 'string') {
    const h = holderFor(state, s, taker);
    h.shares += lot.shares;
    h.cost = (h.cost ?? 0) + lot.price;
    lot.taken = taker;
  } else {
    const id = fundHolderId(taker.fund);
    let h = s.holders.find((x) => x.id === id);
    if (!h) {
      h = { id, name: taker.fund, kind: 'fund', shares: 0 };
      s.holders.push(h);
    }
    h.shares += lot.shares;
    lot.taken = 'fund';
  }
  s.shares += lot.shares;
  s.cash += lot.price;
}

/** Closes rounds whose time is up: unsold lots go to a fund (§20.2). */
export function closeDueRounds(state: GameState, rng: Rng): void {
  for (const s of Object.values(state.ventures.startups)) {
    const r = s.round;
    if (!r || state.clock.week < r.closesWeek) continue;
    for (const lot of r.lots) if (!lot.taken) takeLot(state, s, lot, { fund: rng.pick(FUND_NAMES) });
    s.postMoney = s.shares * s.lastPrice;
    delete s.round;
  }
}

/** Drops an open round without issuing anything (the startup failed or was sold). */
export function cancelRound(s: Startup): void {
  delete s.round;
}
