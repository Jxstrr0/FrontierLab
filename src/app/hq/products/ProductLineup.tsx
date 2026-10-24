// Product lineup on the Products floor (SCREENS §10, §5.2 at company level):
// the "Apply rates to all branches" switch, a category switch and one card
// per product, developed products included after the base catalog.
import { useState } from 'preact/hooks';
import type { CategoryId } from '../../../data/types';
import * as cmd from '../../../sim/commands';
import { Card, Segmented, Toggle } from '../../components';
import { act, useGame } from '../../store';
import { CompanyProductCard } from './CompanyProductCard';
import { lineupSpecs } from './productSelectors';

const CATEGORIES: { value: CategoryId; label: string }[] = [
  { value: 'deposits', label: 'Deposits' },
  { value: 'lending', label: 'Lending' },
  { value: 'cards', label: 'Cards' },
];

export function ProductLineup() {
  const s = useGame();
  const [cat, setCat] = useState<CategoryId>('deposits');
  const on = s.company.applyRatesToAll;
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
      <Segmented label="Product category" options={CATEGORIES} value={cat} onChange={setCat} />
      {lineupSpecs(s, cat).map((spec) => (
        <CompanyProductCard key={spec.id} spec={spec} />
      ))}
    </div>
  );
}
