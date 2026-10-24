// The startup panel's money sections (SCREENS §11): Funding (the round name,
// a Company | Private toggle, available cash, the two offer-lot cards with
// Invest) and Venture debt (amount and rate steppers, Offer loan, or the
// outstanding loan). The account toggle is shared by both.
import { useState } from 'preact/hooks';
import * as cmd from '../../sim/commands';
import type { Account } from '../../sim/portfolio';
import type { Startup } from '../../sim/state';
import { Badge, Card, Row, SectionTitle, Segmented, Stepper } from '../components';
import { count, money, moneyFull, pct, percentText } from '../format/format';
import { act, toast, useGame } from '../store';
import { accountCash, debtBounds, investBlock, raising } from './startupView';

const ACCOUNTS: { value: Account; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'personal', label: 'Private' },
];

export function StartupFunding(p: { startup: Startup }) {
  const s = useGame();
  const st = p.startup;
  const sym = s.settings.currency;
  const [account, setAccount] = useState<Account>('company');
  const block = investBlock(s, st, account);
  const open = raising(s, st);
  return (
    <>
      <SectionTitle>Funding</SectionTitle>
      <Card>
        <Row label="Round" value={open ? st.round!.name : 'Not raising'} strong />
        <Segmented options={ACCOUNTS} value={account} onChange={setAccount} label="Invest as" />
        <Row
          label={account === 'company' ? 'Corporate cash' : 'Your cash'}
          value={moneyFull(accountCash(s, account), sym)}
        />
        {block && <p class="muted small st-block">{block}</p>}
      </Card>
      {open &&
        st.round!.lots.map((lot, i) => (
          <Card class="st-lot">
            <div class="st-lot-text">
              <span class="st-lot-name">{st.name} stock</span>
              <span class="small">
                {count(lot.shares)} shares ({pct(lot.pct)})
              </span>
              <span class="st-lot-price">{moneyFull(lot.price, sym)}</span>
            </div>
            {lot.taken ? (
              <Badge tone={lot.taken === 'fund' ? 'info' : 'good'}>
                {lot.taken === 'company' ? 'Company' : lot.taken === 'personal' ? 'You' : 'Taken'}
              </Badge>
            ) : (
              <button
                type="button"
                class="btn btn-primary"
                disabled={!!block || lot.price > accountCash(s, account)}
                onClick={() => {
                  const r = act(cmd.buyStartupLot, st.id, i, account);
                  if (r.ok) toast('They accepted our investment.', 'good');
                }}
              >
                Invest
              </button>
            )}
          </Card>
        ))}
      <VentureDebtCard startup={st} account={account} block={block} />
    </>
  );
}

function VentureDebtCard(p: { startup: Startup; account: Account; block?: string }) {
  const s = useGame();
  const st = p.startup;
  const sym = s.settings.currency;
  const b = debtBounds(s, st);
  const [amount, setAmount] = useState(Math.round(b.maxAmount / 2 / b.amountStep) * b.amountStep);
  const [rate, setRate] = useState(Math.floor(b.ceiling * 400) / 400);
  const d = st.ventureDebt;
  if (st.stage === 'failed' || st.stage === 'acquired' || st.stage === 'public') return null;
  return (
    <>
      <SectionTitle>Venture debt</SectionTitle>
      <Card>
        {d ? (
          <>
            <Row label="Lender" value={d.lender === 'company' ? s.meta.bankName : 'You'} />
            <Row label="Balance" value={moneyFull(d.balance, sym)} strong />
            <Row label="Rate" value={pct(d.rate)} />
            <Row label="Weekly payment" value={money(d.payment, sym)} />
            <Row label="Weeks left" value={String(d.weeksLeft)} />
          </>
        ) : (
          <>
            <Stepper
              label="Amount"
              value={Math.min(amount, b.maxAmount)}
              min={0}
              max={b.maxAmount}
              step={b.amountStep}
              format={(v) => money(v, sym)}
              onChange={setAmount}
              hint={`Up to ${money(b.maxAmount, sym)}`}
            />
            <Stepper
              label="Annual rate"
              value={rate}
              min={b.rateMin}
              max={b.rateMax}
              step={0.0025}
              format={(v) => pct(v)}
              editText={percentText}
              parse={(t) => Number(t) / 100}
              onChange={setRate}
              hint="Paid back weekly over 3 years"
            />
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={!!p.block || amount <= 0}
              onClick={() => {
                const r = act(cmd.offerVentureDebt, st.id, amount, rate, p.account);
                if (r.ok)
                  toast(
                    r.accepted
                      ? `${st.name} accepted the loan.`
                      : `${st.name} turned the loan down at that rate.`,
                    r.accepted ? 'good' : 'bad',
                  );
              }}
            >
              Offer loan
            </button>
          </>
        )}
      </Card>
    </>
  );
}
