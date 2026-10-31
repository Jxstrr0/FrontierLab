// SCREENS §23 Personal Wealth (Menu → Personal wealth): your profile (portrait,
// name, "CEO, {Bank}", salary) with the rich list chip, total net worth with
// its weekly change and the Cash / Stocks / Real estate / Others donut, then
// the Stocks, Real estate and Other assets sections (WealthSections.tsx).
import { useState } from 'preact/hooks';
import { netWorthWeeklyChange } from '../../sim/personalAssets';
import { Card, Donut, Panel, Portrait, Row } from '../components';
import { delta, money } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { RichListSheet } from './RichListSheet';
import { wealthSlices } from './wealthView';
import { OtherAssets, RealEstateSection, StocksSection } from './WealthSections';
import '../investment/investment.css';
import './personal.css';

export function WealthPanel() {
  const s = useGame();
  const sym = s.settings.currency;
  const [richList, setRichList] = useState(false);
  const { slices, total } = wealthSlices(s);
  const change = netWorthWeeklyChange(s);
  const d = change === undefined ? undefined : delta(total, total - change, sym);
  const rank = s.personal.empire.richList.rank;
  const fmt = (v: number) => money(v, sym);
  return (
    <Panel
      title="Personal wealth"
      subtitle={s.meta.founderName}
      onClose={closePanel}
      advisor={{
        text: 'Your own money, kept apart from the lab’s: salary, dividends and what you buy with them.',
      }}
    >
      <div class="stack">
        <Card>
          <div class="pw-profile">
            <Portrait avatar={s.meta.founderAvatar} size={64} />
            <div class="pw-profile-text">
              <div class="pw-name">{s.meta.founderName}</div>
              <div class="muted small">CEO, {s.meta.bankName}</div>
              <div class="small">Salary {money(s.governance.ceoSalary, sym)} a year</div>
            </div>
          </div>
          <button type="button" class="pw-rank" onClick={() => setRichList(true)}>
            {rank ? `#${rank} on the Rich List` : 'Not yet on the Rich List'}
            <span class="pw-rank-more" aria-hidden="true">
              ›
            </span>
          </button>
        </Card>
        <Card>
          <Row label="Total net worth" value={fmt(total)} strong />
          {d && <Row label="This week" value={d.text} tone={d.tone} />}
          <Donut
            slices={slices.map((x) => ({ ...x, value: Math.max(0, x.value) }))}
            total={total}
            centre={fmt(total)}
            caption="Net worth"
            format={fmt}
          />
          {slices[0]!.value < 0 && (
            <p class="small tone-bad">Personal cash is overdrawn by {fmt(-slices[0]!.value)}.</p>
          )}
        </Card>
        <StocksSection />
        <RealEstateSection />
        <OtherAssets />
        <button
          type="button"
          class="btn btn-secondary btn-block"
          data-tutorial="wealth-portfolio"
          onClick={() => openPanel({ type: 'portfolio' })}
        >
          Portfolio: every holding, the lab's and yours
        </button>
      </div>
      {richList && <RichListSheet onClose={() => setRichList(false)} />}
    </Panel>
  );
}
