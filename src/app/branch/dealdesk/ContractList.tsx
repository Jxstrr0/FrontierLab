// The office's enterprise contracts as a collapsible list (SCREENS §5.3):
// business, sector, yearly value and renewal month. Tapping a row opens the
// business panel.
import { useState } from 'preact/hooks';
import { DAYS_PER_WEEK } from '../../../config/balance';
import { sectorOf } from '../../../sim/businesses';
import type { Business } from '../../../sim/state';
import { Card } from '../../components';
import { money, monthYear } from '../../format/format';
import { openPanel } from '../../store';

/** Longest list drawn at once; the rest are summarised. */
const MAX_ROWS = 40;
/** Short lists start open. */
const OPEN_UP_TO = 6;

export function ContractList(p: { contracts: Business[]; currency: string; startDate: string }) {
  const [open, setOpen] = useState(p.contracts.length <= OPEN_UP_TO);
  const total = p.contracts.reduce((sum, b) => sum + (b.contractValue ?? 0), 0);
  const n = p.contracts.length;
  return (
    <Card class="deal-list">
      <button
        type="button"
        class="deal-list-toggle"
        aria-expanded={open}
        disabled={n === 0}
        onClick={() => setOpen(!open)}
      >
        <span>
          <span class="deal-list-title">Contracts · {n}</span>
          <span class="muted small">
            {n === 0
              ? 'None yet. Win a proposal to sign your first.'
              : `${money(total, p.currency)} a year in contracts`}
          </span>
        </span>
        {n > 0 && (
          <span class="deal-list-caret" aria-hidden="true">
            {open ? '▴' : '▾'}
          </span>
        )}
      </button>
      {open && n > 0 && (
        <ul class="deal-rows-list">
          {p.contracts.slice(0, MAX_ROWS).map((b) => (
            <li key={b.id}>
              <button
                type="button"
                class="deal-row"
                onClick={() => openPanel({ type: 'business', businessId: b.id })}
              >
                <span class="deal-row-main">
                  <span class="deal-row-name">{b.name}</span>
                  <span class="deal-row-value">{money(b.contractValue ?? 0, p.currency)}/yr</span>
                </span>
                <span class="deal-row-sub muted small">
                  <span>{sectorOf(b).name}</span>
                  {b.renewalWeek !== undefined && (
                    <span>Renews {monthYear(p.startDate, b.renewalWeek * DAYS_PER_WEEK)}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
          {n > MAX_ROWS && <li class="muted small">And {n - MAX_ROWS} smaller contracts.</li>}
        </ul>
      )}
    </Card>
  );
}
