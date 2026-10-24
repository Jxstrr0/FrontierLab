// Branch Finance tab (SCREENS §5.5): last week's revenue and income with the
// change, a 5-week bar chart, the branch income statement (SIMULATION §12 line
// groups) for a week, quarter or year, balances, and Rename / Close branch.
import { allProducts } from '../../sim/products';
import { useState } from 'preact/hooks';
import { BRANCH_NAME_MAX } from '../../config/balance';
import * as cmd from '../../sim/commands';
import type { Branch } from '../../sim/state';
import { BarChart, Card, Row, SectionTitle, Segmented, Sheet } from '../components';
import { count, delta, figure, money, shortDate } from '../format/format';
import { act, useGame } from '../store';
import { CloseBranch } from './CloseBranch';
import {
  branchBalances,
  dayOfWeek,
  EXPENSE_LINES,
  PERIOD_WEEKS,
  REVENUE_LINES,
  sumPnl,
  type Period,
} from './selectors';

const CHART_WEEKS = 5;
const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

export function FinanceTab({ branch }: { branch: Branch }) {
  const s = useGame();
  const sym = s.settings.currency;
  const [period, setPeriod] = useState<Period>('week');
  const [renaming, setRenaming] = useState(false);
  const [last, prev] = [branch.pnl[branch.pnl.length - 1], branch.pnl[branch.pnl.length - 2]];
  const chart = branch.pnl.slice(-CHART_WEEKS).map((r) => ({
    label: shortDate(s.meta.startDate, dayOfWeek(r.week)),
    revenue: r.revenue,
    income: r.income,
  }));
  const bal = branchBalances(s, branch, allProducts(s));

  return (
    <div class="stack">
      {last ? (
        <div class="grid-2 br-headlines">
          <Headline label="Branch revenue" now={last.revenue} prev={prev?.revenue} sym={sym} />
          <Headline label="Branch income" now={last.income} prev={prev?.income} sym={sym} />
        </div>
      ) : (
        <p class="muted">No results yet. The first week closes after the doors open.</p>
      )}
      {chart.length > 0 && (
        <Card>
          <BarChart data={chart} format={(v) => money(v, sym)} />
        </Card>
      )}

      <SectionTitle>Income statement</SectionTitle>
      <Segmented label="Statement period" options={PERIODS} value={period} onChange={setPeriod} />
      <Statement branch={branch} period={period} />

      <SectionTitle>Balances</SectionTitle>
      <Card>
        <Row label="Deposits" value={money(bal.deposits, sym)} />
        <Row label="Loans" value={money(bal.loans, sym)} />
        {bal.aum > 0 && <Row label="Assets under management" value={money(bal.aum, sym)} />}
        <Row label="Customers" value={count(bal.customers)} />
      </Card>

      <div class="grid-2 br-footer">
        <button type="button" class="btn btn-secondary btn-block" onClick={() => setRenaming(true)}>
          Rename branch
        </button>
        <CloseBranch branch={branch} />
      </div>
      {renaming && <RenameSheet branch={branch} onClose={() => setRenaming(false)} />}
    </div>
  );
}

function Headline(p: { label: string; now: number; prev?: number; sym: string }) {
  const d = p.prev !== undefined ? delta(p.now, p.prev, p.sym) : undefined;
  return (
    <Card>
      <div class="muted small">{p.label}</div>
      <div class={`br-headline${p.now < 0 ? ' tone-bad' : ''}`}>{money(p.now, p.sym)}</div>
      {d && <div class={`small tone-${d.tone}`}>{d.text}</div>}
    </Card>
  );
}

function Statement({ branch, period }: { branch: Branch; period: Period }) {
  const want = PERIOD_WEEKS[period];
  const t = sumPnl(branch.pnl, want);
  const line = (v: number | undefined) => figure(v ?? 0);
  return (
    <Card class="br-statement">
      <div class="br-statement-head muted small">
        <span>
          {t.weeks === 0
            ? 'No weeks yet'
            : t.weeks < want
              ? `Last ${t.weeks} ${t.weeks === 1 ? 'week' : 'weeks'} on record`
              : want === 1
                ? 'Last week'
                : `Last ${want} weeks`}
        </span>
      </div>
      <div class="br-statement-group">Revenues</div>
      {REVENUE_LINES.map(([k, label]) => (
        <Row label={label} value={line(t.lines[k])} />
      ))}
      <Row label="Total revenue" value={figure(t.revenue)} strong />
      <div class="br-statement-group">Expenses</div>
      {EXPENSE_LINES.map(([k, label]) => (
        <Row label={label} value={line(t.lines[k])} />
      ))}
      <Row label="Total expenses" value={figure(t.expenses)} strong />
      <Row
        label="Branch income"
        value={figure(t.income)}
        tone={t.income < 0 ? 'bad' : undefined}
        strong
      />
    </Card>
  );
}

function RenameSheet({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const [name, setName] = useState(branch.name);
  const save = () => {
    if (act(cmd.renameBranch, branch.id, name).ok) onClose();
  };
  return (
    <Sheet title="Rename branch" onClose={onClose}>
      <form
        class="stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label class="br-field">
          <span class="muted small">Branch name</span>
          <input
            class="br-input"
            value={name}
            maxLength={BRANCH_NAME_MAX}
            autoFocus
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
        </label>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
