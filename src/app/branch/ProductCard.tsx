// One product card on the Products tab (SCREENS §5.2): stars, Offered toggle,
// last week's new accounts, balance, funding or unit cost, the margin ring and
// the price stepper. The Enterprise contracts card (id 'sbl') shows the
// office's contracts and points to the Deal Desk instead; it has no price.
import type { ProductSpec } from '../../data/products';
import {
  basePrice,
  branchPrice,
  followsHq,
  incidentBoost,
  isOffered,
} from '../../sim/branch/pricing';
import * as cmd from '../../sim/commands';
import { countryOfCity, ftpFor, marketRef } from '../../sim/rates';
import type { Branch } from '../../sim/state';
import { Card, CoinRating, RingGauge, Row, Stepper, Toggle } from '../components';
import { SpotArt } from '../components/SpotArt';
import { count, money } from '../format/format';
import { act, useGame } from '../store';
import { partnerTotals } from '../partners/partnerView';
import { contractTotals, newRfpsByBranch } from './dealDeskSelectors';
import { editPrice, parsePrice, priceText, productWords, rangeText, unitView } from './selectors';

export function ProductCard(p: { branch: Branch; spec: ProductSpec; onDealDesk: () => void }) {
  const s = useGame();
  const { branch, spec } = p;
  const sym = s.settings.currency;
  const stars = s.products.catalog[spec.id]?.stars ?? spec.startStars;
  const offered = isOffered(branch, spec.id);
  const price = branchPrice(s, branch, spec.id);
  const setPrice = basePrice(s, branch, spec.id);
  const boost = incidentBoost(s, branch, spec.id);
  const ftp = ftpFor(spec, countryOfCity(s, branch.cityId));
  const m = marketRef(s, branch.cityId, spec.id);
  const book = branch.books[spec.id];
  const unit = unitView(spec, price, ftp, book, sym);
  const delegated = branch.delegation.products;
  const atHq = followsHq(s, branch);
  const fmt = (v: number) => priceText(spec, v, sym);
  const baseHint = atHq
    ? 'Set at HQ'
    : delegated
      ? 'Your manager sets this'
      : `Market ${fmt(m)} · ${rangeText(spec, sym)}`;
  // Incident boosts (price-war match, bank-run raise) pay on top of the set rate for a while.
  const priceHint = boost > 0 ? `${baseHint} · paying ${fmt(price)} for now` : baseHint;

  return (
    <Card class={`br-product${offered ? '' : ' is-off'}`}>
      <div class="br-product-head">
        <SpotArt group="product" id={spec.id} size={48} class="br-product-spot" />
        <div class="br-product-title">
          <div class="br-product-name">{spec.name}</div>
          <CoinRating value={stars} size={14} />
        </div>
        <div class="br-product-toggle" data-tutorial={`offer-${spec.id}`}>
          <Toggle
            label="Offered"
            checked={offered}
            disabled={delegated}
            onChange={(v) => act(cmd.setOffered, branch.id, spec.id, v)}
          />
        </div>
      </div>
      {spec.kind === 'sbl' ? (
        <SblFigures branchId={branch.id} onDealDesk={p.onDealDesk} />
      ) : (
        <Figures branch={branch} spec={spec} costLabel={unit.costLabel} costText={unit.costText} />
      )}
      {spec.kind !== 'sbl' && (
        <div class="br-product-price" data-tutorial={`price-${spec.id}`}>
          <RingGauge
            value={unit.margin}
            label={`${Math.round(unit.margin * 100)}%`}
            caption={unit.caption}
            size={68}
          />
          <Stepper
            label={productWords(spec).price}
            value={setPrice}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            format={(v) => priceText(spec, v, sym, true)}
            parse={(t) => parsePrice(spec, t, sym)}
            editText={(v) => editPrice(spec, v, sym)}
            onChange={(v) => act(cmd.setPrice, branch.id, spec.id, v)}
            hint={priceHint}
            disabled={atHq || delegated}
          />
        </div>
      )}
    </Card>
  );
}

function Figures(p: { branch: Branch; spec: ProductSpec; costLabel: string; costText: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { spec } = p;
  const book = p.branch.books[spec.id];
  const net = book?.last.deltaAccounts ?? 0;
  const netText = net === 0 ? '' : `${net > 0 ? '+' : '−'}${count(Math.abs(net))} net`;
  const partners = partnerTotals(s, p.branch.id, spec.id);
  return (
    <div class="br-product-figures">
      {spec.kind === 'fx' ? (
        <Row label="Fees" value="Charged on customers' transfers" tone="dim" />
      ) : (
        <>
          <Row
            label={productWords(spec).newAccounts}
            value={
              <>
                {count(book?.last.newAccounts ?? 0)}{' '}
                <span class={`small tone-${net > 0 ? 'good' : net < 0 ? 'bad' : 'flat'}`}>
                  {netText}
                </span>
              </>
            }
          />
          {spec.kind === 'safebox' ? (
            <Row label="Boxes rented" value={count(book?.accounts ?? 0)} />
          ) : (
            <Row
              label={productWords(spec).balance}
              value={money((book?.balance ?? 0) + partners.balance, sym)}
            />
          )}
          {partners.count > 0 && (
            <Row
              label="incl. partners"
              value={`${money(partners.balance, sym)} · ${count(partners.accounts)} accounts`}
              tone="dim"
            />
          )}
        </>
      )}
      <Row label={p.costLabel} value={p.costText} />
    </div>
  );
}

function SblFigures(p: { branchId: string; onDealDesk: () => void }) {
  const s = useGame();
  const held = contractTotals(s, p.branchId);
  return (
    <div class="br-product-figures">
      <Row label="Contracts" value={count(held.count)} />
      <Row label="Contract ARR" value={money(held.arr, s.settings.currency)} />
      <Row label="Requests waiting" value={count(newRfpsByBranch(s)[p.branchId] ?? 0)} />
      <button type="button" class="btn btn-secondary btn-small br-link" onClick={p.onDealDesk}>
        Managed on the Deal Desk →
      </button>
    </div>
  );
}
