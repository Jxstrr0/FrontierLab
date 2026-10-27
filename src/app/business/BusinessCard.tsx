// The facts about one customer business (stage C5a, SCREENS §14b): its AI
// budget, who serves it, what the contract is worth, when it renews, and its
// pentagon. Shown on the business panel and on an employer's panel for its
// anchor account.
import { DAYS_PER_WEEK } from '../../config/balance';
import type { Business, GameState } from '../../sim/state';
import { PentagonRosette } from './PentagonRosette';
import { Card, Row } from '../components';
import { money, monthYear } from '../format/format';
import { vendorName } from './businessView';

export function BusinessCard(p: { s: GameState; b: Business }) {
  const { s, b } = p;
  const sym = s.settings.currency;
  const mine = b.vendor?.type === 'player';
  return (
    <div class="stack">
      <Card>
        <Row label="AI budget" value={`${money(b.budget, sym)} a year`} />
        <Row label="AI vendor" value={vendorName(s, b)} tone={mine ? 'good' : undefined} />
        {b.contractValue !== undefined && (
          <Row label="Contract" value={`${money(b.contractValue, sym)} a year`} />
        )}
        {b.renewalWeek !== undefined && (
          <Row label="Renews" value={monthYear(s.meta.startDate, b.renewalWeek * DAYS_PER_WEEK)} />
        )}
      </Card>
      <PentagonRosette scores={b.pentagon} label={`${b.name} profile`} />
    </div>
  );
}
