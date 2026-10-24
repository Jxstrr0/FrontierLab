// Loan Desk tab of the branch panel (SCREENS §5.3, SIMULATION §11): a summary
// strip, this week's applications and the branch's booked business loans.
import { useGame } from '../store';
import { Badge, Card } from '../components';
import { money, pct } from '../format/format';
import { branchPrice } from '../../sim/branch/pricing';
import { riskBandVisible } from '../../sim/branch/loanDesk';
import { ActiveLoans } from './loandesk/ActiveLoans';
import { ApplicationCard } from './loandesk/ApplicationCard';
import { weekTally } from './loandesk/decisions';
import './loandesk/loandesk.css';

export function LoanDeskTab({ branchId }: { branchId: string }) {
  const s = useGame();
  const branch = s.branches[branchId];
  if (!branch) return <p class="muted">This branch no longer exists.</p>;

  const sym = s.settings.currency;
  const week = s.clock.week;
  const apps = Object.values(s.loanDesk.applications)
    .filter((a) => a.branchId === branchId)
    .sort((a, b) => a.expiresWeek - b.expiresWeek || b.amount - a.amount);
  const loans = Object.values(s.loanDesk.loans).filter(
    (l) => l.branchId === branchId && l.status === 'current',
  );
  const booked = s.events.log.filter(
    (e) => e.type === 'LOAN_BOOKED' && e.scope === branchId && e.week === week,
  ).length;
  const tally = weekTally(branchId, week);
  const decided = booked + tally.declined + tally.wentElsewhere;
  const rate = decided > 0 ? booked / decided : undefined;
  const balance = loans.reduce((sum, l) => sum + l.balance, 0);
  const defaulted = branch.books.sbl?.last.defaulted ?? 0;
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
        <Stat label="Applications" value={String(apps.length)} />
        <Stat label="Approved" value={String(booked)} />
        <Stat label="Declined" value={String(tally.declined)} />
        <Stat
          label="Approval rate"
          value={rate === undefined ? '–' : `${Math.round(rate * 100)}%`}
        />
        <Stat label="Loan balance" value={money(balance, sym)} />
        <Stat label="Defaults" value={defaulted > 0 ? money(defaulted, sym) : 'None'} />
      </div>
      <p class="muted small loandesk-foot">
        Each offer starts at {pct(defaultRate)}, your Small Business Loan rate.
      </p>

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

function Stat(p: { label: string; value: string }) {
  return (
    <div class="loan-stat">
      <span class="loan-stat-value">{p.value}</span>
      <span class="loan-stat-label">{p.label}</span>
    </div>
  );
}
