// Finance floor content (SCREENS §10, DESIGN §5.8.1): total revenue and net
// income with the weekly change, a 5-week bar chart, the company statements
// (Income / Balance sheet / Cash flow × Week / Quarter / Year), the credit
// ratio meter, the liquidity ratio and the risk appetite dial. Weeks a short-staffed team hasn't
// closed (statementDelayWeeks) show as "Delayed" instead of numbers.
import { runwaySnapshot } from '../../sim/runway';
import { statementDelayWeeks } from '../../sim/hq';
import { Badge, BarChart, Card, Row, SectionTitle } from '../components';
import { dayOfWeek } from '../branch/selectors';
import { RUNWAY_LABEL, RUNWAY_TONE, RunwayMeter } from '../company/RunwayMeter';
import { Statements } from '../company/Statements';
import { delta, money, pct, runwayText, shortDate } from '../format/format';
import { useGame } from '../store';

const CHART_WEEKS = 5;

export function FinanceFloor() {
  const s = useGame();
  const sym = s.settings.currency;
  const delay = statementDelayWeeks(s);
  const weekly = s.history.weekly;
  const closed = weekly.slice(0, Math.max(0, weekly.length - delay));
  const [last, prev] = [closed[closed.length - 1], closed[closed.length - 2]];
  const late = weekly.slice(closed.length);
  const chart = closed.slice(-CHART_WEEKS).map((w) => ({
    label: shortDate(s.meta.startDate, dayOfWeek(w.week)),
    revenue: w.revenue,
    income: w.netIncome,
  }));
  const runway = runwaySnapshot(s);
  const liq = s.company.liquidityRatio;

  return (
    <div class="stack">
      <SectionTitle>Results</SectionTitle>
      {last ? (
        <div class="grid-2">
          <Headline label="Total revenue" now={last.revenue} prev={prev?.revenue} sym={sym} />
          <Headline label="Net income" now={last.netIncome} prev={prev?.netIncome} sym={sym} />
        </div>
      ) : (
        <p class="muted">
          {weekly.length > 0
            ? 'The first weeks are still being closed.'
            : 'Results appear after the first weekly close.'}
        </p>
      )}
      {(chart.length > 0 || late.length > 0) && (
        <Card>
          {chart.length > 0 && <BarChart data={chart} format={(v) => money(v, sym)} />}
          {late.length > 0 && (
            <div class="hq-delayed-weeks" aria-label="Weeks not closed yet">
              {late.map((w) => (
                <span class="hq-delayed-chip">
                  {shortDate(s.meta.startDate, dayOfWeek(w.week))}: delayed
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <SectionTitle>Runway</SectionTitle>
      <Card>
        <div class="cap-head">
          <div>
            <div class="muted small">Runway (what lenders price on)</div>
            <div class="hero-number">{runwayText(runway.months)}</div>
          </div>
          <Badge tone={RUNWAY_TONE[runway.tier]}>{RUNWAY_LABEL[runway.tier]}</Badge>
        </div>
        <RunwayMeter months={runway.months} tier={runway.tier} />
        <Row
          label="Net burn"
          value={runway.burn > 0 ? `${money(runway.burn, sym)} / week` : 'None'}
          tone="dim"
        />
        <p class="muted small">
          Months of cash at the last few weeks' net loss. Lenders price your debt on it with your
          ARR; the regulator looks at the safety ratio on the Safety floor instead.
        </p>
      </Card>
      {liq !== null && (
        <Card>
          <Row label="Liquidity ratio" value={pct(liq, 1)} strong />
          <Row label="Target" value={pct(s.treasury.liqTarget, 1)} tone="dim" />
        </Card>
      )}

      <SectionTitle>Statements</SectionTitle>
      <Statements state={s} delayWeeks={delay} />
    </div>
  );
}

function Headline(p: { label: string; now: number; prev?: number; sym: string }) {
  const d = p.prev !== undefined ? delta(p.now, p.prev, p.sym) : undefined;
  return (
    <Card>
      <div class="muted small">{p.label}</div>
      <div class={`hq-headline${p.now < 0 ? ' tone-bad' : ''}`}>{money(p.now, p.sym)}</div>
      {d && <div class={`small tone-${d.tone}`}>{d.text}</div>}
    </Card>
  );
}
