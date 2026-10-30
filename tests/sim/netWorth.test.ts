// Acceptance test "Net worth ties out" (ROADMAP Stage 9, SIMULATION §22): a
// founder with cash, their own listed shares, other stocks, a personal
// building, a vacation home, a car, a jet and a collectible has netWorth().total
// equal to the sum of the parts counted independently and to the Personal
// Wealth screen's donut total — week after week as values move.
import { describe, expect, it } from 'vitest';
import { wealthSlices } from '../../src/app/personal/wealthView';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { netWorth } from '../../src/sim/netWorth';
import { netWorthWeeklyChange } from '../../src/sim/personalAssets';
import { homeAsking, homeSite } from '../../src/sim/personalValues';
import { securityPrice } from '../../src/sim/securities';
import { FOUNDER_ID, sharesHeld } from '../../src/sim/shares';
import type { GameState } from '../../src/sim/state';
import { publicBank } from '../helpers/markets';

/** Every part summed straight from the state, without netWorth(). */
function partsByHand(s: GameState): number {
  const e = s.personal.empire;
  const stocks = Object.entries(s.market.holdings.personal).reduce(
    (t, [id, h]) => t + h.shares * securityPrice(s, id),
    0,
  );
  const buildings = Object.values(s.realEstate.properties)
    .filter((p) => p.owner === 'personal')
    .reduce((t, p) => t + p.value, 0);
  return (
    s.personal.cash +
    sharesHeld(s, FOUNDER_ID) * s.stock.price +
    stocks +
    buildings +
    e.homes.reduce((t, h) => t + h.value, 0) +
    e.cars.reduce((t, c) => t + c.value, 0) +
    e.collectibles.reduce((t, c) => t + c.value, 0) +
    (s.personal.jet?.value ?? 0)
  );
}

function founderWithEverything(): GameState {
  const s = publicBank();
  // The listed lab already has an office (it holds the ARR that let it list).
  s.personal.cash = 200_000_000;
  // Other stocks, personally.
  expect(cmd.trade(s, 'personal', 'kslr', 10_000).ok).toBe(true);
  // A building, privately.
  const listing = Object.values(s.realEstate.listings).find(
    (l) => s.world.sites[l.siteId]?.cityId === 'cal',
  )!;
  expect(cmd.offerProperty(s, listing.siteId, listing.asking, 'personal')).toMatchObject({
    ok: true,
    accepted: true,
  });
  // A vacation home, a car and a jet.
  const ranch = homeSite(s, 'bowvalley')!;
  expect(cmd.offerHome(s, ranch.id, homeAsking(s, 'bowvalley'))).toMatchObject({
    ok: true,
    accepted: true,
  });
  const dealer = Object.values(s.world.sites).find(
    (x) => x.kind === 'autoDealer' && x.cityId === 'cal',
  )!;
  expect(cmd.buyCar(s, dealer.id, 'montclair').ok).toBe(true);
  expect(cmd.buyJet(s, 'corvid600').ok).toBe(true);
  // A collectible, created directly (the auctions own buying them).
  s.personal.empire.collectibles.push({
    id: 'col_test',
    itemId: 'sovereign',
    houseId: 'test',
    price: 1_200_000,
    value: 1_250_000,
    genuine: true,
    appraised: false,
    boughtWeek: s.clock.week,
  });
  return s;
}

describe('Net worth ties out', () => {
  it('equals the sum of its parts and the Wealth donut, week after week', () => {
    const s = founderWithEverything();
    for (let week = 0; week <= 26; week++) {
      if (week > 0) advanceWeeks(s, 1);
      const nw = netWorth(s);
      const { slices, total } = wealthSlices(s);
      const sum =
        nw.cash +
        nw.ownShares +
        nw.stocks +
        nw.ventures +
        nw.ventureDebt +
        nw.realEstate +
        nw.homes +
        nw.cars +
        nw.collectibles +
        nw.jet +
        nw.franchise;
      expect(nw.total).toBeCloseTo(sum, 4);
      expect(nw.total).toBeCloseTo(partsByHand(s), 4);
      expect(total).toBeCloseTo(nw.total, 4);
      expect(slices.reduce((t, x) => t + x.value, 0)).toBeCloseTo(nw.total, 4);
      for (const k of [
        'ownShares',
        'stocks',
        'realEstate',
        'homes',
        'cars',
        'collectibles',
        'jet',
      ] as const)
        expect(nw[k], k).toBeGreaterThan(0);
    }
    // Two closes recorded: the weekly change is this week's move.
    const log = s.personal.empire.netWorthLog!;
    expect(netWorthWeeklyChange(s)).toBeCloseTo(netWorth(s).total - log.at(-2)!, 4);
  });
});
