// Branch Products tab (SCREENS §5.2): the house underwriting model, a category
// switch and one card per product. Cards stack vertically rather than in a
// carousel so every product's toggle and price stay visible on a phone.
import { useState } from 'preact/hooks';
import { PRODUCTS } from '../../data/products';
import type { CategoryId } from '../../data/types';
import { activeModel } from '../../sim/underwriting';
import type { Branch } from '../../sim/state';
import { Card, Segmented } from '../components';
import { useGame } from '../store';
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
  const specs = Object.values(PRODUCTS).filter((x) => x.category === cat);
  return (
    <div class="stack">
      <Card>
        <div class="br-model">
          <Rosette />
          <div class="br-model-text">
            <div class="muted small">House model</div>
            <div class="br-model-name">{model.name}</div>
            <div class="small">
              {s.settings.currency}
              {model.costPerApp.toFixed(2)} per application
            </div>
          </div>
        </div>
        <p class="muted small br-model-hint">
          Manage models: open an HQ with a Products floor to build your own, or visit a credit
          bureau for a better package.
        </p>
      </Card>
      <Segmented label="Product category" options={CATEGORIES} value={cat} onChange={setCat} />
      {s.company.applyRatesToAll && (
        <p class="muted small">Prices are set at HQ for every branch.</p>
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

/** Small engraved rosette standing in for the model's radar until the HQ floor exists. */
function Rosette() {
  const petals = Array.from({ length: 10 }, (_, i) => i * 36);
  return (
    <svg class="br-rosette" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" />
      {petals.map((a) => (
        <ellipse cx="20" cy="11" rx="3.2" ry="8" transform={`rotate(${a} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="4" />
    </svg>
  );
}
