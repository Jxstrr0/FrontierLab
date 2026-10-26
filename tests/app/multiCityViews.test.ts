// Stage 8 view helpers: the HQ Products floor's country picker (price lists,
// the market each is compared with), the Marketing floor's campaign cities and
// the Branches list's city chips and country groups.
import { describe, expect, it } from 'vitest';
import {
  filterCities,
  countryOrder,
  groupByCountry,
  branchRows,
  sortRows,
} from '../../src/app/company/branchRows';
import { targetCities } from '../../src/app/hq/marketing/marketingView';
import {
  companyPrice,
  countryRefCity,
  priceCountries,
} from '../../src/app/hq/products/productSelectors';
import { PRODUCTS } from '../../src/data/products';
import * as cmd from '../../src/sim/commands';
import { newGame } from '../../src/sim/newGame';
import { openScriptedBranch } from '../helpers/scenario';
import { fly, worldBank } from '../helpers/world';

describe('HQ price lists per country', () => {
  it('lists home only for a one-country bank, then every country you bank in', () => {
    expect(priceCountries(newGame({ seed: 42, cityId: 'cal' }))).toEqual(['CA']);
    const { s } = worldBank();
    expect(priceCountries(s)).toEqual(['CA', 'US', 'UK']);
    expect(countryRefCity(s, 'US')).toBe('nyc');
    expect(countryRefCity(s, 'CA')).toBe('cal');
    expect(countryRefCity(s, 'JP')).toBe('tyo');
  });

  it("reads each country's own HQ price", () => {
    const { s } = worldBank();
    cmd.setApplyRatesToAll(s, true);
    cmd.setCompanyPrice(s, 'savings', 0.051, 'UK');
    expect(companyPrice(s, PRODUCTS.savings!, 'UK')).toBe(0.051);
    expect(companyPrice(s, PRODUCTS.savings!, 'CA')).not.toBe(0.051);
  });
});

describe('campaign cities', () => {
  it('offers home, branch cities and where you stand, opening on where you are', () => {
    const { s } = worldBank();
    expect(targetCities(s)).toEqual({ ids: ['cal', 'nyc', 'lon'], initial: 'lon' });
    fly(s, 'fmm'); // a regional site has no storefronts to advertise to
    expect(targetCities(s)).toEqual({ ids: ['cal', 'nyc', 'lon'], initial: 'cal' });
    fly(s, 'tyo');
    expect(targetCities(s).ids).toEqual(['cal', 'nyc', 'lon', 'tyo']);
  });
});

describe('Branches list across countries', () => {
  it('orders chips home first, groups rows by country in the order you entered', () => {
    const { s } = worldBank();
    fly(s, 'sas');
    openScriptedBranch(s);
    const rows = branchRows(s);
    expect(filterCities(s, rows)).toEqual(['cal', 'sas', 'nyc', 'lon']);
    const order = countryOrder(s, rows);
    expect(order).toEqual(['CA', 'US', 'UK']);
    const groups = groupByCountry(order, sortRows(rows, 'name', false));
    const sasName = rows.find((r) => r.cityId === 'sas')!.name;
    expect(groups.map((g) => [g.country, g.rows.map((r) => r.name)])).toEqual([
      ['CA', ['Midtown', sasName]],
      ['US', ['New York Midtown']],
      ['UK', ['London Midtown']],
    ]);
  });
});
