// Market rents that follow the property cycle and the Chief Real Estate
// Officer (SIMULATION §21.2, §17.2; DESIGN decision log 2026-10-26): an owned
// building's market rent eases toward base × cre/100 while its value tracks
// cre at once; a managing CREO's expertise is pricing power; the Rents
// switches set the best rent for the bank's and your own buildings, at once
// when switched on and every 4 weeks after.
import { describe, expect, it } from 'vitest';
import { EXEC_DELEGATION, REAL_ESTATE } from '../../src/config/balance';
import { CITIES } from '../../src/data/cities';
import * as cmd from '../../src/sim/commands';
import { advanceWeeks } from '../../src/sim/engine';
import { refreshExecCandidates } from '../../src/sim/execCandidates';
import { rentPricingPower } from '../../src/sim/execSeats';
import { postCash } from '../../src/sim/ledger';
import {
  baseRentFor,
  bestRent,
  bestRentRatio,
  estimateValue,
  marketRentNow,
  occupancyTarget,
} from '../../src/sim/propertyMath';
import { type GameState, type Property } from '../../src/sim/state';
import { execGame } from '../helpers/executives';

function fund(s: GameState, amount: number) {
  postCash(s, amount, 'financing');
  s.company.paidInCapital += amount;
}

/** Buys the cheapest listings in the current city: one for the bank, one privately. */
function buyTwo(s: GameState): { bank: Property; mine: Property } {
  fund(s, 80_000_000);
  s.personal.cash = 80_000_000;
  const listings = Object.values(s.realEstate.listings)
    .filter((l) => s.world.sites[l.siteId]?.cityId === s.world.currentCityId)
    .sort((a, b) => a.asking - b.asking || a.siteId.localeCompare(b.siteId));
  const [a, b] = listings;
  expect(cmd.offerProperty(s, a!.siteId, a!.asking, 'company').ok).toBe(true);
  expect(cmd.offerProperty(s, b!.siteId, b!.asking, 'personal').ok).toBe(true);
  return { bank: s.realEstate.properties[a!.siteId]!, mine: s.realEstate.properties[b!.siteId]! };
}

const countryOf = (s: GameState, p: Property) => s.world.countries[CITIES[p.cityId]!.country]!;

describe('market rent follows the cycle', () => {
  it('eases toward base × cre/100 while value tracks cre at once', () => {
    const s = execGame();
    const { bank } = buyTwo(s);
    const site = s.world.sites[bank.id]!;
    const base = baseRentFor(site);
    const m0 = bank.marketRent;
    const country = countryOf(s, bank);
    country.cre = 125;
    advanceWeeks(s, 1);
    const now = marketRentNow(s, site);
    expect(now).toBeCloseTo((base * country.cre) / 100, 9);
    expect(bank.marketRent).toBeCloseTo(m0 + REAL_ESTATE.rentEma * (now - m0), 6);
    expect(bank.value).toBeCloseTo(estimateValue(bank.sqm, base, country.cre), 6);
    advanceWeeks(s, 80);
    // Months later the rent has nearly caught up with the market.
    expect(Math.abs(bank.marketRent / marketRentNow(s, site) - 1)).toBeLessThan(0.03);
    expect(bank.marketRent).toBeGreaterThan(m0 * 1.1);
  });

  it('keeps the owner’s rent inside its range as the market moves', () => {
    const s = execGame();
    const { bank } = buyTwo(s);
    const [, hi] = REAL_ESTATE.rentRange;
    expect(cmd.setPropertyRent(s, bank.id, bank.marketRent * hi).ok).toBe(true);
    countryOf(s, bank).cre = 60;
    advanceWeeks(s, 1);
    expect(bank.rent).toBeLessThanOrEqual(bank.marketRent * hi + 1e-6);
    expect(bank.rent).toBeCloseTo(bank.marketRent * hi, 6);
  });
});

describe('pricing power and the best rent', () => {
  it('shifts the occupancy curve by the chief’s premium', () => {
    expect(occupancyTarget(110, 100, 0.1)).toBeCloseTo(occupancyTarget(100, 100), 12);
    expect(occupancyTarget(100, 100, 0.1)).toBe(REAL_ESTATE.occMax);
    expect(bestRentRatio()).toBeCloseTo(0.99375, 12);
    expect(bestRent(1000)).toBe(990);
    expect(bestRent(1000, 0.09)).toBe(1080);
    expect(occupancyTarget(bestRent(1000, 0.09), 1000, 0.09)).toBe(REAL_ESTATE.occMax);
    // Never outside the owner's range.
    expect(bestRent(1000, 5)).toBe(1000 * REAL_ESTATE.rentRange[1]);
  });
});

describe('the Chief Real Estate Officer', () => {
  it('reviews managed rents when switched on and every 4 weeks, by owner', () => {
    const s = execGame();
    const { bank, mine } = buyTwo(s);
    refreshExecCandidates(s, true);
    const c = s.executives.candidates.creo![0]!;
    expect(cmd.hireExec(s, 'creo', c.id).ok).toBe(true);
    const chief = s.executives.seats.creo!;
    expect(chief.delegations.bankRents).toBe(true);
    expect(chief.delegations.privateRents).toBe(true);
    const power = (EXEC_DELEGATION.rentPricingPower * chief.expertise) / 100;
    expect(rentPricingPower(s, 'company')).toBeCloseTo(power, 12);
    expect(rentPricingPower(s, 'personal')).toBeCloseTo(power, 12);

    // Off and on again: the switch-on reviews at once.
    cmd.setExecDelegation(s, 'creo', 'bankRents', false);
    cmd.setExecDelegation(s, 'creo', 'privateRents', false);
    expect(rentPricingPower(s, 'company')).toBe(0);
    cmd.setPropertyRent(s, bank.id, bank.marketRent * 0.8);
    cmd.setPropertyRent(s, mine.id, mine.marketRent * 0.8);
    cmd.setExecDelegation(s, 'creo', 'bankRents', true);
    expect(bank.rent).toBe(bestRent(bank.marketRent, power));
    expect(bank.rent).toBeGreaterThan(bank.marketRent * 0.9);
    expect(mine.rent).toBeCloseTo(mine.marketRent * 0.8, 9);

    // The private switch covers your own building only; the bank's keeps its review.
    cmd.setExecDelegation(s, 'creo', 'privateRents', true);
    expect(mine.rent).toBe(bestRent(mine.marketRent, power));
    cmd.setExecDelegation(s, 'creo', 'privateRents', false);
    cmd.setPropertyRent(s, bank.id, bank.marketRent * 0.8);
    cmd.setPropertyRent(s, mine.id, mine.marketRent * 0.8);
    const every = EXEC_DELEGATION.rentEveryWeeks;
    const toDue = (every - (s.clock.week % every)) % every || every;
    advanceWeeks(s, toDue - 1);
    expect(bank.rent).toBeCloseTo(bank.marketRent * 0.8, 1);
    advanceWeeks(s, 1);
    expect(bank.rent).toBe(bestRent(bank.marketRent, power));
    expect(Math.abs(mine.rent / mine.marketRent - 0.8)).toBeLessThan(0.02);
    // Managed tenants fill the building at that premium rent.
    expect(occupancyTarget(bank.rent, bank.marketRent, power)).toBe(REAL_ESTATE.occMax);
  });
});
