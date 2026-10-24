// Company deposits and loans (SCREENS §10 Products floor): a weekly line chart
// of total deposits and loans with each one's latest balance and its change
// on the week before.
import { Card, LineChart } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { delta, money, shortDate } from '../../format/format';
import { useGame } from '../../store';
import { trendSeries } from './productSelectors';

/** Weeks of history in the chart (about half a year). */
const TREND_WEEKS = 26;

export function CompanyTrend() {
  const s = useGame();
  const sym = s.settings.currency;
  const t = trendSeries(s.history.weekly, TREND_WEEKS);
  if (!t.last) {
    return (
      <Card>
        <p class="muted small hq-note">The trend appears after the first weekly close.</p>
      </Card>
    );
  }
  const date = (week: number) => shortDate(s.meta.startDate, dayOfWeek(week));
  return (
    <Card>
      <div class="grid-2">
        <Figure
          label="Deposits"
          tone="ivory"
          now={t.last.totals.deposits}
          prev={t.prev?.totals.deposits}
          sym={sym}
        />
        <Figure
          label="Loans"
          tone="brass"
          now={t.last.totals.loans}
          prev={t.prev?.totals.loans}
          sym={sym}
        />
      </div>
      {t.prev && <p class="muted small hq-note">Changes are on the week before.</p>}
      {t.weeks.length > 1 ? (
        <LineChart
          label="Company deposits and loans by week"
          series={[
            { label: 'Deposits', values: t.deposits, tone: 'ivory' },
            { label: 'Loans', values: t.loans, tone: 'brass' },
          ]}
          startLabel={date(t.weeks[0]!)}
          endLabel={date(t.weeks[t.weeks.length - 1]!)}
        />
      ) : (
        <p class="muted small hq-note">The chart fills in from the second week.</p>
      )}
    </Card>
  );
}

function Figure(p: {
  label: string;
  tone: 'ivory' | 'brass';
  now: number;
  prev?: number;
  sym: string;
}) {
  const d = p.prev !== undefined ? delta(p.now, p.prev, p.sym) : undefined;
  return (
    <div>
      <div class={`muted small lg-line lg-line-${p.tone}`}>{p.label}</div>
      <div class="hq-headline">{money(p.now, p.sym)}</div>
      {d && <div class={`small tone-${d.tone}`}>{d.text}</div>}
    </div>
  );
}
