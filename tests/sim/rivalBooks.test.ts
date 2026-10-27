// Rival books on ARR and runway (SIMULATION §18.1, §18.5): the ARR → earnings
// worked example, the downturn factor, runway tiers, insolvency at quarter-end
// and the funding round that can save a lab short of runway.
import { describe, expect, it } from 'vitest';
import {
  RIVAL_BOOKS,
  RIVAL_FAILURE,
  RIVAL_RAISE,
  RIVAL_RUNWAY_TIERS,
  WEEKS_PER_YEAR,
} from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import { COUNTRIES } from '../../src/data/countries';
import { advanceWeeks } from '../../src/sim/engine';
import { newGame } from '../../src/sim/newGame';
import { downturnFactor, officeEarnings, runRivalFinancials } from '../../src/sim/rivalBooks';
import {
  arrPerCustomer,
  officeCosts,
  rivalFairPerShare,
  rivalRunwayWeeks,
  rivalTier,
} from '../../src/sim/rivalFinance';
import { insolvent, raiseRound, runRivalQuarter } from '../../src/sim/rivalQuarter';
import { rngFromState, hashSeed } from '../../src/sim/rng';
import type { GameState } from '../../src/sim/state';

const game = () => newGame({ seed: 42, cityId: 'cal', competitors: 3 });

describe('rival office earnings (§18.5 worked example)', () => {
  it('earns ARR ÷ 52 less compute, offices and training', () => {
    const s = game();
    const bank = Object.values(s.rivals).find((r) => r.strategy === 'incumbent')!;
    const office = bank.branches[0]!;
    office.customers = 10_000;
    office.arr = 10_000 * 600; // $6M of ARR
    s.compute.index = 1.2;
    const c = officeCosts(s, bank, office);
    const mult = RIVAL_BOOKS.strategy.incumbent;
    const revenue = 6_000_000 / WEEKS_PER_YEAR;
    expect(c.revenue).toBeCloseTo(revenue, 6);
    expect(c.compute).toBeCloseTo(RIVAL_BOOKS.computeShare * revenue * 1.2 * mult.computeMult, 6);
    const costIndex = CITIES.cal!.costIndex;
    const units = [1, 2.5, 5, 9][office.size]!;
    expect(c.offices).toBeCloseTo(RIVAL_BOOKS.officeCost * units * costIndex * mult.costMult, 6);
    expect(c.training).toBeCloseTo(RIVAL_BOOKS.trainingShare * revenue * mult.trainingMult, 6);
    const e = officeEarnings(s, bank, office);
    expect(e.contribution).toBeCloseTo(revenue - c.total, 6);
  });

  it('prices a customer off the rival sheet plus usage, and banks after-tax earnings as cash', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    const per = arrPerCustomer(s, bank, 'cal');
    expect(per).toBeGreaterThan(RIVAL_BOOKS.usagePerCustomer);
    const cash = bank.cash;
    const preTax = bank.branches.reduce((x, b) => x + officeEarnings(s, bank, b).contribution, 0);
    runRivalFinancials(s);
    const tax = COUNTRIES.CA.corpTax;
    // Books move a little in the week; the sign and tax treatment are what matter.
    if (preTax > 0) expect(bank.cash - cash).toBeCloseTo(bank.qtd.netIncome, 2);
    expect(bank.qtd.netIncome).toBeLessThanOrEqual(Math.max(0, preTax * (1 - tax)) + 1);
    expect(bank.costs).toBeGreaterThan(0);
  });

  it('shrinks the customer pool in a downturn, more for disruptors', () => {
    const ca = game().world.countries.CA!;
    ca.unemployment = 5;
    expect(downturnFactor(ca, 'incumbent')).toBe(1);
    ca.unemployment = 6.5;
    const inc = downturnFactor(ca, 'incumbent');
    const dis = downturnFactor(ca, 'disruptor');
    expect(inc).toBeLessThan(1);
    expect(dis).toBeLessThan(inc);
    ca.unemployment = 12;
    expect(downturnFactor(ca, 'disruptor')).toBe(RIVAL_BOOKS.cycle.min);
  });
});

