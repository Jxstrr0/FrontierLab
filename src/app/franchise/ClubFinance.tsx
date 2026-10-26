// SCREENS §20 owned club, Finance tab: this season's revenues (tickets,
// broadcasting, merchandise, sponsorship), expenses (payroll, operations,
// transfers) and net income, and where the money goes.
import { FRANCHISE } from '../../config/balance';
import { Card, Row, SectionTitle } from '../components';
import { moneyFull } from '../format/format';
import { useGame } from '../store';
import { financeRows, type ClubView } from './franchiseView';

export function ClubFinance({ view }: { view: ClubView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const f = financeRows(view.club);
  const bankSponsor = view.club.kit.sponsor === 'bank';
  return (
    <div class="stack">
      <SectionTitle>Revenue this season</SectionTitle>
      <Card>
        {f.revenue.map(([label, v]) => (
          <Row
            key={label}
            label={label === 'Sponsorship' && bankSponsor ? 'Sponsorship (your lab)' : label}
            value={moneyFull(v, sym)}
          />
        ))}
        <Row label="Total revenue" value={moneyFull(f.totalRevenue, sym)} strong />
      </Card>
      <SectionTitle>Expenses this season</SectionTitle>
      <Card>
        {f.expenses.map(([label, v]) => (
          <Row key={label} label={label} value={moneyFull(v, sym)} />
        ))}
        <Row label="Total expenses" value={moneyFull(f.totalExpenses, sym)} strong />
      </Card>
      <Card>
        <Row
          label="Net income"
          value={moneyFull(f.net, sym)}
          tone={f.net >= 0 ? 'good' : 'bad'}
          strong
        />
      </Card>
      <p class="muted small fr-note">
        {view.club.owner === 'company'
          ? 'The club’s income and costs go through the lab’s books each week.'
          : 'The club’s profit or loss goes to your personal cash each week.'}{' '}
        Seasons start in week {FRANCHISE.seasonStartWeek}.
      </p>
    </div>
  );
}
