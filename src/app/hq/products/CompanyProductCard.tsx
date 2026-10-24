// One company-level product card (SCREENS §10 Product lineup, mirroring §5.2):
// name, template and tier for developed products, stars, the Offered toggle
// with how many branches offer it, company totals, and the HQ price stepper
// (live only while "Apply rates to all branches" is on). Developed products
// carry a delete button that asks first.
import { useState } from 'preact/hooks';
import type { ProductSpec } from '../../../data/products';
import * as cmd from '../../../sim/commands';
import { starsOf } from '../../../sim/products';
import { marketRef } from '../../../sim/rates';
import { Card, CoinRating, Confirm, Row, Stepper, Toggle } from '../../components';
import { editPrice, parsePrice, priceText, rangeText } from '../../branch/selectors';
import { count, money } from '../../format/format';
import { act, useGame } from '../../store';
import '../../branch/branch.css';
import {
  companyOffered,
  companyPrice,
  companyTotals,
  offeredCount,
  productSubtitle,
} from './productSelectors';

export function CompanyProductCard(p: { spec: ProductSpec }) {
  const s = useGame();
  const { spec } = p;
  const sym = s.settings.currency;
  const [deleting, setDeleting] = useState(false);
  const atHq = s.company.applyRatesToAll;
  const offered = companyOffered(s, spec.id);
  const n = offeredCount(s, spec.id);
  const totals = companyTotals(s, spec.id);
  const subtitle = productSubtitle(s, spec);
  const cityId = Object.values(s.branches)[0]?.cityId ?? s.world.currentCityId;
  const fmt = (v: number) => priceText(spec, v, sym);
  const developed = !!s.products.catalog[spec.id]?.developed;
  return (
    <Card class={`br-product${offered ? '' : ' is-off'}`}>
      <div class="br-product-head">
        <div class="br-product-title">
          <div class="br-product-name">{spec.name}</div>
          {subtitle && <div class="muted small pf-subtitle">{subtitle}</div>}
          <CoinRating value={starsOf(s, spec)} size={14} />
        </div>
        <div class="br-product-toggle">
          <Toggle
            label="Offered"
            checked={offered}
            onChange={(v) => act(cmd.setCompanyOffered, spec.id, v)}
          />
        </div>
      </div>
      <div class="br-product-figures">
        {n.total > 0 && <Row label="Branches offering" value={`${n.on} of ${n.total}`} />}
        {spec.kind !== 'fx' && (
          <>
            <Row label="New accounts last week" value={count(totals.newAccounts)} />
            {spec.kind === 'safebox' ? (
              <Row label="Boxes rented" value={count(totals.accounts)} />
            ) : (
              <Row
                label={spec.kind === 'wealth' ? 'Assets under management' : 'Balance'}
                value={money(totals.balance, sym)}
              />
            )}
          </>
        )}
      </div>
      <Stepper
        label={spec.priceType === 'rate' ? 'HQ rate' : 'HQ fee'}
        value={companyPrice(s, spec)}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        format={fmt}
        parse={(t) => parsePrice(spec, t)}
        editText={(v) => editPrice(spec, v)}
        onChange={(v) => act(cmd.setCompanyPrice, spec.id, v)}
        hint={
          atHq
            ? `Market ${fmt(marketRef(s, cityId, spec.id))} · ${rangeText(spec, sym)}`
            : 'Branches set their own'
        }
        disabled={!atHq}
      />
      {developed && (
        <button
          type="button"
          class="btn btn-secondary btn-block pf-delete"
          onClick={() => setDeleting(true)}
        >
          <TrashIcon /> Delete product
        </button>
      )}
      {deleting && (
        <Confirm
          title={`Delete ${spec.name}?`}
          body="Every branch stops offering it. Its customers and balances move onto the original product, so nothing is lost."
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setDeleting(false);
            act(cmd.deleteProduct, spec.id);
          }}
          onCancel={() => setDeleting(false)}
        />
      )}
    </Card>
  );
}

function TrashIcon() {
  return (
    <svg class="pf-trash" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.7 9.5h5.6l.7-9.5M7 6.5v5M9 6.5v5" />
    </svg>
  );
}
