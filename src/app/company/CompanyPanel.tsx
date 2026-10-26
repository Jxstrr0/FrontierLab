// Company summary (SCREENS §24): "Where to look", capital ratio and tier, cash cover, liquidity, the main
// totals, your share price or private valuation with the cap table and your
// personal line (ShareSummary.tsx), and simplified statements, with a link to
// the full statements on the HQ Finance floor once you have one.
import { useState } from 'preact/hooks';
import { ATTENTION, FEATURES, LIQ_MIN, LIQ_REPAY_BUFFER } from '../../config/balance';
import { balanceSheet } from '../../sim/balanceSheet';
import { capitalSnapshot } from '../../sim/capital';
import { cashCoverWeeks, weeklyCosts } from '../../sim/cashCover';
import { Badge, Card, Medallion, Panel, Row, SectionTitle, Sheet } from '../components';
import { capitalRatioText, money, pct } from '../format/format';
import { RealEstateCard } from '../realEstate/RealEstateCard';
import { closePanel, openPanel, useGame } from '../store';
import { CapitalFixes } from './CapitalFixes';
import { LIQUIDITY_STATUS, liquidityGauge } from '../hq/treasury/treasuryView';
import { CapitalMeter, TIER_LABEL, TIER_TONE } from './CapitalMeter';
import { ShareSummary } from './ShareSummary';
import { Statements } from './Statements';
import { WhereToLook } from './WhereToLook';
import './company.css';

const EXPLAINERS: { title: string; body: string }[] = [
  {
    title: 'Deposits fund loans',
    body: 'Every deposit your branches take in becomes money Treasury can lend or hold. More deposits mean more room to lend.',
  },
  {
    title: 'Capital limits growth',
    body: 'Capital is what the lab owns after its debts. The regulator compares it with your risky assets, and the tier decides how freely you can grow.',
  },
  {
    title: 'Liquidity keeps the doors open',
    body: 'Reserves and government bonds are cash you can reach quickly. With auto-funding on, Treasury borrows overnight to hold your target; only a fall under the 10% minimum costs reputation.',
  },
  {
    title: 'Cash cover',
    body: 'Corporate cash pays the wages, rent and salaries. Cash cover is how many weeks of those running costs it would last. A new branch loses money for its first couple of months, so build with cover to spare.',
  },
];

/** 0.4 → "Under 1 week", 7.6 → "7 weeks", 52+ → "A year or more". */
export function coverText(weeks: number): string {
  if (weeks < 1) return 'Under 1 week';
  if (weeks >= 52) return 'A year or more';
  const n = Math.floor(weeks);
  return `${n} week${n === 1 ? '' : 's'}`;
}

export function CompanyPanel() {
  const s = useGame();
  const [learn, setLearn] = useState(false);
  const sym = s.settings.currency;
  const cap = capitalSnapshot(s);
  const bs = balanceSheet(s);
  const liq = s.company.liquidityRatio;
  const gauge = liquidityGauge(liq, LIQ_MIN, s.treasury.liqTarget, LIQ_REPAY_BUFFER);
  const liqStatus = LIQUIDITY_STATUS[gauge.status];
  const costs = weeklyCosts(s);
  const cover = cashCoverWeeks(s);
  const coverTone = cover === null ? 'dim' : cover < ATTENTION.cashCoverWeeks ? 'bad' : 'good';

  return (
    <Panel
      title="Company"
      subtitle={s.meta.bankName}
      icon={
        <Medallion
          ink={s.meta.brandInk}
          monogram={s.meta.monogram}
          shape={s.meta.logoShape}
          size={30}
        />
      }
      onClose={closePanel}
      advisor={{ text: 'Deposits fund loans; capital limits growth.' }}
    >
      <div class="stack co-stack">
        <WhereToLook s={s} />
        <Card>
          <div class="cap-head" data-tutorial="capital-meter">
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
          <CapitalFixes tier={cap.tier} listing={s.stock.status} />
        </Card>

        <Card>
          <div class="cap-head">
            <div>
              <div class="muted small">Corporate cash</div>
              <div class={`hero-number${s.company.cash < 0 ? ' tone-bad' : ''}`}>
                {money(s.company.cash, sym)}
              </div>
            </div>
          </div>
          <Row
            label="Running costs"
            value={costs > 0 ? `${money(costs, sym)} / week` : 'Measuring'}
            tone="dim"
          />
          <Row
            label="Cash cover"
            value={cover === null ? '—' : coverText(cover)}
            tone={coverTone}
            strong
          />
          <p class="muted small cap-note">
            How long cash would pay the wages, rent and salaries at the last few weeks' pace. A new
            branch loses money for its first couple of months, so keep about{' '}
            {ATTENTION.cashCoverWeeks} weeks in hand before you build.
          </p>
        </Card>

        <Card>
          <div class="cap-head">
            <div>
              <div class="muted small">Liquidity ratio</div>
              <div class="hero-number">{liq === null ? '—' : pct(Math.max(0, liq), 1)}</div>
            </div>
            <Badge tone={liqStatus.tone}>{liqStatus.label}</Badge>
          </div>
          <Row label="Target" value={pct(s.treasury.liqTarget, 1)} tone="dim" />
          {s.treasury.overnight > 0 && (
            <Row label="Overnight borrowing" value={money(s.treasury.overnight, sym)} tone="dim" />
          )}
          <p class="muted small cap-note">
            Reserves and bonds as a share of deposits: the cash you can reach in a hurry.{' '}
            {s.treasury.autoFunding
              ? 'Auto-funding holds the target by borrowing overnight, so it looks after itself.'
              : 'Auto-funding is off, so nothing tops it up when it slips.'}
          </p>
        </Card>

        <div>
          <SectionTitle>Totals</SectionTitle>
          <Card>
            <Row label="Assets" value={money(bs.assets, sym)} />
            <Row label="Deposits" value={money(bs.deposits, sym)} />
            <Row label="Loans" value={money(bs.loans, sym)} />
            <Row label="Equity" value={money(bs.equity, sym)} strong />
          </Card>
        </div>

        {FEATURES.capitalMarkets && <ShareSummary s={s} />}

        {FEATURES.investments && <RealEstateCard />}

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
