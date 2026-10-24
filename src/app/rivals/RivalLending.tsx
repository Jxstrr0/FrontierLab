// The lending tabs of a rival head office (SCREENS §7, SIMULATION §19.9):
// business loan offer cards with Apply and your active loans from this bank
// with "Repay early"; and the line of credit with its live limit, the amount
// used, the rate and a draw/repay slider. Corporate cash, never deposits.
import { useState } from 'preact/hooks';
import { CORPORATE_LENDING } from '../../config/balance';
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { creditLimit, lendersNearYou, lineRate, loanRoom } from '../../sim/corporateDebt';
import type { CorporateLoan, CorporateLoanOffer, RivalBank } from '../../sim/state';
import { Card, Row, SectionTitle, Segmented } from '../components';
import { money, pct } from '../format/format';
import { AmountSlider } from '../hq/treasury/AmountSlider';
import { act, toast, useGame } from '../store';
import '../hq/treasury/treasury.css';

const WEEKS_PER_YEAR = 52;

/** "2 years", "18 months" style maturity for a term in weeks. */
function maturity(weeks: number): string {
  if (weeks % WEEKS_PER_YEAR === 0) {
    const y = weeks / WEEKS_PER_YEAR;
    return `${y} year${y === 1 ? '' : 's'}`;
  }
  return `${Math.round((weeks / WEEKS_PER_YEAR) * 12)} months`;
}

/** Why this bank won't lend to you right now, if it won't. */
function blocker(bank: RivalBank, cityId: string, near: boolean): string | undefined {
  if (bank.status !== 'active') return `${bank.name} is not lending.`;
  if (!near)
    return `${bank.name} lends to banks with a branch in ${CITIES[cityId]?.name ?? 'this city'}. Open one here to borrow.`;
  return undefined;
}

export function RivalLoansTab(p: { bank: RivalBank; cityId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const near = lendersNearYou(s).some((r) => r.id === p.bank.id);
  const why = blocker(p.bank, p.cityId, near);
  const offers = s.corporateDebt.offers.filter((o) => o.lenderId === p.bank.id);
  const loans = Object.values(s.corporateDebt.loans).filter((l) => l.lenderId === p.bank.id);
  return (
    <>
      <SectionTitle>Business loans</SectionTitle>
      {why ? (
        <p class="rv-notice small">{why}</p>
      ) : (
        <p class="muted small">
          Fixed-rate loans paid back weekly. Corporate debt is capped at{' '}
          {CORPORATE_LENDING.maxEquityShare * 100}% of equity: room for {money(loanRoom(s), sym)}{' '}
          more. New offers every {CORPORATE_LENDING.refreshWeeks} weeks.
        </p>
      )}
      {!why && offers.length === 0 && (
        <p class="muted small">No offers right now. Check back after the next refresh.</p>
      )}
      {!why && offers.map((o) => <OfferCard offer={o} sym={sym} />)}
      {loans.length > 0 && <SectionTitle>Your loans from {p.bank.name}</SectionTitle>}
      {loans.map((l) => (
        <LoanCard loan={l} sym={sym} />
      ))}
    </>
  );
}

function OfferCard(p: { offer: CorporateLoanOffer; sym: string }) {
  const s = useGame();
  const { offer, sym } = p;
  const tooBig = offer.amount > loanRoom(s) + CORPORATE_LENDING.dust;
  const apply = () => {
    const r = act(cmd.acceptCorporateLoan, offer.id);
    if (r.ok) toast(`${money(offer.amount, sym)} added to corporate cash.`, 'good');
  };
  return (
    <Card class="rv-offer">
      <div class="rv-offer-amount">{money(offer.amount, sym)}</div>
      <Row label="Interest rate" value={pct(offer.rate)} />
      <Row label="Maturity" value={maturity(offer.termWeeks)} />
      <Row label="Weekly payment" value={money(offer.payment, sym)} />
      <button type="button" class="btn btn-primary btn-block" disabled={tooBig} onClick={apply}>
        Apply
      </button>
      {tooBig && <p class="muted small">More than your borrowing room right now.</p>}
    </Card>
  );
}

function LoanCard(p: { loan: CorporateLoan; sym: string }) {
  const s = useGame();
  const { loan, sym } = p;
  const short = loan.balance > s.company.cash;
  const repay = () => {
    const r = act(cmd.repayCorporateLoan, loan.id);
    if (r.ok) toast('Loan repaid in full.', 'good');
  };
  return (
    <Card class="rv-offer">
      <Row label="Balance" value={money(loan.balance, sym)} strong />
      <Row label="Interest rate" value={pct(loan.rate)} />
      <Row label="Weekly payment" value={money(loan.payment, sym)} />
      <Row label="Weeks left" value={String(loan.weeksLeft)} />
      <button type="button" class="btn btn-secondary btn-block" disabled={short} onClick={repay}>
        Repay early ({money(loan.balance, sym)})
      </button>
      {short && <p class="muted small">Not enough corporate cash to repay in full.</p>}
    </Card>
  );
}

export function RivalCreditTab(p: { bank: RivalBank; cityId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const near = lendersNearYou(s).some((r) => r.id === p.bank.id);
  const why = blocker(p.bank, p.cityId, near);
  const line = s.corporateDebt.lines[p.bank.id];
  const used = line?.drawn ?? 0;
  const limit = creditLimit(s);
  const available = Math.max(0, limit - used);
  const repayMax = Math.min(used, Math.max(0, s.company.cash));
  const [mode, setMode] = useState<'draw' | 'repay'>('draw');
  const [amount, setAmount] = useState(0);
  const max = mode === 'draw' ? (why ? 0 : available) : repayMax;
  const value = Math.min(amount, max);
  const go = () => {
    const r =
      mode === 'draw'
        ? act(cmd.drawCredit, p.bank.id, value)
        : act(cmd.repayCredit, p.bank.id, value);
    if (r.ok) {
      toast(
        mode === 'draw' ? `Drew ${money(value, sym)}.` : `Repaid ${money(value, sym)}.`,
        'good',
      );
      setAmount(0);
    }
  };
  return (
    <>
      <SectionTitle>Line of credit</SectionTitle>
      {why && <p class="rv-notice small">{why}</p>}
      <Card>
        <Row label="Limit" value={money(limit, sym)} />
        <Row label="Used" value={money(used, sym)} />
        <Row label="Available" value={money(why ? 0 : available, sym)} strong />
        <Row label="Interest rate" value={pct(line?.rate ?? lineRate(s))} />
      </Card>
      <p class="muted small">
        Draw or repay any week. The limit is {CORPORATE_LENDING.lineEquityShare * 100}% of your
        equity and moves with it; interest is charged weekly on what you use.
      </p>
      <Segmented
        label="Draw or repay"
        options={[
          { value: 'draw', label: 'Draw' },
          { value: 'repay', label: 'Repay' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <AmountSlider
        label={mode === 'draw' ? 'Draw' : 'Repay'}
        value={value}
        max={max}
        onChange={setAmount}
        sym={sym}
      />
      <button type="button" class="btn btn-primary btn-block" disabled={value <= 0} onClick={go}>
        {mode === 'draw' ? `Draw ${money(value, sym)}` : `Repay ${money(value, sym)}`}
      </button>
    </>
  );
}
