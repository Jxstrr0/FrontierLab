// Startup detail (SCREENS §11): profile, benchmark rosette, financials, the
// open round's two offer lots (Company | Private), venture debt, funding
// history and top shareholders. Opened from the Investment floor, convention
// panels and the List portfolio.
import { useState } from 'preact/hooks';
import { DAYS_PER_WEEK } from '../../config/balance';
import type { Startup } from '../../sim/state';
import { sectorOf } from '../../sim/ventureModel';
import { PentagonRosette, type RosetteAxes } from '../branch/loandesk/PentagonRosette';
import { Card, Panel, Row, SectionTitle, Segmented } from '../components';
import { gameDate, money, pct } from '../format/format';
import { FounderPortrait } from '../newgame/AvatarPicker';
import { closePanel, useGame } from '../store';
import { QuarterBars } from './QuarterBars';
import { StartupArt } from './StartupArt';
import { StartupFunding } from './StartupFunding';
import { advisorLine, preMoney, quarterBars, topShareholders } from './startupView';

const AXES: RosetteAxes = [
  ['Management'],
  ['Product', 'maturity'],
  ['Market', 'size'],
  ['Competitiveness'],
  ['Financial', 'health'],
];

export function StartupPanel(p: { startupId: string }) {
  const s = useGame();
  const st = s.ventures.startups[p.startupId];
  if (!st) {
    return (
      <Panel title="Startup" onClose={closePanel}>
        <p class="muted">This startup is no longer followed.</p>
      </Panel>
    );
  }
  return (
    <Panel
      title={st.name}
      subtitle={sectorOf(st.sector).label}
      icon={<StartupArt sector={st.sector} size={32} />}
      advisor={{ text: advisorLine(s, st) }}
      onClose={closePanel}
    >
      <div class="stack">
        <Profile startup={st} />
        <SectionTitle>Benchmark</SectionTitle>
        <Card>
          <PentagonRosette scores={st.pentagon} axes={AXES} label={`${st.name} benchmark`} />
        </Card>
        <Financials startup={st} />
        <StartupFunding startup={st} />
        <History startup={st} />
      </div>
    </Panel>
  );
}

function Profile(p: { startup: Startup }) {
  const s = useGame();
  const st = p.startup;
  const sym = s.settings.currency;
  return (
    <Card>
      <p class="st-desc">{st.description}</p>
      <div class="st-ceo">
        <FounderPortrait avatar={st.ceo.portrait} size={56} />
        <div>
          <div class="st-ceo-name">{st.ceo.name}</div>
          <div class="muted small">Chief executive</div>
        </div>
      </div>
      <Row label="Founded" value={String(st.founded)} />
      <Row label="Pre-money valuation" value={money(preMoney(st), sym)} strong />
      {st.stage === 'acquired' && st.exitPrice !== undefined && (
        <Row label="Sold at" value={`${money(st.exitPrice * st.shares, sym)}`} />
      )}
    </Card>
  );
}

function Financials(p: { startup: Startup }) {
  const s = useGame();
  const [mode, setMode] = useState<'income' | 'balance'>('income');
  const sym = s.settings.currency;
  const last = p.startup.quarters.at(-1);
  return (
    <>
      <SectionTitle>Financial</SectionTitle>
      <Card>
        <Segmented
          options={[
            { value: 'income', label: 'Income' },
            { value: 'balance', label: 'Balance sheet' },
          ]}
          value={mode}
          onChange={setMode}
          label="Statement"
        />
        {mode === 'income' ? (
          <>
            <Row label="Quarterly revenue" value={money(last?.revenue ?? 0, sym)} />
            <Row
              label="Net income"
              value={money(last?.netIncome ?? 0, sym)}
              tone={(last?.netIncome ?? 0) < 0 ? 'bad' : 'good'}
            />
          </>
        ) : (
          <>
            <Row label="Cash" value={money(p.startup.cash, sym)} />
            <Row label="Venture debt" value={money(p.startup.ventureDebt?.balance ?? 0, sym)} />
          </>
        )}
        <QuarterBars
          data={quarterBars(s, p.startup, mode)}
          labels={mode === 'income' ? ['Revenue', 'Net income'] : ['Cash', 'Debt']}
          format={(v) => money(v, sym)}
        />
      </Card>
    </>
  );
}

function History(p: { startup: Startup }) {
  const s = useGame();
  const sym = s.settings.currency;
  return (
    <>
      <SectionTitle>Funding history</SectionTitle>
      <Card>
        {[...p.startup.history].reverse().map((h) => (
          <Row
            label={
              <>
                {h.round}{' '}
                <span class="muted small">
                  {gameDate(s.meta.startDate, h.week * DAYS_PER_WEEK)}
                </span>
              </>
            }
            value={money(h.amount, sym)}
          />
        ))}
      </Card>
      <SectionTitle>Top shareholders</SectionTitle>
      <Card>
        {topShareholders(p.startup).map((h) => (
          <Row label={h.you ? <strong>{h.name}</strong> : h.name} value={pct(h.pct)} />
        ))}
      </Card>
    </>
  );
}
