// Company summary (SCREENS §24): "Where to look", safety ratio and tier (with
// the lenders' credit ratio beneath), cash cover, liquidity, the main
// totals, your share price or private valuation with the cap table and your
// personal line (ShareSummary.tsx), and simplified statements, with a link to
// the full statements on the HQ Finance floor once you have one.
import { useState } from 'preact/hooks';
import { ATTENTION, FEATURES, LIQ_MIN, LIQ_REPAY_BUFFER } from '../../config/balance';
import { companyArr } from '../../sim/arr';
import { balanceSheet } from '../../sim/balanceSheet';
import { capitalSnapshot } from '../../sim/capital';
import { cashCoverWeeks, weeklyCosts } from '../../sim/cashCover';
import { safetySnapshot, tierLift } from '../../sim/safety';
import { Badge, Card, Medallion, Panel, Row, SectionTitle, Sheet } from '../components';
import { capitalRatioText, money, pct, safetyRatioText } from '../format/format';
import { RealEstateCard } from '../realEstate/RealEstateCard';
import { closePanel, openPanel, useGame } from '../store';
import { CapitalFixes } from './CapitalFixes';
import { LIQUIDITY_STATUS, liquidityGauge } from '../hq/treasury/treasuryView';
import { ComputeCard } from './ComputeCard';
import { CapitalMeter, TIER_LABEL, TIER_TONE } from './CapitalMeter';
import { ShareSummary } from './ShareSummary';
import { SafetyNotice } from './SafetyNotice';
import { Statements } from './Statements';
import { WhereToLook } from './WhereToLook';
import './company.css';

const EXPLAINERS: { title: string; body: string }[] = [
  {
    title: 'Revenue recurs, compute bills',
    body: 'Plans and apps bill every month and the API bills for what it uses, so annual recurring revenue (ARR) is the number to grow. Every seat and every million tokens runs on compute, the biggest cost under revenue.',
  },
  {
    title: 'Compute: own it or rent it',
    body: 'Offices are charged the spot price for the GPUs they use. GPUs in your data centers and reserved lots serve customers first and cost less; the rest is bought at spot, which follows the chip market. Clouds only sell so much at spot: past that you pay an emergency premium, then new customers wait, then outages start.',
  },
  {
    title: 'Safety limits growth',
    body: 'The regulator compares your Safety & Alignment floor with the risk your model carries. That safety ratio sets your tier, and the tier decides how freely you can sign new customers. Lenders price on a separate credit ratio.',
  },
  {
    title: 'Treasury reserves',
    body: 'Cash the treasury holds apart from the operating account. When enterprise contracts replaced lending, any loans still on the books were repaid into reserves.',
  },
  {
    title: 'Cash cover',
    body: 'Corporate cash pays the wages, rent and salaries. Cash cover is how many weeks of those running costs it would last. A new sales office loses money for its first couple of months, so build with cover to spare.',
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
  const safe = safetySnapshot(s);
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
      advisor={{ text: 'Grow recurring revenue; watch the compute bill.' }}
    >
      <div class="stack co-stack">
        <WhereToLook s={s} />
        <Card>
          <div class="cap-head" data-tutorial="capital-meter">
            <div>
              <div class="muted small">Safety ratio</div>
              <div class="hero-number">{safetyRatioText(safe.ratio)}</div>
            </div>
            <Badge tone={TIER_TONE[safe.tier]}>{TIER_LABEL[safe.tier]}</Badge>
          </div>
          <SafetyNotice s={s} />
          <CapitalMeter ratio={safe.ratio} tier={safe.tier} kind="safety" lift={tierLift(s)} />
          <p class="muted small cap-note">
            Safety cover {safetyRatioText(safe.strength)}, exposure ×{safe.exposure.toFixed(2)}. The
            regulator compares your Safety &amp; Alignment floor with the risk your model carries;
            the tier decides how many new customers it lets in.
          </p>
          <Row
            label="Credit ratio (lenders)"
            value={`${capitalRatioText(cap.capitalRatio)} · ${TIER_LABEL[cap.tier]}`}
            tone="dim"
          />
          <CapitalFixes tier={safe.tier} listing={s.stock.status} />
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
            sales office loses money for its first couple of months, so keep about{' '}
            {ATTENTION.cashCoverWeeks} weeks in hand before you build.
          </p>
        </Card>

        {/* C3b: liquidity only matters while an older save still holds deposits or borrowing. */}
        {(liq !== null || s.treasury.overnight > 0) && (
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
              <Row
                label="Overnight borrowing"
                value={money(s.treasury.overnight, sym)}
                tone="dim"
              />
            )}
            <p class="muted small cap-note">
              Reserves as a share of deposits: the cash you can reach in a hurry.{' '}
              {s.treasury.autoFunding
                ? 'Auto-funding holds the target by borrowing overnight, so it looks after itself.'
                : 'Auto-funding is off, so nothing tops it up when it slips.'}
            </p>
          </Card>
        )}

        <ComputeCard />

        <div>
          <SectionTitle>Totals</SectionTitle>
          <Card>
            <Row label="Assets" value={money(bs.assets, sym)} />
            <Row label="ARR" value={money(companyArr(s), sym)} />
            {s.treasury.reserves > 0 && (
              <Row label="Treasury reserves" value={money(s.treasury.reserves, sym)} />
            )}
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
