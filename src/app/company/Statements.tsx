// Company statements (SCREENS §10 Finance floor, §24 Company summary): an
// income statement and cash flow over Week, Quarter or Year, and the balance
// sheet. On the Finance floor, weeks a short-staffed team hasn't closed yet
// show as "Delayed" (delayWeeks).
import { useState } from 'preact/hooks';
import type { GameState } from '../../sim/state';
import { Card, Segmented } from '../components';
import { figure } from '../format/format';
import { useGame } from '../store';
import {
  balanceSheetLines,
  cashFlowStatement,
  incomeStatement,
  periodSnapshots,
  PERIOD_WEEKS,
  type Period,
  type StatementLine,
} from './statementData';

function Lines(p: { lines: StatementLine[] }) {
  return (
    <div class="stmt">
      {p.lines.map((l) => (
        <div class={`stmt-row stmt-${l.kind ?? 'line'}`} key={l.label}>
          <span>{l.label}</span>
          <span class={l.value < 0 ? 'tone-bad' : undefined}>{figure(l.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Statements(p: { state: GameState; delayWeeks?: number }) {
  // Subscribe to game changes: the state object never changes identity, so
  // without this a weekly tick wouldn't re-render the statements.
  useGame();
  const [period, setPeriod] = useState<Period>('week');
  const delay = p.delayWeeks ?? 0;
  const snaps = periodSnapshots(p.state, period, delay);
  const wanted = PERIOD_WEEKS[period];
  return (
    <div class="stack co-stack">
      <Segmented
        label="Statement period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: 'Week' },
          { value: 'quarter', label: 'Quarter' },
          { value: 'year', label: 'Year' },
        ]}
      />
      {delay > 0 && (
        <div class="stmt-delayed" role="status">
          <span class="stmt-delayed-tag">Delayed</span>
          <span class="small">
            The latest {delay === 1 ? 'week is' : `${delay} weeks are`} still being closed. More
            finance staff will catch the books up.
          </span>
        </div>
      )}
      {snaps.length === 0 ? (
        <p class="muted">Statements appear after the first weekly close.</p>
      ) : (
        <>
          <Card>
            <h4 class="stmt-title">Income statement</h4>
            <Lines lines={incomeStatement(snaps)} />
          </Card>
          <Card>
            <h4 class="stmt-title">Cash flow</h4>
            <Lines lines={cashFlowStatement(snaps)} />
          </Card>
          <p class="muted small stmt-note">
            {snaps.length < wanted
              ? `Based on ${snaps.length} week${snaps.length === 1 ? '' : 's'} of trading so far. `
              : ''}
            Amounts in {p.state.settings.currency}.
          </p>
        </>
      )}
      <Card>
        <h4 class="stmt-title">Balance sheet</h4>
        <Lines lines={balanceSheetLines(p.state)} />
      </Card>
    </div>
  );
}
