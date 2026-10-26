// A field that stays full and fights back (SIMULATION §18.7–18.9): new banks
// are chartered where rivals have gone, rivals buy each other, and rivals run
// ad campaigns and invest in technology.
import { describe, expect, it } from 'vitest';
import { MERGERS, RIVAL_CHARTER, RIVAL_MARKETING, RIVAL_TECH } from '../../src/config/balance';
import { balanceSheet } from '../../src/sim/balanceSheet';
import { newGame } from '../../src/sim/newGame';
import { stream } from '../../src/sim/rng';
import { activeRivalsIn, charterChance, charterRival } from '../../src/sim/rivalCharters';
import {
  growUp,
  investInTech,
  launchRivalCampaigns,
  rivalOverall,
  runRivalCampaigns,
} from '../../src/sim/rivalMarketing';
import { canBuy, mergeRivals, mergerTarget, proFormaCr } from '../../src/sim/rivalMergers';
import { migrate } from '../../src/sim/save/migrations';
import { SCHEMA_VERSION, type GameState, type RivalBank } from '../../src/sim/state';
import { openScriptedBranch } from '../helpers/scenario';

const lotsIn = (s: GameState, cityId: string) =>
  Object.values(s.world.lots).filter((l) => l.cityId === cityId);
const identityGap = (s: GameState) => {
  const bs = balanceSheet(s);
  return Math.abs(bs.equity - bs.expectedEquity);
};

/** Profitable for a year with capital to spare. */
function profitable(bank: RivalBank): void {
  bank.quarters = [1, 2, 3, 4].map(() => ({ revenue: 4e6, netIncome: 1e6 }));
  bank.capitalRatio = 0.3;
}

/** Removes a rival from the city as if the regulator had seized it. */
function seize(s: GameState, bank: RivalBank): void {
  for (const b of bank.branches) delete s.world.lots[b.lotId]!.occupant;
  bank.branches = [];
  bank.status = 'seized';
}

describe('chartered rivals (§18.7)', () => {
  it('charters a city that has lost a rival, and founds a private bank there', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const lots = lotsIn(s, 'cal');
    // A full field: only the small chance for a city with plenty of empty storefronts.
    expect(charterChance(s, 'cal', lots)).toBeLessThan(RIVAL_CHARTER.chance);
    seize(s, Object.values(s.rivals)[0]!);
    expect(charterChance(s, 'cal', lotsIn(s, 'cal'))).toBe(RIVAL_CHARTER.chance);

    const bank = charterRival(s, 'cal', stream(s, 'charters'))!;
    expect(bank).toBeDefined();
    expect(bank.home).toEqual(['CA']);
    expect(bank.listed).toBe(false);
    expect(bank.branches.length).toBeGreaterThanOrEqual(RIVAL_CHARTER.branches[0]);
    expect(bank.branches.length).toBeLessThanOrEqual(RIVAL_CHARTER.branches[1]);
    expect(bank.equity).toBeGreaterThan(0);
    expect(bank.capitalRatio).toBeGreaterThan(0.5); // no loans yet
    expect(bank.ceo).not.toBe('');
    for (const b of bank.branches) expect(s.world.lots[b.lotId]!.occupant?.id).toBe(bank.id);
    expect(activeRivalsIn(s, 'cal')).toContain(bank);
    expect(s.events.log.some((e) => e.type === 'RIVAL_CHARTERED')).toBe(true);
    // A second charter gets a different name.
    const next = charterRival(s, 'cal', stream(s, 'charters'));
    if (next) expect(next.name).not.toBe(bank.name);
  });

  it('migrates a v36 save unchanged', () => {
    const s = newGame({ seed: 5, cityId: 'cal' });
    const raw = JSON.parse(JSON.stringify(s)) as GameState & { schemaVersion: number };
    raw.schemaVersion = 36;
    const out = migrate(raw as never) as unknown as GameState & { schemaVersion: number };
    expect(out.schemaVersion).toBe(SCHEMA_VERSION);
  });
});

