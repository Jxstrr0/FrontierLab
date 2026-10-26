// Offer sheet (SCREENS §12 "Offer M&A sheet"): price per share with the
// premium, how much to pay in your own shares once listed (§19.8), shares to
// buy and total cost, available cash, the regulator's pre-check (the same tests
// as next week's answer, without the board's roll), and Offer merger.
import { useState } from 'preact/hooks';
import { MERGERS, SHARE_DEALS } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { referencePrice, requiredPremium } from '../../sim/mergerPricing';
import { roundToStep } from '../../sim/math';
import type { RivalBank } from '../../sim/state';
import { Medallion, Row, Segmented, Sheet, Stepper } from '../components';
import { count, exactMoney, money, moneyStepper, pct, signedPct } from '../format/format';
import { FOUNDER_ID, sharesHeld } from '../../sim/shares';
import { act, toast, useGame } from '../store';
import { boardHint, referenceLabel } from './mnaSelectors';

export function OfferSheet(p: { bank: RivalBank; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { bank } = p;
  const step = MERGERS.offerStep;
  const ref = referencePrice(bank);
  const [lo, hi] = MERGERS.offerRange;
  const min = Math.max(step, roundToStep(ref * lo, step));
  const max = Math.max(min, roundToStep(ref * hi, step));
  const start = roundToStep(ref * (1 + Math.max(0, requiredPremium(bank))), step);
  const [price, setPrice] = useState(Math.min(max, Math.max(min, start)));
  const [mix, setMix] = useState('0');
  const listed = s.stock.status === 'public';
  const stockPct = listed ? Number(mix) : 0;
  const quote = cmd.mergerQuote(s, bank.id, price, stockPct);
  if (!quote) return null;
  const { plan } = quote;
  const { split } = plan;
  const out = s.company.sharesOutstanding;
  const stakeAfter =
    (sharesHeld(s, FOUNDER_ID) + split.founderNewShares) / Math.max(1, out + split.newShares);
  const perShare = (v: number) => exactMoney(v, sym);
  const offer = () => {
    const r = act(cmd.offerMerger, bank.id, price, stockPct);
    if (r.ok) {
      toast(`Offer sent to ${bank.name}. The answer arrives next week.`, 'good');
      p.onClose();
    }
  };
  return (
    <Sheet title={`Offer for ${bank.name}`} onClose={p.onClose}>
      <div class="stack">
        <div class="ma-sheet-head">
          <Medallion ink={bank.ink} monogram={bank.monogram} size={40} />
          <div>
            <div class="ma-name">{bank.name}</div>
            <div class="muted small">
              {referenceLabel(bank)} {perShare(quote.reference)}
            </div>
          </div>
        </div>
        <Stepper
          label="Offer price per share"
          value={price}
          min={min}
          max={max}
          step={step}
          onChange={setPrice}
          {...moneyStepper(sym, exactMoney)}
          hint={`${perShare(min)} – ${perShare(max)}`}
        />
        <Row
          label="Premium"
          value={signedPct(quote.premium, 1)}
          tone={quote.premium >= requiredPremium(bank) ? 'good' : 'bad'}
        />
        <p class="muted small">{boardHint(bank)}</p>
        <Row label="Shares outstanding" value={count(bank.shares)} />
        {plan.companyShares > 0 && (
          <Row label="Already held by your company" value={count(plan.companyShares)} />
        )}
        {plan.personalShares > 0 && (
          <Row label="Your own shares (paid to you)" value={count(plan.personalShares)} />
        )}
        {listed && <div class="muted small">Paid in your shares</div>}
        {listed && (
          <Segmented
            label="Paid in your shares"
            options={mixOptions()}
            value={mix}
            onChange={setMix}
          />
        )}
        {split.stockValue > 0 && (
          <>
            <Row label="Paid in new shares" value={money(split.stockValue, sym)} />
            <Row
              label="New shares issued"
              value={`${count(split.newShares)} (${pct(split.newShares / Math.max(1, out))})`}
            />
            <Row label="Your stake after" value={pct(stakeAfter, 1)} />
          </>
        )}
        <Row
          label={split.stockValue > 0 ? 'Paid in cash' : 'Total cost'}
          value={money(plan.cash, sym)}
          strong
        />
        <Row
          label="Available cash"
          value={money(s.company.cash, sym)}
          tone={s.company.cash >= plan.cash ? undefined : 'bad'}
        />
        <Row
          label={plan.gain > 0 ? 'Bargain gain' : 'Goodwill'}
          value={money(plan.gain || plan.goodwill, sym)}
        />
        <section aria-label="Regulator pre-check">
          <div class="ma-check-title">Regulator pre-check</div>
          <ul class="ma-checks">
            {quote.checks.map((c) => (
              <li class={c.ok ? 'is-ok' : 'is-bad'}>
                <span class={`ma-check-mark ${c.ok ? 'tone-good' : 'tone-bad'}`} aria-hidden="true">
                  {c.ok ? '✓' : '✗'}
                </span>
                <span>
                  <span class="ma-check-label">{c.label}</span>
                  <span class="muted small">{c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <p class="muted small">
          The answer arrives next week.{' '}
          {split.stockValue > 0
            ? `The board counts the share part at ${Math.round((1 - SHARE_DEALS.boardDiscount) * 100)}% of its value. New shares are issued at your price on closing.`
            : listed
              ? 'Payment is in cash.'
              : 'Payment is in cash. Once listed, you can pay partly in shares.'}
        </p>
        <button
          type="button"
          class="btn btn-primary btn-block"
          disabled={!!quote.blocker}
          onClick={offer}
        >
          Offer merger
        </button>
        {quote.blocker && <p class="ma-blocker small tone-bad">{quote.blocker}</p>}
      </div>
    </Sheet>
  );
}

/** Cash, then the share part in SHARE_DEALS.stockStep steps up to all shares. */
function mixOptions(): { value: string; label: string }[] {
  const step = SHARE_DEALS.stockStep;
  const out: { value: string; label: string }[] = [{ value: '0', label: 'Cash' }];
  for (let k = 1; k * step <= 1 + 1e-9; k++) {
    const v = Math.min(1, k * step);
    out.push({ value: String(v), label: v >= 1 ? 'All' : `${Math.round(v * 100)}%` });
  }
  return out;
}
