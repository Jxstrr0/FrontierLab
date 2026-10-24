// Company summary (SCREENS §24): capital ratio and tier, liquidity, the main
// totals, your share price or private valuation with the cap table and your
// personal line (ShareSummary.tsx), and simplified statements, with a link to
// the full statements on the HQ Finance floor once you have one.
import { useState } from 'preact/hooks';
import { FEATURES } from '../../config/balance';
import { balanceSheet } from '../../sim/balanceSheet';
import { capitalSnapshot } from '../../sim/capital';
import { Badge, Card, Medallion, Panel, Row, SectionTitle, Sheet } from '../components';
import { capitalRatioText, money, pct } from '../format/format';
import { closePanel, openPanel, useGame } from '../store';
import { CapitalMeter, TIER_LABEL, TIER_TONE } from './CapitalMeter';
import { ShareSummary } from './ShareSummary';
import { Statements } from './Statements';
import './company.css';

const EXPLAINERS: { title: string; body: string }[] = [
  {
    title: 'Deposits fund loans',
    body: 'Every deposit your branches take in becomes money Treasury can lend or hold. More deposits mean more room to lend.',
  },
  {
    title: 'Capital limits growth',
    body: 'Capital is what the bank owns after its debts. The regulator compares it with your risky assets, and the tier decides how freely you can grow.',
  },
  {
    title: 'Liquidity keeps the doors open',
    body: 'Reserves and government bonds are cash you can reach quickly. If they run too low, Treasury borrows, and borrowing costs money and reputation.',
  },
];

export function CompanyPanel() {
  const s = useGame();
  const [learn, setLearn] = useState(false);
  const sym = s.settings.currency;
  const cap = capitalSnapshot(s);
  const bs = balanceSheet(s);
  const liq = s.company.liquidityRatio;

  return (
    <Panel
      title="Company"
      subtitle={s.meta.bankName}
      icon={<Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} size={30} />}
      onClose={closePanel}
      advisor={{ text: 'Deposits fund loans; capital limits growth.' }}
    >
      <div class="stack co-stack">
        <Card>
          <div class="cap-head">
            <div>
              <div class="muted small">Capital ratio</div>
              <div class="hero-number">{capitalRatioText(cap.capitalRatio)}</div>
            </div>
            <Badge tone={TIER_TONE[cap.tier]}>{TIER_LABEL[cap.tier]}</Badge>
          </div>
          <CapitalMeter ratio={cap.capitalRatio} tier={cap.tier} />
          <p class="muted small cap-note">
            Capital divided by risk-weighted assets. Higher tiers cost less to fund; the lowest
            tiers stop lending and growth.
            {cap.capitalRatio > 1 &&
              ' With few loans on the books yet, almost nothing you hold carries risk, so the ratio is off the scale. It settles as lending grows.'}
          </p>
        </Card>

        <Card>
          <Row
            label="Liquidity ratio"
            value={liq === null ? 'No deposits yet' : pct(liq, 1)}
            strong
          />
          <Row label="Target" value={pct(s.treasury.liqTarget, 1)} tone="dim" />
          <p class="muted small cap-note">
            Reserves and bonds as a share of deposits: the cash you can reach in a hurry.
          </p>
        </Card>

        <div>
          <SectionTitle>Totals</SectionTitle>
          <Card>
            <Row label="Assets" value={money(bs.assets, sym)} />
            <Row label="Deposits" value={money(bs.deposits, sym)} />
            <Row label="Loans" value={money(bs.loans, sym)} />
            <Row label="Equity" value={money(bs.equity, sym)} strong />
            <Row label="Corporate cash" value={money(s.company.cash, sym)} />
          </Card>
        </div>

        {FEATURES.capitalMarkets && <ShareSummary s={s} />}

        <button type="button" class="btn btn-secondary btn-block" onClick={() => setLearn(true)}>
          How this works
        </button>

        <div>
          <SectionTitle>Statements</SectionTitle>
          {FEATURES.hq && (
            <button
              type="button"
              class="btn btn-secondary btn-block co-hq-link"
              onClick={() =>
                openPanel(s.departments.finance ? { type: 'hq', dept: 'finance' } : { type: 'hq' })
              }
            >
              {s.departments.finance ? 'Full statements on the Finance floor' : 'Open HQ'}
            </button>
          )}
          <Statements state={s} />
        </div>
      </div>
      {learn && (
        <Sheet title="How this works" onClose={() => setLearn(false)}>
          <div class="stack co-stack">
            {EXPLAINERS.map((e) => (
              <div key={e.title}>
                <h4 class="explain-title">{e.title}</h4>
                <p class="explain-body">{e.body}</p>
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </Panel>
  );
}