describe('rivals buy each other (§18.8)', () => {
  it('a profitable, well-capitalised rival buys a smaller one and pays every holder', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const [a, b] = Object.values(s.rivals)
      .filter((r) => r.cities.includes('cal'))
      .sort((x, y) => y.equity - x.equity);
    const buyer = a!;
    const target = b!;
    buyer.equity = Math.max(buyer.equity, 3 * target.equity);
    profitable(buyer);
    expect(canBuy(buyer)).toBe(true);
    expect(mergerTarget(s, buyer)).toBeDefined();
    expect(proFormaCr(buyer, target, 0.2)).toBeGreaterThanOrEqual(MERGERS.minProFormaCr);

    // You hold some of the target: you are paid out at the deal price.
    s.market.holdings.personal[target.id] = { shares: 1000, avgCost: target.price };
    const cash = s.personal.cash;
    const branches = buyer.branches.length + target.branches.length;
    const equity = buyer.equity;
    const book = target.equity;
    mergeRivals(s, buyer, target, 0.2);
    expect(target.status).toBe('merged');
    expect(target.mergedInto).toBe(buyer.id);
    expect(target.branches).toHaveLength(0);
    expect(buyer.branches).toHaveLength(branches);
    expect(buyer.equity).toBeCloseTo(equity - 0.2 * book, 0);
    for (const br of buyer.branches) expect(s.world.lots[br.lotId]!.occupant?.id).toBe(buyer.id);
    expect(s.personal.cash).toBeCloseTo(cash + 1000 * (book / target.shares) * 1.2, 0);
    expect(s.market.holdings.personal[target.id]).toBeUndefined();
    expect(s.events.log.some((e) => e.type === 'RIVAL_MERGER')).toBe(true);
    expect(identityGap(s)).toBeLessThan(1);
  });

  it('never bids for a bigger bank or without a year of profit', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const buyer = Object.values(s.rivals)[0]!;
    expect(canBuy(buyer)).toBe(false); // no reported quarters yet
    profitable(buyer);
    for (const r of Object.values(s.rivals)) if (r !== buyer) r.equity = buyer.equity * 2;
    expect(mergerTarget(s, buyer)).toBeUndefined();
  });
});

describe('rival campaigns and tech (§18.9)', () => {
  it('runs campaigns only where you are, lifts the rating, charges and ends', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const bank = Object.values(s.rivals).find((r) => r.cities.includes('cal'))!;
    profitable(bank);
    s.clock.week = 4;
    launchRivalCampaigns(s);
    expect(bank.campaigns).toBeUndefined(); // you have no branch in Calgary yet
    const mine = openScriptedBranch(s, 'midtown');
    s.branches[mine]!.status = 'open';
    let launched = false;
    for (let m = 2; m < 400 && !launched; m++) {
      s.clock.week = m * 4;
      launchRivalCampaigns(s);
      launched = !!bank.campaigns?.cal;
    }
    expect(launched).toBe(true);
    const branch = bank.branches.find((b) => b.cityId === 'cal')!;
    expect(rivalOverall(bank, branch)).toBeCloseTo(
      Math.min(5, branch.overall + RIVAL_MARKETING.boost),
      10,
    );
    const equity = bank.equity;
    runRivalCampaigns(s);
    expect(bank.equity).toBeLessThan(equity);
    for (let w = 1; w < RIVAL_MARKETING.weeks; w++) runRivalCampaigns(s);
    expect(bank.campaigns).toBeUndefined();
    expect(rivalOverall(bank, branch)).toBe(branch.overall);
  });

  it('spends on tech after a profitable year, and a big disruptor grows up', () => {
    const s = newGame({ seed: 42, cityId: 'cal', competitors: 3 });
    const bank = Object.values(s.rivals)[0]!;
    expect(investInTech(s, bank)).toBe(false);
    profitable(bank);
    bank.appRating = 3;
    const products = bank.branches[0]!.quality[1];
    const equity = bank.equity;
    expect(investInTech(s, bank)).toBe(true);
    expect(bank.appRating).toBeCloseTo(3 + RIVAL_TECH.appStep[bank.strategy], 10);
    expect(bank.branches[0]!.quality[1]).toBeGreaterThanOrEqual(products);
    expect(bank.equity).toBeCloseTo(equity - RIVAL_TECH.spendShare * 4e6, 0);

    bank.strategy = 'disruptor';
    growUp(s, bank);
    expect(bank.strategy).toBe('disruptor');
    while (bank.branches.length < RIVAL_TECH.growUpBranches)
      bank.branches.push({ ...bank.branches[0]!, id: `x${bank.branches.length}` });
    growUp(s, bank);
    expect(bank.strategy).toBe('incumbent');
  });
});
