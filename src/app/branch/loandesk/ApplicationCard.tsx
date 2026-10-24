// One Loan Desk application (SCREENS §5.3): the business, the ask, the rosette,
// a risk band when the branch can see one, a rate stepper and Approve / Decline.
import { useState } from 'preact/hooks';
import { WEEKS_PER_YEAR } from '../../../config/balance';
import { LOAN_SECTORS } from '../../../data/loanSectors';
import { PRODUCTS } from '../../../data/products';
import * as cmd from '../../../sim/commands';
import { acceptanceProb, riskBand } from '../../../sim/branch/loanDesk';
import type { LoanApplication } from '../../../sim/state';
import { Badge, Card, Stepper } from '../../components';
import { money, pct } from '../../format/format';
import { act, toast } from '../../store';
import { recordDecision } from './decisions';
import { PentagonRosette } from './PentagonRosette';
import { SectorIcon } from './sectorIcons';

const COLLATERAL_TEXT: Record<LoanApplication['collateral'], string> = {
  none: 'No collateral',
  partial: 'Partial collateral',
  full: 'Fully secured',
};

const BAND_BADGE = {
  low: { tone: 'good', text: 'Low risk' },
  medium: { tone: 'warn', text: 'Medium risk' },
  high: { tone: 'bad', text: 'High risk' },
} as const;

/** Weeks until the next weekly tick removes an application: 1 = this week. */
function weeksLeft(app: LoanApplication, week: number): number {
  return Math.max(1, app.expiresWeek - week);
}

function termText(weeks: number): string {
  const years = weeks / WEEKS_PER_YEAR;
  return Number.isInteger(years) ? `${years} yr` : `${weeks} wk`;
}

export function ApplicationCard(p: {
  app: LoanApplication;
  week: number;
  currency: string;
  /** The branch's current SBL price, used as the stepper's starting point. */
  defaultRate: number;
  showRiskBand: boolean;
}) {
  const { app } = p;
  const spec = PRODUCTS.sbl!;
  const [rate, setRate] = useState(p.defaultRate);
  const sector = LOAN_SECTORS.find((s) => s.id === app.sector);
  const chance = acceptanceProb(app, rate);
  const left = weeksLeft(app, p.week);
  const band = p.showRiskBand ? BAND_BADGE[riskBand(app.estPd)] : undefined;

  const approve = () => {
    const r = act(cmd.decideApplication, app.id, rate);
    if (!r.ok) return;
    if (r.accepted) {
      toast(
        `${app.business} took the ${money(app.amount, p.currency)} loan at ${pct(rate)}.`,
        'good',
      );
    } else {
      recordDecision(app.branchId, p.week, 'wentElsewhere');
      toast('They went elsewhere.', 'info');
    }
  };
  const decline = () => {
    const r = act(cmd.declineApplication, app.id);
    if (r.ok) recordDecision(app.branchId, p.week, 'declined');
  };

  return (
    <Card class="loan-app">
      <header class="loan-app-head">
        <span class="loan-app-icon">
          <SectorIcon sector={app.sector} />
        </span>
        <div class="loan-app-title">
          <h4 class="loan-app-name">{app.business}</h4>
          <div class="muted small">{sector?.name ?? app.sector}</div>
        </div>
        <span class={`chip${left <= 1 ? ' chip-warn' : ''}`}>
          {left <= 1 ? 'Expires this week' : 'Expires next week'}
        </span>
      </header>

      <div class="loan-app-ask">
        <span class="loan-app-amount">{money(app.amount, p.currency)}</span>
        <span class="muted">
          {termText(app.termWeeks)} · {COLLATERAL_TEXT[app.collateral]}
        </span>
      </div>
      <div class="loan-app-pay">
        Will pay up to <strong>{pct(app.maxRate)}</strong>
        {band && (
          <>
            {' '}
            <Badge tone={band.tone}>{band.text}</Badge>
          </>
        )}
      </div>

      <PentagonRosette scores={app.pentagon} />

      <Stepper
        label="Your rate"
        value={rate}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        format={pct}
        parse={(s) => Number(s.replace('%', '')) / 100}
        onChange={setRate}
        hint={`Chance they accept: ${Math.round(chance * 100)}%`}
      />

      <div class="btn-row loan-app-actions">
        <button type="button" class="btn btn-secondary" onClick={decline}>
          Decline
        </button>
        <button type="button" class="btn btn-primary" onClick={approve}>
          Approve
        </button>
      </div>
    </Card>
  );
}
