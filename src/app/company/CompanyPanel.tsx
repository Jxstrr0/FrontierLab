// Company summary (SCREENS §24): "Where to look", corporate cash with its
// runway meter and running costs, safety ratio and tier, compute, the main
// totals, your share price or private valuation with the cap table and your
// personal line (ShareSummary.tsx), and simplified statements, with a link to
// the full statements on the HQ Finance floor once you have one.
import { useState } from 'preact/hooks';
import { FEATURES, RUNWAY } from '../../config/balance';
import { FRONTIER_PROJECT_LIST } from '../../data/frontierProjects';
import { MILESTONES } from '../../data/milestones';
import { companyArr } from '../../sim/arr';
import { balanceSheet } from '../../sim/balanceSheet';
import { weeklyCosts } from '../../sim/cashCover';
import { runwaySnapshot } from '../../sim/runway';
import { safetySnapshot, tierLift } from '../../sim/safety';
import { Badge, Card, Medallion, Panel, Row, SectionTitle, Sheet } from '../components';
import { money, runwayText, safetyRatioText } from '../format/format';
import { RealEstateCard } from '../realEstate/RealEstateCard';
import { closePanel, openPanel, useGame } from '../store';
import { CapitalFixes } from './CapitalFixes';
import { ComputeCard } from './ComputeCard';
import { RUNWAY_LABEL, RUNWAY_TONE, RunwayMeter } from './RunwayMeter';
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
    body: 'The regulator compares your Safety & Alignment floor with the risk your model carries. That safety ratio sets your tier, and the tier decides how freely you can sign new customers.',
  },
  {
    title: 'Runway',
    body: 'Corporate cash pays the wages, rent, salaries and the compute bill. Runway is how many months it lasts at the last few weeks’ net loss; lenders price your debt on it. A new sales office loses money for its first couple of months, so build with runway to spare.',
  },
];

export function CompanyPanel() {
  const s = useGame();
  const [learn, setLearn] = useState(false);
  const sym = s.settings.currency;
  const runway = runwaySnapshot(s);
  const safe = safetySnapshot(s);
  const bs = balanceSheet(s);
  const costs = weeklyCosts(s);

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
          <div class="cap-head">
            <div>
              <div class="muted small">Corporate cash</div>
              <div class={`hero-number${s.company.cash < 0 ? ' tone-bad' : ''}`}>
                {money(s.company.cash, sym)}
              </div>
            </div>
            <Badge tone={RUNWAY_TONE[runway.tier]}>{RUNWAY_LABEL[runway.tier]} runway</Badge>
          </div>
          <Row label="Runway" value={runwayText(runway.months)} strong />
          <RunwayMeter months={runway.months} tier={runway.tier} />
          <p class="muted small cap-note">
            Months the cash lasts at the last few weeks' net loss. Lenders price your debt on it,
            and buybacks, buyouts and your CFO's buying need at least {RUNWAY.gateMonths} months
            left after the spend.
          </p>
          <Row
            label="Running costs"
            value={costs > 0 ? `${money(costs, sym)} / week` : 'Measuring'}
            tone="dim"
          />
        </Card>

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
          <CapitalFixes tier={safe.tier} listing={s.stock.status} />
          {FEATURES.hq && s.departments.risk && (
            <button
              type="button"
              class="btn btn-secondary btn-block"
              onClick={() => openPanel({ type: 'hq', dept: 'risk' })}
            >
              Details on the Safety floor
            </button>
          )}
        </Card>

        <ComputeCard />

        <div>
          <SectionTitle>Totals</SectionTitle>
          <Card>
            <Row label="Assets" value={money(bs.assets, sym)} />
            <Row label="ARR" value={money(companyArr(s), sym)} />
            <Row label="Equity" value={money(bs.equity, sym)} strong />
          </Card>
        </div>

        {FEATURES.capitalMarkets && <ShareSummary s={s} />}

        {FEATURES.investments && <RealEstateCard />}

        <button type="button" class="btn btn-secondary btn-block" onClick={() => setLearn(true)}>
          How this works
        </button>

        <div>
          <SectionTitle>Goals</SectionTitle>
          <div class="co-goals">
            <button
              type="button"
              class="btn btn-secondary btn-block"
              data-tutorial="company-milestones"
              onClick={() => openPanel({ type: 'milestones' })}
            >
              Milestones · {Object.keys(s.milestones).length} of {MILESTONES.length}
            </button>
            <button
              type="button"
              class="btn btn-secondary btn-block"
              data-tutorial="company-projects"
              onClick={() => openPanel({ type: 'projects' })}
            >
              Frontier projects · {s.projects.done.length} of {FRONTIER_PROJECT_LIST.length}
            </button>
          </div>
        </div>

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
