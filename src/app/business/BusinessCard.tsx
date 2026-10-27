// The facts about one customer business (stage C5a, SCREENS §14b): its AI
// budget, who serves it, what the contract is worth, when it renews, and its
// pentagon. Shown on the business panel and on an employer's panel for its
// anchor account. A business with an open request at your sales office (C5b)
// links to that office's Deal Desk.
import { DAYS_PER_WEEK } from '../../config/balance';
import type { Business, GameState } from '../../sim/state';
import { PentagonRosette } from './PentagonRosette';
import { Card, Row } from '../components';
import { openPanel } from '../store';
import { money, monthYear } from '../format/format';
import { vendorName } from './businessView';

export function BusinessCard(p: { s: GameState; b: Business }) {
  const { s, b } = p;
  const sym = s.settings.currency;
  const mine = b.vendor?.type === 'player';
  const rfp = Object.values(s.dealDesk.rfps).find((r) => r.businessId === b.id);
  const office = rfp ? s.branches[rfp.branchId] : undefined;
  return (
    <div class="stack">
      <Card>
        <Row label="AI budget" value={`${money(b.budget, sym)} a year`} />
        <Row label="AI vendor" value={vendorName(s, b)} tone={mine ? 'good' : undefined} />
        {b.contractValue !== undefined && (
          <Row
            label={mine ? 'Your contract' : 'Contract'}
            value={`${money(b.contractValue, sym)} a year`}
            tone={mine ? 'good' : undefined}
          />
        )}
        {b.renewalWeek !== undefined && (
          <Row label="Renews" value={monthYear(s.meta.startDate, b.renewalWeek * DAYS_PER_WEEK)} />
        )}
      </Card>
      {rfp && office && (
        <Card>
          <p class="muted small">
            {rfp.kind === 'new'
              ? `${b.name} has asked your ${office.name} office for a proposal.`
              : `This contract's renewal is open on your ${office.name} office's Deal Desk.`}
          </p>
          <button
            type="button"
            class="btn btn-secondary btn-block"
            onClick={() => openPanel({ type: 'branch', branchId: office.id, tab: 'loandesk' })}
          >
            Open the Deal Desk
          </button>
        </Card>
      )}
      <PentagonRosette scores={b.pentagon} label={`${b.name} profile`} />
    </div>
  );
}
