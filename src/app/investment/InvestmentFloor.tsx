// The HQ Investment floor (SCREENS §10): portfolio value with weekly change,
// a donut (Stocks, Ventures, Real estate, Venture debt), List portfolio and
// the Ventures carousel of startups that are raising.
import { portfolioBreakdown } from '../../sim/portfolio';
import { Card } from '../components';
import { money } from '../format/format';
import { useGame } from '../store';

export function InvestmentFloor() {
  const s = useGame();
  const p = portfolioBreakdown(s, 'company');
  return (
    <Card>
      <p>Portfolio value {money(p.total)}</p>
    </Card>
  );
}
