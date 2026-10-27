// Loan Desk tab of the branch panel (SCREENS §5.3, SIMULATION §11): a summary
// strip (this week's applications, approved, declined, approval rate, business
// loan balance, last week's defaults), the applications waiting for a decision
// and the branch's booked business loans.
import { LOANDESK } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { act, useGame } from '../store';
import { Badge, Card, SectionTitle } from '../components';
import { count, money, pct } from '../format/format';
import { branchPrice } from '../../sim/branch/pricing';
import { riskBandVisible } from '../../sim/branch/loanDesk';
import { ActiveLoans } from './loandesk/ActiveLoans';
import { ApplicationCard } from './loandesk/ApplicationCard';
import { loanDeskStrip } from './selectors';
import './loandesk/loandesk.css';

export function LoanDeskTab({ branchId }: { branchId: string }) {
  const s = useGame();
  const branch = s.branches[branchId];
  if (!branch) return <p class="muted">This sales office no longer exists.</p>;

  const sym = s.settings.currency;
  const week = s.clock.week;
  const apps = Object.values(s.loanDesk.applications)
    .filter((a) => a.branchId === branchId)
    .sort((a, b) => a.expiresWeek - b.expiresWeek || b.amount - a.amount);
  const loans = Object.values(s.loanDesk.loans).filter(
    (l) => l.branchId === branchId && l.status === 'current',
  );
  const strip = loanDeskStrip(s, branch);
  const delegated = branch.delegation.loans && branch.managerId !== undefined;
  const defaultRate = branchPrice(s, branch, 'sbl');
  const showBand = riskBandVisible(s, branch);

  return (
    <div class="stack loandesk">
      {delegated && (
        <Card>
          <p class="loandesk-note">
            Your manager is deciding loan applications for you, so most are settled during the
            weekly close. You can still step in on any that remain.
          </p>
        </Card>
      )}
      {s.treasury.freeze && <Badge tone="bad">Lending is frozen until liquidity recovers.</Badge>}
      {!s.treasury.freeze && s.company.tier === 'critical' && (
        <Badge tone="bad">No new lending at the Critical capital tier.</Badge>
      )}

      <div class="loan-summary">
        <Stat label="Applications this week" value={count(strip.arrived)} />
        <Stat label="Approved" value={count(strip.approved)} />
        <Stat label="Declined" value={count(strip.declined)} />
        <Stat
          label="Approval rate"
          value={strip.approvalRate === undefined ? '–' : pct(strip.approvalRate, 0)}
        />
        <Stat label="Business loans" value={money(strip.balance, sym)} />
        <Stat
          label="Defaulted last week"
          value={
            strip.defaultedLoans > 0
              ? `${count(strip.defaultedLoans)} · ${money(strip.defaulted, sym)}`
              : 'None'
          }
        />
      </div>
      <LendingFund reserves={s.treasury.reserves} cash={s.company.cash} sym={sym} />
      <p class="muted small loandesk-foot">
        Each offer starts at {pct(defaultRate)}, your Small Business Loan rate.
      </p>

      <SectionTitle>Waiting for a decision · {count(strip.waiting)}</SectionTitle>
      {apps.length === 0 ? (
        <Card>
          <p class="loandesk-empty">
            No applications right now. Local businesses apply every week, and more when your name is
            well known in a district with plenty of businesses.
          </p>
        </Card>
      ) : (
        apps.map((app) => (
          <ApplicationCard
            key={app.id}
            app={app}
            week={week}
            currency={sym}
            defaultRate={defaultRate}
            showRiskBand={showBand}
          />
        ))
      )}

      <ActiveLoans loans={loans} currency={sym} />
    </div>
  );
}

/** C3b: the desk lends from treasury reserves, topped up from company cash. */
function LendingFund(p: { reserves: number; cash: number; sym: string }) {
  const step = Math.min(LOANDESK.fundTopUp, Math.max(0, Math.floor(p.cash)));
  return (
    <Card>
      <p class="loandesk-note">
        <strong>Lending fund {money(p.reserves, p.sym)}.</strong> Loans are paid out of your
        treasury reserves, and repayments flow back in. Applications larger than the fund cannot be
        approved until you add to it.
      </p>
      <button
        type="button"
        class="btn btn-secondary btn-block"
        disabled={step <= 0}
        onClick={() => act(cmd.transferToTreasury, step)}
      >
        Add {money(step, p.sym)} from company cash
      </button>
    </Card>
  );
}

function Stat(p: { label: string; value: string }) {
  return (
    <div class="loan-stat">
      <span class="loan-stat-value">{p.value}</span>
      <span class="loan-stat-label">{p.label}</span>
    </div>
  );
}
