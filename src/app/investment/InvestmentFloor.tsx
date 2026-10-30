// The HQ Investment floor (SCREENS §10): portfolio value with weekly change,
// a donut (Stocks, Ventures, Real estate, Venture debt) for the
// company or your private account, List portfolio, and the Ventures carousel
// of startups that are raising (the pipeline refreshes every 4 weeks).
import { useState } from 'preact/hooks';
import { VENTURES } from '../../config/balance';
import type { Account } from '../../sim/portfolio';
import { pipelineSize } from '../../sim/ventures';
import { Card, Carousel, Donut, Row, SectionTitle, Segmented } from '../components';
import { delta, money } from '../format/format';
import { VentureCard } from '../startup/VentureCard';
import { useGame } from '../store';
import { pipelineStartups, portfolioSlices, weeklyChange } from './investmentView';
import { PortfolioSheet } from './PortfolioSheet';
import './investment.css';

const ACCOUNTS: { value: Account; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'personal', label: 'Private' },
];

export function InvestmentFloor() {
  const s = useGame();
  const sym = s.settings.currency;
  const [account, setAccount] = useState<Account>('company');
  const [listing, setListing] = useState(false);
  const { slices, total } = portfolioSlices(s, account);
  const change = weeklyChange(s, account);
  const startups = pipelineStartups(s);
  const next = s.ventures.pipelineRefreshWeek + VENTURES.pipelineEveryWeeks - s.clock.week;
  const fmt = (v: number) => money(v, sym);
  const d = change === undefined ? undefined : delta(total, total - change, sym);
  return (
    <div class="stack">
      <SectionTitle>Portfolio</SectionTitle>
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
        <button type="button" class="btn btn-secondary btn-block" onClick={() => setListing(true)}>
          List portfolio
        </button>
      </Card>

      <SectionTitle>Ventures</SectionTitle>
      {startups.length > 0 ? (
        <Carousel label="Startups raising money" class="st-carousel">
          {startups.map((st) => (
            <VentureCard startup={st} />
          ))}
        </Carousel>
      ) : (
        <Card>
          <p class="muted">No startups are raising right now.</p>
        </Card>
      )}
      <p class="muted small">
        {pipelineSize(s)} startup{pipelineSize(s) === 1 ? '' : 's'} in view · new deals in{' '}
        {Math.max(1, next)} week{Math.max(1, next) === 1 ? '' : 's'}. More staff on this floor
        widens the pipeline.
      </p>
      {listing && <PortfolioSheet account={account} onClose={() => setListing(false)} />}
    </div>
  );
}
