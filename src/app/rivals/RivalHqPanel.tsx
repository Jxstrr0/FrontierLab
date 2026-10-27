// Rival lab head office panel (SCREENS §7): who they are (strategy, sales
// offices, cities, listing, ARR and growth, cash and runway band, model,
// researchers, CEO, recent quarters). Rival labs do not lend to you; corporate
// borrowing lives on the investment bank Debt tab (SIMULATION §19.9).
import { CITIES } from '../../data/cities';
import { DISTRICT_SPECS } from '../../data/districts';
import { RIVAL_BENCH_LABEL } from '../../data/rivals';
import { previousQuarter } from '../../sim/calendar';
import { rivalArr, rivalCustomers, rivalGrowth } from '../../sim/rivalFinance';
import { rivalSharePrice } from '../../sim/rivalQuarter';
import { rivalResearchers } from '../../sim/talent';
import type { GameState, RivalBank } from '../../sim/state';
import { Badge, Card, Medallion, Panel, Row, SectionTitle } from '../components';
import { count, money, signedPct } from '../format/format';
import { closePanel, useGame } from '../store';
import { RivalHqArt } from './RivalArt';
import {
  failedText,
  rivalTier,
  runwayText,
  STRATEGY_BLURB,
  STRATEGY_LABEL,
  TIER_LABEL,
  TIER_TONE,
} from './rivalSelectors';
import './rivals.css';

export function RivalHqPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const bank = site ? s.rivals[site.refId] : undefined;
  if (!site || !bank) {
    return (
      <Panel title="Rival head office" onClose={closePanel}>
        <p class="muted">That building is no longer on the map.</p>
      </Panel>
    );
  }
  const district = DISTRICT_SPECS[site.district]?.name;
  const failed = failedText(s, bank);
  return (
    <Panel
      title={`${bank.name} head office`}
      subtitle={[site.address, district].filter(Boolean).join(' · ')}
      icon={<Medallion ink={bank.ink} monogram={bank.monogram} size={32} />}
      onClose={closePanel}
      advisor={{ text: `${bank.name} head office. Know your competition.` }}
      hero={<RivalHqArt bank={bank} />}
    >
      <div class="stack">
        {failed && (
          <p class="rv-notice small" role="status">
            {failed}
          </p>
        )}
        <Overview s={s} bank={bank} />
      </div>
    </Panel>
  );
}

/** Labels for the last n reported quarters, oldest first ("Q4 2027"). */
function quarterLabels(s: GameState, n: number): string[] {
  let { year, q } = previousQuarter(s.meta.startDate, s.clock.day);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`Q${q} ${year}`);
    q = q === 1 ? 4 : ((q - 1) as 1 | 2 | 3);
    if (q === 4) year -= 1;
  }
  return out;
}

/** "this week" / "N weeks ago" for a model's release. */
function releasedText(weeks: number): string {
  if (weeks <= 0) return 'This week';
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

function Overview(p: { s: GameState; bank: RivalBank }) {
  const { s, bank } = p;
  const sym = s.settings.currency;
  const tier = rivalTier(bank);
  const active = bank.status === 'active';
  const cities = bank.cities.map((id) => CITIES[id]?.name ?? id).join(', ');
  const researchers = rivalResearchers(s, bank.id);
  const recent = bank.quarters.slice(-4);
  const labels = quarterLabels(s, recent.length);
  return (
    <>
      <Card>
        <div class="rv-head">
          <Medallion ink={bank.ink} monogram={bank.monogram} size={44} />
          <div>
            <div class="rv-strategy">{STRATEGY_LABEL[bank.strategy]}</div>
            <div class="muted small">{STRATEGY_BLURB[bank.strategy]}</div>
          </div>
        </div>
        <Row label="Sales offices" value={count(bank.branches.length)} />
        <Row label="Cities" value={cities || '—'} />
        <Row label="Shares" value={bank.listed ? `Listed · ${bank.ticker ?? ''}` : 'Private'} />
        {bank.listed && active && (
          <Row label="Share price" value={money(rivalSharePrice(bank), sym)} />
        )}
        {active && <Row label="Customers" value={count(Math.round(rivalCustomers(bank)))} />}
        {active && (
          <Row
            label="ARR"
            value={`${money(rivalArr(bank), sym)}${bank.quarters.length >= 2 ? ` · ${signedPct(rivalGrowth(bank), 0)} a year` : ''}`}
          />
        )}
        {active && <Row label="Cash" value={money(bank.cash, sym)} />}
        <Row
          label="Runway"
          value={
            active ? (
              <span class="rv-capital">
                <Badge tone={TIER_TONE[tier]}>{TIER_LABEL[tier]}</Badge>
                <span>{runwayText(bank)}</span>
              </span>
            ) : (
              <Badge tone="bad">Failed</Badge>
            )
          }
        />
        {bank.model && (
          <Row label="AI model" value={`${bank.model.name} · ${bank.model.quality.toFixed(1)}`} />
        )}
        {bank.model && (
          <Row
            label="Model released"
            value={releasedText(s.clock.week - bank.model.releasedWeek)}
          />
        )}
        <Row
          label="Researchers"
          value={
            researchers.length === 0
              ? 'None'
              : `${researchers.length} · ${researchers.reduce((n, r) => n + r.stars, 0)} stars in total`
          }
        />
        <Row label="Chief executive" value={bank.ceo || '—'} />
        {bank.execs.map((e) => (
          <Row key={e.title} label={RIVAL_BENCH_LABEL[e.title] ?? e.title} value={e.name || '—'} />
        ))}
      </Card>
      {recent.length > 0 && (
        <section>
          <SectionTitle>Recent quarters</SectionTitle>
          <Card>
            <div class="rv-q rv-q-head">
              <span>Quarter</span>
              <span>Revenue</span>
              <span>Net income</span>
            </div>
            {recent.map((q, i) => (
              <div class="rv-q">
                <span class="muted">{labels[i]}</span>
                <span>{money(q.revenue, sym)}</span>
                <span class={q.netIncome < 0 ? 'tone-bad' : ''}>{money(q.netIncome, sym)}</span>
              </div>
            ))}
          </Card>
        </section>
      )}
    </>
  );
}
