// The branch's booked business loans as a collapsible list (SCREENS §5.3):
// business, balance, rate, weeks left and status.
import { useState } from 'preact/hooks';
import { LOAN_SECTORS } from '../../../data/loanSectors';
import type { BusinessLoan } from '../../../sim/state';
import { Badge, Card } from '../../components';
import { money, pct } from '../../format/format';

/** Longest list drawn at once; the rest are summarised. */
const MAX_ROWS = 40;

const STATUS: Record<BusinessLoan['status'], { tone: 'good' | 'bad' | 'info'; text: string }> = {
  current: { tone: 'good', text: 'Current' },
  defaulted: { tone: 'bad', text: 'Defaulted' },
  repaid: { tone: 'info', text: 'Repaid' },
};

export function ActiveLoans(p: { loans: BusinessLoan[]; currency: string }) {
  const [open, setOpen] = useState(false);
  const sorted = [...p.loans].sort((a, b) => b.balance - a.balance);
  const total = sorted.reduce((sum, l) => sum + l.balance, 0);
  return (
    <Card class="loan-list">
      <button
        type="button"
        class="loan-list-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          <span class="loan-list-title">Active business loans</span>
          <span class="muted small">
            {sorted.length === 0
              ? 'None yet'
              : `${sorted.length} loan${sorted.length === 1 ? '' : 's'} · ${money(total, p.currency)}`}
          </span>
        </span>
        <span class="loan-list-caret" aria-hidden="true">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && sorted.length > 0 && (
        <ul class="loan-rows">
          {sorted.slice(0, MAX_ROWS).map((l) => (
            <li class="loan-row" key={l.id}>
              <div class="loan-row-main">
                <span class="loan-row-name">{l.business}</span>
                <span class="loan-row-balance">{money(l.balance, p.currency)}</span>
              </div>
              <div class="loan-row-sub muted small">
                <span>{LOAN_SECTORS.find((s) => s.id === l.sector)?.name ?? l.sector}</span>
                <span>
                  {pct(l.rate)} · {l.weeksLeft} wk left
                </span>
                <Badge tone={STATUS[l.status].tone}>{STATUS[l.status].text}</Badge>
              </div>
            </li>
          ))}
          {sorted.length > MAX_ROWS && (
            <li class="muted small">And {sorted.length - MAX_ROWS} smaller loans.</li>
          )}
        </ul>
      )}
    </Card>
  );
}
