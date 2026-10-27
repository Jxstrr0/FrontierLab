// Sales office Products tab (SCREENS §5.2): the house underwriting model (its radar,
// cost per application and Manage models, which opens the HQ Products floor
// or, without one, points to the credit bureaus), a category switch and one
// card per product, plus "Set prices here" while HQ sets prices (C2d2). Cards
// stack vertically so every product's toggle and price stay visible on a phone.
import { useState } from 'preact/hooks';
import { CITIES } from '../../data/cities';
import type { CategoryId } from '../../data/types';
import * as cmd from '../../sim/commands';
import { theCountryName } from '../../sim/newsStory';
import { allProducts } from '../../sim/products';
import { activeModel } from '../../sim/underwriting';
import type { Branch, GameState } from '../../sim/state';
import { Card, Segmented, Toggle } from '../components';
import { act, openPanel, useGame } from '../store';
import { hqDepts } from '../hq/officeSelectors';
import { ModelRosette } from '../hq/products/ModelRosette';
import { priceCountries } from '../hq/products/productSelectors';
import { ProductCard } from './ProductCard';

const CATEGORIES: { value: CategoryId; label: string }[] = [
  { value: 'deposits', label: 'Deposits' },
  { value: 'lending', label: 'Lending' },
  { value: 'cards', label: 'Cards & Services' },
];

export function ProductsTab(p: { branch: Branch; onLoanDesk: () => void }) {
  const s = useGame();
  const [cat, setCat] = useState<CategoryId>('deposits');
  const model = activeModel(s);
  const specs = allProducts(s).filter((x) => x.category === cat);
  const hasProductsFloor = hqDepts(s).includes('products');
  return (
    <div class="stack">
      <Card>
        <div class="br-model">
          <div class="muted small">House model</div>
          <div class="br-model-name">{model.name}</div>
          <div class="small">
            {s.settings.currency}
            {model.costPerApp.toFixed(2)} per application
          </div>
        </div>
        <ModelRosette radar={model.radar} label="House model" />
        {hasProductsFloor ? (
          <button
            type="button"
            class="btn btn-secondary btn-block br-model-btn"
            onClick={() => openPanel({ type: 'hq', dept: 'products' })}
          >
            Manage models
          </button>
        ) : (
          <p class="muted small br-model-hint">
            Visit a credit bureau on the map for a better model, or add a Products floor at HQ to
            build your own.
          </p>
        )}
      </Card>
      <div data-tutorial="product-category">
        <Segmented label="Product category" options={CATEGORIES} value={cat} onChange={setCat} />
      </div>
      {s.company.applyRatesToAll && (
        <Card>
          <Toggle
            label="Set prices here"
            hint={
              p.branch.ownPrices
                ? 'This office sets its own prices and lineup. Turn off to follow HQ again.'
                : hqPriceNotice(s, p.branch)
            }
            checked={p.branch.ownPrices}
            onChange={(v) => act(cmd.setOwnPrices, p.branch.id, v)}
          />
        </Card>
      )}
      {p.branch.delegation.products && (
        <p class="muted small">Your manager sets products and prices here.</p>
      )}
      {specs.map((spec) => (
        <ProductCard key={spec.id} branch={p.branch} spec={spec} onLoanDesk={p.onLoanDesk} />
      ))}
    </div>
  );
}

/** Where this branch's prices come from while HQ sets them: the list for its own country. */
function hqPriceNotice(s: GameState, branch: Branch): string {
  if (priceCountries(s).length < 2) return 'Prices are set at HQ for every sales office.';
  const country = CITIES[branch.cityId]?.country;
  return country
    ? `Prices follow HQ's list for ${theCountryName(country)}.`
    : 'Prices are set at HQ.';
}
