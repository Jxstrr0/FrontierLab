// The annual report (owner's review A5, SCREENS §21b): a Weekly Inference front
// page at each year end, opened after the results. A headline picked from the
// year (src/sim/annualReport.ts), the year's figures against the year before,
// the milestones reached, and your place on the rich list. Every tenth year it
// becomes the decade in review: yearly revenue and income bars and a then-and-now
// table. Old reports reopen from the Ledger archive.
import { ANNUAL_REPORT, DAYS_PER_WEEK } from '../../config/balance';
import { MILESTONES } from '../../data/milestones';
import { annualText, isDecade, yearFacts } from '../../sim/annualReport';
import type { YearReport } from '../../sim/state';
import { TIER_LABEL } from '../company/CapitalMeter';
import { BarChart, Medallion, Modal } from '../components';
import { count, gameDate, money } from '../format/format';
import { modal, useGame } from '../store';
import { Masthead } from './LedgerCard';
import './weekly.css';

interface FigureRow {
  label: string;
  show: (r: YearReport) => string;
}

function rows(sym: string): FigureRow[] {
  return [
    { label: 'Revenue', show: (r) => money(r.revenue, sym) },
    { label: 'Net income', show: (r) => money(r.netIncome, sym) },
    { label: 'Recurring revenue (ARR)', show: (r) => money(r.arr, sym) },
    { label: 'Valuation', show: (r) => money(r.value, sym) },
    { label: 'Sales offices', show: (r) => count(r.offices) },
    { label: 'Customers', show: (r) => count(r.customers) },
    { label: 'Model quality', show: (r) => r.quality.toFixed(1) },
    { label: 'Safety', show: (r) => TIER_LABEL[r.tier] },
    { label: 'Your net worth', show: (r) => money(r.worth, sym) },
    { label: 'Rich list', show: (r) => (r.rank !== undefined ? `#${r.rank}` : 'Not listed') },
  ];
}

/** The figures for `cur`, with a second column for `then` when there is one. */
function FigureTable(p: { cur: YearReport; then?: YearReport; sym: string; caption: string }) {
  return (
    <table class="annual-table" aria-label={p.caption}>
      <thead>
        <tr>
          <td />
          {p.then && <th scope="col">{p.then.year}</th>}
          <th scope="col">{p.cur.year}</th>
        </tr>
      </thead>
      <tbody>
        {rows(p.sym).map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {p.then && <td class="annual-then">{row.show(p.then)}</td>}
            <td>{row.show(p.cur)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** "a, b and c". */
function listText(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function AnnualReport(p: { year?: number }) {
  const s = useGame();
  const sym = s.settings.currency;
  const reports = s.history.yearly;
  const i = p.year === undefined ? reports.length - 1 : reports.findIndex((r) => r.year === p.year);
  const cur = reports[i];
  const close = () => (modal.value = null);
  if (!cur) return null;
  const prev = i > 0 ? reports[i - 1] : undefined;
  const names = { bank: s.meta.bankName, founder: s.meta.founderName };
  const text = annualText(cur, prev, names, yearFacts(s, cur, prev));
  const decade = isDecade(cur);
  const span = reports.slice(Math.max(0, i - ANNUAL_REPORT.decadeYears + 1), i + 1);
  const date = gameDate(s.meta.startDate, (cur.endWeek + 1) * DAYS_PER_WEEK);
  // Milestones carry the week they were reached; each year owns (last end, this end] + 1.
  const fromWeek = prev ? prev.endWeek + 1 : -1;
  const reached = MILESTONES.filter((m) => {
    const w = s.milestones[m.id];
    return w !== undefined && w > fromWeek && w <= cur.endWeek + 1;
  }).map((m) => m.title);
  const shown = reached.slice(0, ANNUAL_REPORT.milestonesShown);
  const more = reached.length - shown.length;

  return (
    <Modal
      title={decade ? 'The decade in review' : `Annual report ${cur.year}`}
      class="weekly-modal annual-modal"
      onClose={close}
      icon={
        <Medallion
          ink={s.meta.brandInk}
          monogram={s.meta.monogram}
          shape={s.meta.logoShape}
          size={30}
        />
      }
      footer={
        <button type="button" class="btn btn-primary btn-block" onClick={close}>
          Continue
        </button>
      }
    >
      <section class={`ledger ledger-press${s.settings.reducedMotion ? ' is-reduced' : ''}`}>
        <Masthead
          date={date}
          edition={decade ? `Decade edition · year ${cur.n}` : `Annual edition · year ${cur.n}`}
        />
        <h4 class="frontpage-headline">{text.headline}</h4>
        <p class="frontpage-standfirst">{text.standfirst}</p>
        <div class="frontpage-story">
          <p>
            {names.bank} ends {cur.year} with {money(cur.arr, sym)} in recurring revenue across{' '}
            {cur.offices} {cur.offices === 1 ? 'sales office' : 'sales offices'}, and the market
            values the lab at {money(cur.value, sym)}.
          </p>
          {shown.length > 0 && (
            <p>
              Milestones reached this year: {listText(shown)}
              {more > 0 ? `, and ${more} more` : ''}.
            </p>
          )}
          <p>
            {names.founder} is worth {money(cur.worth, sym)}
            {cur.rank !== undefined
              ? `, ${cur.rank === 1 ? 'top of' : `number ${cur.rank} on`} the rich list.`
              : ', not yet rich enough for the rich list.'}
          </p>
        </div>
        {decade && span.length > 1 && (
          <div class="annual-decade">
            <h5 class="annual-subhead">Revenue and net income by year</h5>
            <BarChart
              label="Yearly revenue and net income"
              unit="year"
              data={span.map((r) => ({
                label: `’${String(r.year).slice(-2)}`,
                revenue: r.revenue,
                income: r.netIncome,
              }))}
              format={(v) => money(v, sym)}
            />
            <h5 class="annual-subhead">Then and now</h5>
            <FigureTable cur={cur} then={span[0]} sym={sym} caption="Then and now" />
          </div>
        )}
        {!decade && (
          <div class="annual-figures">
            <h5 class="annual-subhead">The year in figures</h5>
            <FigureTable cur={cur} then={prev} sym={sym} caption={`${cur.year} in figures`} />
          </div>
        )}
      </section>
    </Modal>
  );
}
