// "Make an offer" (SCREENS §16, §19, §20): the cash you'd pay from, an offer
// stepper with a hint, Offer purchase (disabled with the reason when blocked)
// and a note under it. With `account`, a Company | Private switch sits on top
// and the cash line follows it; without, you pay from personal cash.
import type { ComponentChildren } from 'preact';
import { money, moneyStepper } from '../format/format';
import { Card, SectionTitle } from './Card';
import { Segmented, Stepper } from './Controls';

type Account = 'company' | 'personal';

const ACCOUNTS: { value: Account; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'personal', label: 'Private' },
];

export function OfferCard(p: {
  sym: string;
  cash: number;
  account?: { value: Account; onChange: (a: Account) => void };
  offer: number;
  bounds: { min: number; max: number; step: number };
  onOffer: (v: number) => void;
  hint: string;
  blocker: string | null;
  onSubmit: () => void;
  note: ComponentChildren;
}) {
  const company = p.account?.value === 'company';
  return (
    <>
      <SectionTitle>Make an offer</SectionTitle>
      <Card>
        <div class="stack">
          {p.account && (
            <Segmented
              label="Buy as"
              options={ACCOUNTS}
              value={p.account.value}
              onChange={p.account.onChange}
            />
          )}
          <p class="muted small offer-center">
            {company ? 'Corporate cash' : 'Personal cash'} {money(p.cash, p.sym)}
          </p>
          <Stepper
            label="Offer price"
            value={p.offer}
            min={p.bounds.min}
            max={p.bounds.max}
            step={p.bounds.step}
            onChange={p.onOffer}
            {...moneyStepper(p.sym)}
            hint={p.hint}
          />
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!!p.blocker}
            onClick={p.onSubmit}
          >
            Offer purchase
          </button>
          {p.blocker && <p class="small tone-bad offer-center">{p.blocker}</p>}
          <p class="muted small offer-center">{p.note}</p>
        </div>
      </Card>
    </>
  );
}
