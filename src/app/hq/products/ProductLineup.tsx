// Product lineup on the Products floor (SCREENS §10, §5.2 at company level):
// the "Apply rates to all branches" switch, a country picker when you bank in
// more than one country (each keeps its own HQ price list, priced off its own
// central bank), a category switch and one card per product, developed
// products included after the base catalog.
import { useState } from 'preact/hooks';
import { COUNTRIES } from '../../../data/countries';
import type { CategoryId, CountryId } from '../../../data/types';
import * as cmd from '../../../sim/commands';
import { Card, Chips, Row, Segmented, Toggle } from '../../components';
import { pct } from '../../format/format';
import { act, useGame } from '../../store';
import { CompanyProductCard } from './CompanyProductCard';
import { lineupSpecs, priceCountries } from './productSelectors';

const CATEGORIES: { value: CategoryId; label: string }[] = [
  { value: 'deposits', label: 'Deposits' },
  { value: 'lending', label: 'Lending' },
  { value: 'cards', label: 'Cards' },
];

export function ProductLineup() {
  const s = useGame();
  const [cat, setCat] = useState<CategoryId>('deposits');
  const on = s.company.applyRatesToAll;
  const countries = priceCountries(s);
  const [picked, setPicked] = useState<CountryId>(countries[0]!);
  const country = countries.includes(picked) ? picked : countries[0]!;
  const policy = s.world.countries[country]?.policyRate ?? 0;
  return (
    <div class="stack">
      <Card>
        <Toggle
          label="Apply rates to all branches"
          hint={
            on
              ? 'HQ sets every branch’s prices and lineup.'
              : 'Branches set their own prices. Turn on to set them here.'
          }
          checked={on}
          onChange={(v) => act(cmd.setApplyRatesToAll, v)}
        />
      </Card>
      {countries.length > 1 && (
        <Card class="pf-countries">
          <Chips
            label="Price list for"
            options={countries.map((c) => ({ value: c, label: COUNTRIES[c].name }))}
            value={country}
            onChange={setPicked}
          />
          <Row label={`${COUNTRIES[country].centralBank} policy rate`} value={pct(policy)} />
          <p class="muted small pf-note">
            {on
              ? `Every branch in ${COUNTRIES[country].name} uses this list.`
              : `Showing your first ${COUNTRIES[country].name} branch's prices.`}
          </p>
        </Card>
      )}
      <Segmented label="Product category" options={CATEGORIES} value={cat} onChange={setCat} />
      {lineupSpecs(s, cat).map((spec) => (
        <CompanyProductCard key={spec.id} spec={spec} country={country} />
      ))}
    </div>
  );
}
