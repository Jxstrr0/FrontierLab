// Investment bank M&A tab (SCREENS §12, SIMULATION §19.8): rival bank cards
// (monogram, name, ticker or Private, reference price, branches, cities,
// deposits, capital band), distressed sales with their badge and asking price,
// your offer's status, the Offer sheet, and integrations in progress.
import { useState } from 'preact/hooks';
import { referencePrice } from '../../sim/mergerPricing';
import { targetBlocker } from '../../sim/mergerRules';
import type { GameState, RivalBank } from '../../sim/state';
import { Badge, Card, Medallion, Row, SectionTitle } from '../components';
import { capitalRatioText, count, money } from '../format/format';
import { rivalTier, TIER_LABEL, TIER_TONE } from '../rivals/rivalSelectors';
import { useGame } from '../store';
import {
  lastOffer,
  mnaRivals,
  offerStatusText,
  offerTone,
  referenceLabel,
  rivalCities,
  rivalDeposits,
  saleWeeksLeft,
} from './mnaSelectors';
import { OfferSheet } from './OfferSheet';
import './mna.css';

export function MnaTab(_p: { bankId: string }) {
  const s = useGame();
  const [target, setTarget] = useState<string | undefined>();
  const rivals = mnaRivals(s);
  const open = target ? s.rivals[target] : undefined;
  return (
    <>
      <p class="muted small">
        Buy a rival bank for cash. Its branches convert to your brand over eight weeks. The
        regulator checks your capital and local market share first.
      </p>
      <Integrations s={s} />
      <SectionTitle>Banks</SectionTitle>
      {rivals.length === 0 && <p class="muted small">No banks are for sale right now.</p>}
      {rivals.map((bank) => (
        <RivalCard s={s} bank={bank} onOffer={() => setTarget(bank.id)} />
      ))}
      <Deals s={s} />
      {open && <OfferSheet bank={open} onClose={() => setTarget(undefined)} />}
    </>
  );
}

function RivalCard(p: { s: GameState; bank: RivalBank; onOffer: () => void }) {
  const { s, bank } = p;
  const sym = s.settings.currency;
  const distressed = bank.status === 'distressed';
  const tier = rivalTier(bank);
  const offer = lastOffer(s, bank.id);
  const blocker = targetBlocker(s, bank.id);
  const weeks = saleWeeksLeft(s, bank);
  return (
    <Card class={`ma-card${distressed ? ' is-distressed' : ''}`}>
      <div class="ma-head">
        <Medallion ink={bank.ink} monogram={bank.monogram} size={40} />
        <div class="ma-title">
          <div class="ma-name">{bank.name}</div>
          <div class="muted small">{bank.listed ? (bank.ticker ?? 'Listed') : 'Private'}</div>
        </div>
        {distressed && <Badge tone="bad">Distressed sale</Badge>}
      </div>
      <Row
        label={referenceLabel(bank)}
        value={`${sym}${referencePrice(bank).toFixed(2)}`}
        strong={distressed}
      />
      {distressed && (
        <p class="ma-sale small">
          Seized by regulators. On sale for {weeks} more week{weeks === 1 ? '' : 's'}, then split
          among other banks.
        </p>
      )}
      <Row label="Branches" value={count(bank.branches.length)} />
      <Row label="Cities" value={rivalCities(bank) || '—'} />
      <Row label="Deposits" value={money(rivalDeposits(bank), sym)} />
      <Row
        label="Capital"
        value={
          distressed ? (
            <Badge tone="bad">Failed</Badge>
          ) : (
            <span class="ma-capital">
              <Badge tone={TIER_TONE[tier]}>{TIER_LABEL[tier]}</Badge>
              <span>{capitalRatioText(bank.capitalRatio)}</span>
            </span>
          )
        }
      />
      {offer && (
        <p class="ma-status small" role="status">
          <Badge tone={offerTone(offer)}>
            Your offer {`${sym}${offer.pricePerShare.toFixed(2)}`}
          </Badge>{' '}
          {offerStatusText(offer)}
        </p>
      )}
      <button
        type="button"
        class="btn btn-primary btn-block"
        disabled={!!blocker}
        onClick={p.onOffer}
      >
        Make an offer
      </button>
      {blocker && <p class="muted small">{blocker}</p>}
    </Card>
  );
}

function Integrations(p: { s: GameState }) {
  const list = p.s.mergers.integrations;
  if (list.length === 0) return null;
  return (
    <section>
      <SectionTitle>Integrations in progress</SectionTitle>
      {list.map((i) => {
        const branches = i.branchIds.filter((id) => p.s.branches[id]).length;
        return (
          <Card class="ma-integration">
            <Row
              label={i.name}
              value={`${i.weeksLeft} week${i.weeksLeft === 1 ? '' : 's'} left`}
              strong
            />
            <Row label="Branches converting" value={count(branches)} />
          </Card>
        );
      })}
    </section>
  );
}

function Deals(p: { s: GameState }) {
  const deals = p.s.mergers.deals;
  if (deals.length === 0) return null;
  const sym = p.s.settings.currency;
  return (
    <section>
      <SectionTitle>Completed deals</SectionTitle>
      <Card>
        {[...deals].reverse().map((d) => (
          <Row
            label={`${d.name}${d.distressed ? ' (distressed)' : ''}`}
            value={`${money(d.price, sym)} · ${d.branches} branch${d.branches === 1 ? '' : 'es'}`}
          />
        ))}
      </Card>
    </section>
  );
}
