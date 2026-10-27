// Company ARR and lending (SCREENS §10 Products floor): a weekly line chart of
// annual recurring revenue and Loan Desk lending, with each one's latest value
// and its change on the week before.
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
          label="ARR"
          tone="ivory"
          now={t.last.totals.arr ?? 0}
          prev={t.prev?.totals.arr}
          sym={sym}
        />
        <Figure
          label="Lending"
          tone="brass"
          now={t.last.totals.loans}
          prev={t.prev?.totals.loans}
          sym={sym}
        />
      </div>
      {t.prev && <p class="muted small hq-note">Changes are on the week before.</p>}
      {t.weeks.length > 1 ? (
        <LineChart
          label="Company ARR and lending by week"
          series={[
            { label: 'ARR', values: t.arr, tone: 'ivory' },
            { label: 'Lending', values: t.loans, tone: 'brass' },
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
