// Menu → Portfolio (SCREENS §0.3): the company's or your private holdings from
// anywhere, without visiting the HQ Investment floor. Value with weekly change,
// the slice donut and every holding; rows open the startup or property panel.
import { useState } from 'preact/hooks';
import type { Account } from '../../sim/portfolio';
import { Card, Donut, Panel, Row, Segmented } from '../components';
import { delta, money } from '../format/format';
import { closePanel, useGame } from '../store';
import { portfolioSlices, weeklyChange } from './investmentView';
import { PortfolioList } from './PortfolioSheet';
import './investment.css';

const ACCOUNTS: { value: Account; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'personal', label: 'Private' },
];

export function PortfolioPanel() {
  const s = useGame();
  const sym = s.settings.currency;
  const [account, setAccount] = useState<Account>('company');
  const { slices, total } = portfolioSlices(s, account);
  const change = weeklyChange(s, account);
  const fmt = (v: number) => money(v, sym);
  const d = change === undefined ? undefined : delta(total, total - change, sym);
  return (
    <Panel title="Portfolio" subtitle="Stocks, ventures, buildings and more" onClose={closePanel}>
      <div class="stack">
        <Segmented options={ACCOUNTS} value={account} onChange={setAccount} label="Account" />
        <Card>
          <Row label="Portfolio value" value={fmt(total)} strong />
          {d && <Row label="This week" value={d.text} tone={d.tone} />}
          <Donut
            slices={slices}
            total={total}
            centre={fmt(total)}
            caption={account === 'company' ? 'Company' : 'Private'}
            format={fmt}
          />
        </Card>
        <PortfolioList account={account} />
        <p class="muted small">
          Buy shares at an investment bank and ventures from the HQ Investment floor or a
          convention.
        </p>
      </div>
    </Panel>
  );
}
