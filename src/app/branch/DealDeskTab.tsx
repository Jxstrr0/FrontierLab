// Deal Desk tab of the sales office panel (SCREENS §5.3, SIMULATION §11, stage
// C5b): a summary strip (this week's RFPs, won, lost, win rate, contracts held
// and their yearly value), the office's discount limit, new requests for
// proposal to bid on, renewals due at the next quarter start, and the
// office's contracts.
import { DEAL } from '../../config/balance';
import { contractsOf, dealsOffered, deskDelegated } from '../../sim/branch/dealDesk';
import * as cmd from '../../sim/commands';
import { act, useGame } from '../store';
import { Card, SectionTitle } from '../components';
import { count, money, pct } from '../format/format';
import { ContractList } from './dealdesk/ContractList';
import { DiscountStepper } from './dealdesk/dealParts';
import { RenewalCard } from './dealdesk/RenewalCard';
import { RfpCard } from './dealdesk/RfpCard';
import { dealDeskStrip, officeRfps } from './dealDeskSelectors';
import './dealdesk/dealdesk.css';

export function DealDeskTab({ branchId }: { branchId: string }) {
  const s = useGame();
  const branch = s.branches[branchId];
  if (!branch) return <p class="muted">This sales office no longer exists.</p>;

  const sym = s.settings.currency;
  const { fresh, renewals } = officeRfps(s, branchId);
  const strip = dealDeskStrip(s, branch);
  const limit = branch.discountLimit;
  const withBusiness = <T extends { businessId: string }>(list: T[]) =>
    list.flatMap((rfp) => {
      const b = s.businesses[rfp.businessId];
      return b ? [{ rfp, b }] : [];
    });

  return (
    <div class="stack dealdesk">
      {deskDelegated(s, branch) && (
        <Card>
          <p class="dealdesk-note">
            Your {branch.managerId && branch.delegation.loans ? 'manager' : 'CRO'} is bidding on
            proposal requests for you, within the discount limit below, so most are settled during
            the weekly close. You can still step in on any that remain.
          </p>
        </Card>
      )}

      <div class="deal-summary">
        <Stat label="RFPs this week" value={count(strip.arrived)} />
        <Stat label="Won" value={count(strip.won)} />
        <Stat label="Lost" value={count(strip.lost)} />
        <Stat label="Win rate" value={strip.winRate === undefined ? '–' : pct(strip.winRate, 0)} />
        <Stat label="Contracts" value={count(strip.contracts)} />
        <Stat label="Contract ARR" value={money(strip.arr, sym)} />
      </div>

      <Card class="deal-limit">
        <DiscountStepper
          label="Discount limit"
          value={limit}
          onChange={(v) => act(cmd.setDiscountLimit, branch.id, v)}
        />
        <p class="muted small dealdesk-foot">
          Managers bid within this discount off a business's AI budget, and your offers start from
          it.
        </p>
      </Card>

      {!dealsOffered(branch) && (
        <Card>
          <p class="dealdesk-note">
            New proposal requests need Enterprise contracts switched on in Products.
          </p>
        </Card>
      )}

      <SectionTitle>Proposal requests · {count(fresh.length)}</SectionTitle>
      {fresh.length === 0 ? (
        <Card>
          <p class="dealdesk-empty">
            No requests right now. Businesses without an AI vendor ask for proposals every week, and
            more often when your name is well known in the city.
          </p>
        </Card>
      ) : (
        withBusiness(fresh).map(({ rfp, b }) => (
          <RfpCard key={rfp.id} s={s} rfp={rfp} b={b} startDiscount={limit} />
        ))
      )}

      {renewals.length > 0 && (
        <>
          <SectionTitle>Renewals due · {count(renewals.length)}</SectionTitle>
          <p class="muted small dealdesk-foot">
            Contracts renew at the start of a quarter. Offers here are settled then, up to{' '}
            {DEAL.renewalNoticeWeeks} weeks from now.
          </p>
          {withBusiness(renewals).map(({ rfp, b }) => (
            <RenewalCard key={rfp.id} s={s} rfp={rfp} b={b} startDiscount={limit} />
          ))}
        </>
      )}

      <ContractList
        contracts={contractsOf(s, branchId)}
        currency={sym}
        startDate={s.meta.startDate}
      />
    </div>
  );
}

function Stat(p: { label: string; value: string }) {
  return (
    <div class="deal-stat">
      <span class="deal-stat-value">{p.value}</span>
      <span class="deal-stat-label">{p.label}</span>
    </div>
  );
}
