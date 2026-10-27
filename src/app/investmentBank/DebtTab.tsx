// Investment bank Debt tab (SCREENS §12, SIMULATION §19.9): venture debt term
// loan offers from this bank with Apply, its revolving credit line
// (CreditLineCard.tsx), and every loan and line you owe with early repayment.
// Corporate cash, never deposits. A bank lends to labs with a sales office in
// its city. Loans taken from rival labs in older saves show here to repay.
import { CORPORATE_LENDING } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { INVESTMENT_BANKS } from '../../data/investmentBanks';
import * as cmd from '../../sim/commands';
import { isLenderNearYou, lenderName, loanRoom } from '../../sim/corporateDebt';
import type { CorporateLoan, CorporateLoanOffer, CreditLine } from '../../sim/state';
import { Card, Row, SectionTitle } from '../components';
import { money, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { CreditLineCard } from './CreditLineCard';
import './debt.css';

const WEEKS_PER_YEAR = 52;

/** "2 years", "18 months" style maturity for a term in weeks. */
function maturity(weeks: number): string {
  if (weeks % WEEKS_PER_YEAR === 0) {
    const y = weeks / WEEKS_PER_YEAR;
    return `${y} year${y === 1 ? '' : 's'}`;
  }
  return `${Math.round((weeks / WEEKS_PER_YEAR) * 12)} months`;
}

export function DebtTab(p: { siteId: string }) {
  const s = useGame();
  const sym = s.settings.currency;
  const site = s.world.sites[p.siteId];
  const bankName = (site && INVESTMENT_BANKS[site.refId]?.name) ?? 'This bank';
  const near = isLenderNearYou(s, p.siteId);
  const city = (site && CITIES[site.cityId]?.name) ?? 'this city';
  const offers = s.corporateDebt.offers.filter((o) => o.lenderId === p.siteId);
  const loans = Object.values(s.corporateDebt.loans);
  const otherLines = Object.values(s.corporateDebt.lines).filter(
    (l) => l.lenderId !== p.siteId && l.drawn > 0,
  );
  return (
    <>
      {!near && (
        <p class="ib-notice small" role="status">
          {bankName} lends to labs with a sales office in {city}. Open one here to borrow.
        </p>
      )}
      <SectionTitle>Venture debt</SectionTitle>
      {near && (
        <p class="muted small">
          Fixed-rate term loans, priced on your runway and ARR and paid back weekly. Corporate debt
          is capped at {CORPORATE_LENDING.maxEquityShare * 100}% of equity: room for{' '}
          {money(loanRoom(s), sym)} more. New offers every {CORPORATE_LENDING.refreshWeeks} weeks.
        </p>
      )}
      {!near && (
        <p class="muted small">Term loan offers appear once you have a sales office here.</p>
      )}
      {near && offers.length === 0 && (
        <p class="muted small">No offers right now. Check back after the next refresh.</p>
      )}
      {near && offers.map((o) => <OfferCard key={o.id} offer={o} sym={sym} />)}
      <SectionTitle>Credit line</SectionTitle>
      <CreditLineCard siteId={p.siteId} near={near} />
      {(loans.length > 0 || otherLines.length > 0) && <SectionTitle>Your debt</SectionTitle>}
      {loans.map((l) => (
        <LoanCard key={l.id} loan={l} sym={sym} />
      ))}
      {otherLines.map((l) => (
        <OtherLineCard key={l.lenderId} line={l} sym={sym} />
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
    <Card class="ib-debt">
      <div class="ib-debt-amount">{money(offer.amount, sym)}</div>
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
    <Card class="ib-debt">
      <Row label="Term loan from" value={lenderName(s, loan.lenderId)} tone="dim" />
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

/** A line drawn at another lender (or a rival lab, in older saves): repay only. */
function OtherLineCard(p: { line: CreditLine; sym: string }) {
  const s = useGame();
  const { line, sym } = p;
  const pay = Math.min(line.drawn, Math.max(0, s.company.cash));
  const repay = () => {
    const r = act(cmd.repayCredit, line.lenderId, pay);
    if (r.ok) toast(`Repaid ${money(pay, sym)}.`, 'good');
  };
  return (
    <Card class="ib-debt">
      <Row label="Credit line with" value={lenderName(s, line.lenderId)} tone="dim" />
      <Row label="Used" value={money(line.drawn, sym)} strong />
      <Row label="Interest rate" value={pct(line.rate)} />
      <button type="button" class="btn btn-secondary btn-block" disabled={pay <= 0} onClick={repay}>
        Repay {money(pay, sym)}
      </button>
    </Card>
  );
}
