// Deal Desk win and keep chances (SIMULATION §11, DEAL constants): the no-rival
// bonus, the star gap, the discount slope, the switching-cost pull against an
// incumbent and in favour of your own contract, and the clamp.
import { describe, expect, it } from 'vitest';
import { DEAL } from '../../src/config/balance';
import {
  contractValueAt,
  currentDiscount,
  keepChance,
  winChance,
} from '../../src/sim/branch/dealDesk';
import {
  dealGame,
  giveContract,
  giveRivalContract,
  lotBusinesses,
  setRivals,
} from '../helpers/deals';

/** A game with our office at `stars`, one rival at `rivalStars` (none if undefined) and a prospect. */
function setup(stars: number, rivalStars?: number, switching = 5) {
  const { s, id } = dealGame();
  const rival = setRivals(s, rivalStars);
  const branch = s.branches[id]!;
  branch.ratings.overall = stars;
  const b = lotBusinesses(s)[0]!;
  delete b.vendor;
  b.pentagon[3] = switching;
  // Data sensitivity 5: the model's Safety doesn't count (C6a). The starting
  // model's quality sits at MODEL_EFFECTS.qualityRef, so its edge is zero.
  b.pentagon[2] = 5;
  return { s, branch, b, rival };
}

describe('winChance (a new RFP)', () => {
  it('starts at the base plus the no-rival bonus when nobody else is in town', () => {
    const { s, branch, b } = setup(3);
    expect(winChance(s, branch, b, 0)).toBeCloseTo(DEAL.winBase + DEAL.noRivalBonus); // 0.7
  });

  it('adds the discount slope: 10% off is worth +0.15', () => {
    const { s, branch, b } = setup(3);
    expect(winChance(s, branch, b, 0.1)).toBeCloseTo(0.85);
  });

  it('moves 0.15 a star against the best rival in the city', () => {
    const { s, branch, b } = setup(3, 4);
    expect(winChance(s, branch, b, 0)).toBeCloseTo(0.5 - DEAL.starSlope); // one star behind: 0.35
    branch.ratings.overall = 5;
    expect(winChance(s, branch, b, 0)).toBeCloseTo(0.5 + DEAL.starSlope); // one star ahead: 0.65
  });

  it('clamps to 5% .. 95%', () => {
    const { s, branch, b } = setup(1, 5);
    expect(winChance(s, branch, b, 0)).toBe(DEAL.winClamp[0]); // 0.5 - 0.6 < 0
    const rich = setup(3);
    expect(winChance(rich.s, rich.branch, rich.b, DEAL.discountMax)).toBe(DEAL.winClamp[1]);
  });

  it('ignores the Switching cost of a business with no vendor', () => {
    const lo = setup(3, undefined, 1);
    const hi = setup(3, undefined, 10);
    expect(winChance(lo.s, lo.branch, lo.b, 0)).toBeCloseTo(winChance(hi.s, hi.branch, hi.b, 0));
  });
});

describe('winChance against an incumbent (a rival-held renewal)', () => {
  it('counts the incumbent’s stars and loses 0.04 per Switching-cost point above 5', () => {
    const { s, branch, b, rival } = setup(3, 3, 9);
    giveRivalContract(s, rival!, b);
    // Even stars, no discount: 0.5 − 0.04 × (9 − 5).
    expect(winChance(s, branch, b, 0)).toBeCloseTo(0.5 - DEAL.switchSlope * 4);
    b.pentagon[3] = 1; // an easy-to-leave business is easier to win
    expect(winChance(s, branch, b, 0)).toBeCloseTo(0.5 + DEAL.switchSlope * 4);
  });

  it('gets no no-rival bonus: the incumbent is the competition', () => {
    const { s, branch, b, rival } = setup(3, 3, 5);
    giveRivalContract(s, rival!, b);
    expect(winChance(s, branch, b, 0)).toBeCloseTo(DEAL.winBase);
  });
});

describe('keepChance (your own renewal)', () => {
  it('starts at 0.8 against an equal rival and gains the discount slope', () => {
    const { s, branch, b } = setup(3, 3);
    expect(keepChance(s, branch, b, 0)).toBeCloseTo(DEAL.keepBase);
    expect(keepChance(s, branch, b, 0.05)).toBeCloseTo(0.8 + 0.075);
  });

  it('adds the no-rival bonus, then clamps at 95%', () => {
    const { s, branch, b } = setup(3);
    expect(keepChance(s, branch, b, 0)).toBe(DEAL.winClamp[1]); // 0.8 + 0.2 = 1.0
  });

  it('is helped by Switching cost: 0.04 per point above 5', () => {
    const { s, branch, b } = setup(3, 3, 1);
    expect(keepChance(s, branch, b, 0)).toBeCloseTo(0.8 - DEAL.switchSlope * 4);
    b.pentagon[3] = 8;
    expect(keepChance(s, branch, b, 0)).toBeCloseTo(0.8 + DEAL.switchSlope * 3);
  });

  it('falls to the 5% floor when a better rival is in town', () => {
    const { s, branch, b } = setup(1, 5, 1);
    expect(keepChance(s, branch, b, 0)).toBe(DEAL.winClamp[0]);
  });
});

describe('contract values', () => {
  it('rounds budget × (1 − discount) to $100 and reads the discount back', () => {
    const { s, branch, b } = setup(3);
    b.budget = 24_700;
    expect(contractValueAt(b, 0.1)).toBe(22_200); // 22,230
    expect(contractValueAt(b, 0)).toBe(24_700);
    giveContract(s, branch.id, b, 0.1);
    expect(currentDiscount(b)).toBeCloseTo(0.1);
  });
});