describe('runway and insolvency (§18.5)', () => {
  it('reads runway as cash over weekly costs and bands it into tiers', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    bank.costs = 100_000;
    bank.cash = 100_000 * 120;
    expect(rivalRunwayWeeks(bank)).toBe(120);
    expect(rivalTier(bank)).toBe('strong');
    bank.cash = 100_000 * (RIVAL_RUNWAY_TIERS[2]!.minWeeks + 1);
    expect(rivalTier(bank)).toBe('watch');
    bank.cash = -1;
    expect(rivalTier(bank)).toBe('critical');
  });

  it('goes into administration after two quarter-ends in the red, or at once when the hole is deep', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    bank.cash = -1;
    expect(insolvent(bank)).toBe(false);
    runRivalQuarter(s);
    expect(bank.status).toBe('active');
    expect(bank.negativeQuarters).toBe(1);
    bank.cash = -1;
    runRivalQuarter(s);
    expect(bank.status).toBe('distressed');
    expect(bank.distressedUntil).toBe(s.clock.week + RIVAL_FAILURE.distressWeeks);
    const other = Object.values(s.rivals).find((r) => r.status === 'active')!;
    other.cash = -(RIVAL_FAILURE.maxDebtWeeks + 1) * other.costs;
    runRivalQuarter(s);
    expect(other.status).toBe('distressed');
  });

  it('a positive quarter-end resets the count', () => {
    const s = game();
    const bank = Object.values(s.rivals)[0]!;
    bank.negativeQuarters = 1;
    bank.cash = 1;
    runRivalQuarter(s);
    expect(bank.negativeQuarters).toBe(0);
    expect(bank.status).toBe('active');
  });
});

describe('funding rounds (§18.5)', () => {
  function burning(s: GameState) {
    const bank = Object.values(s.rivals)[0]!;
    bank.quarters = [{ revenue: 1e6, netIncome: -1e5 }];
    bank.costs = 100_000;
    bank.cash = 100_000 * (RIVAL_RAISE.maxRunwayWeeks - 10);
    return bank;
  }

  it('sells new shares for RIVAL_RAISE.weeks of costs at a discount to fair value', () => {
    const s = game();
    const bank = burning(s);
    const shares = bank.shares;
    const cash = bank.cash;
    const fair = rivalFairPerShare(bank);
    const rng = rngFromState(hashSeed(1, 'always'));
    rng.chance = () => true;
    expect(raiseRound(s, bank, rng)).toBe(true);
    expect(bank.cash).toBeCloseTo(cash + RIVAL_RAISE.weeks * bank.costs, 0);
    const price = Math.max(RIVAL_RAISE.minPrice, fair * (1 - RIVAL_RAISE.discount));
    expect(bank.shares - shares).toBe(Math.round((RIVAL_RAISE.weeks * bank.costs) / price));
    expect(s.events.log.some((e) => e.type === 'RIVAL_RAISE')).toBe(true);
  });

  it('never raises when profitable or with a year of runway, and the roll can say no', () => {
    const s = game();
    const bank = burning(s);
    const yes = rngFromState(hashSeed(1, 'y'));
    yes.chance = () => true;
    const no = rngFromState(hashSeed(1, 'n'));
    no.chance = () => false;
    expect(raiseRound(s, bank, no)).toBe(false);
    bank.quarters = [{ revenue: 1e6, netIncome: 1 }];
    expect(raiseRound(s, bank, yes)).toBe(false);
    bank.quarters = [{ revenue: 1e6, netIncome: -1 }];
    bank.cash = bank.costs * (RIVAL_RAISE.maxRunwayWeeks + 1);
    expect(raiseRound(s, bank, yes)).toBe(false);
  });

  it('rivals stay solvent through a quiet first year', () => {
    const s = game();
    advanceWeeks(s, 52);
    for (const r of Object.values(s.rivals)) expect(r.status).toBe('active');
  }, 30_000);
});
