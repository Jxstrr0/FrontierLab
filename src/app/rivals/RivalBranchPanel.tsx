// Rival branch panel (SCREENS §6): the rival's medallion and name, with the
// district and address underneath (both don't fit one title line on phones);
// the advisor comparing savings rates; the branch's ratings and review cards
// (derived from its quality, CONTENT §24); its rate sheet against our nearest
// branch in the city; and a link to the bank's head office.
import { DISTRICT_SPECS } from '../../data/districts';
import { rivalPriceInCity } from '../../sim/rivalPrices';
import { rivalReviewCards } from '../../sim/rivalReviews';
import type { GameState, RivalBank, RivalBranch } from '../../sim/state';
import { ReviewCardView } from '../branch/ServiceTab';
import { priceText } from '../branch/selectors';
import { Badge, Card, CoinRating, Medallion, Panel, SectionTitle } from '../components';
import { count, pct } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { RivalBranchArt } from './RivalArt';
import {
  comparison,
  failedText,
  nearestOwnBranch,
  ourPrice,
  productOf,
  RATE_SHEET,
  rivalBranchAt,
  rivalHqSite,
  STRATEGY_LABEL,
} from './rivalSelectors';
import '../branch/branch.css';
import './rivals.css';

const CATEGORY_ROWS = [
  { label: 'Rates', i: 0 },
  { label: 'Products', i: 1 },
  { label: 'Service', i: 2 },
  { label: 'Sales office', i: 3 },
] as const;

export function RivalBranchPanel(p: { lotId: string }) {
  const s = useGame();
  const found = rivalBranchAt(s, p.lotId);
  const lot = s.world.lots[p.lotId];
  if (!found || !lot) {
    return (
      <Panel title="Rival sales office" onClose={closePanel}>
        <p class="muted">This sales office has closed. The storefront is free to lease.</p>
      </Panel>
    );
  }
  const { bank, branch } = found;
  const district = DISTRICT_SPECS[lot.district]?.name;
  const mine = nearestOwnBranch(s, branch);
  const theirs = rivalPriceInCity(s, bank, 'savings', branch.cityId);
  const ours = ourPrice(s, mine, 'savings');
  const advice =
    theirs !== undefined && ours !== undefined
      ? `This is ${bank.name}'s sales office. Their savings rate is ${pct(theirs)}; ours is ${pct(ours)}.`
      : theirs !== undefined
        ? `This is ${bank.name}'s sales office. Their savings rate is ${pct(theirs)}.`
        : `This is ${bank.name}'s sales office.`;
  const hqSite = rivalHqSite(s, bank.id, branch.cityId);
  const failed = failedText(s, bank);

  return (
    <Panel
      title={bank.name}
      subtitle={[district, lot.address].filter(Boolean).join(' · ')}
      icon={<Medallion ink={bank.ink} monogram={bank.monogram} size={32} ring />}
      onClose={closePanel}
      advisor={{ text: advice }}
      hero={<RivalBranchArt bank={bank} />}
    >
      <div class="stack">
        <div class="rv-tags">
          <Badge>{STRATEGY_LABEL[bank.strategy]}</Badge>
          {bank.status !== 'active' && <Badge tone="bad">Failed</Badge>}
        </div>
        {failed && (
          <p class="rv-notice small" role="status">
            {failed}
          </p>
        )}
        <Reviews s={s} branch={branch} />
        <RateSheet s={s} bank={bank} branch={branch} />
        {hqSite && (
          <button
            type="button"
            class="btn btn-secondary btn-block"
            onClick={() => openPanel({ type: 'rivalHq', siteId: hqSite })}
          >
            {bank.name} head office →
          </button>
        )}
      </div>
    </Panel>
  );
}

function Reviews(p: { s: GameState; branch: RivalBranch }) {
  const { branch } = p;
  const cards = rivalReviewCards(branch, p.s.clock.week);
  return (
    <section>
      <SectionTitle>Customer reviews</SectionTitle>
      <Card>
        <div class="br-reviews-head">
          <span class="hero-number">{branch.overall.toFixed(1)}</span>
          <div>
            <CoinRating value={branch.overall} showNumber={false} size={20} />
            <div class="muted small">{count(branch.reviewCount)} reviews</div>
          </div>
        </div>
        <div class="br-rating-rows">
          {CATEGORY_ROWS.map((r) => (
            <div class="br-rating-row">
              <span class="muted">{r.label}</span>
              <CoinRating value={branch.quality[r.i]} size={14} />
            </div>
          ))}
        </div>
      </Card>
      <div class="carousel br-review-carousel" role="group" aria-label="Reviews" tabIndex={0}>
        {cards.map((c) => (
          <ReviewCardView card={c} />
        ))}
      </div>
    </section>
  );
}

function RateSheet(p: { s: GameState; bank: RivalBank; branch: RivalBranch }) {
  const mine = nearestOwnBranch(p.s, p.branch);
  const sym = p.s.settings.currency;
  return (
    <section>
      <SectionTitle>Rate sheet</SectionTitle>
      {mine && <p class="muted small">Compared with our {mine.name} sales office.</p>}
      <Card>
        {RATE_SHEET.map((group) => (
          <div class="rv-sheet">
            <div class={`rv-sheet-head${mine ? '' : ' rv-two'}`}>
              <span>{group.title}</span>
              <span>Theirs</span>
              {mine && <span>Ours</span>}
            </div>
            {group.ids.map((id) => {
              const spec = productOf(id);
              const theirs = rivalPriceInCity(p.s, p.bank, id, p.branch.cityId);
              if (!spec || theirs === undefined) return null;
              const ours = ourPrice(p.s, mine, id);
              const tone = ours !== undefined ? comparison(spec, ours, theirs) : 'flat';
              return (
                <div class={`rv-sheet-row${mine ? '' : ' rv-two'}`}>
                  <span class="muted">{spec.name}</span>
                  <span>{priceText(spec, theirs, sym)}</span>
                  {mine && (
                    <span class={ours !== undefined ? `tone-${tone}` : 'muted'}>
                      {ours !== undefined ? priceText(spec, ours, sym) : 'Not offered'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </Card>
      {mine && (
        <p class="muted small">
          Jade where ours is the better deal for customers, oxblood where it isn't.
        </p>
      )}
    </section>
  );
}
