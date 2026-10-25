// List portfolio (SCREENS §10): every holding of the chosen account, grouped
// as Stocks, Ventures, Real estate, Venture debt and Currencies, with value and
// gain against cost. Ventures and venture debt open the startup panel; the
// building rows open the property panel.
import type { Account } from '../../sim/portfolio';
import { Sheet } from '../components';
import { money } from '../format/format';
import { openPanel, useGame } from '../store';
import { portfolioRows, SLICES, type HoldingRow } from './investmentView';

export function PortfolioSheet(p: { account: Account; onClose: () => void }) {
  const s = useGame();
  const title = p.account === 'company' ? `${s.meta.bankName} portfolio` : 'Private portfolio';
  return (
    <Sheet title={title} onClose={p.onClose}>
      <PortfolioList account={p.account} />
    </Sheet>
  );
}

/** Every holding of one account, grouped by slice (also the menu's Portfolio panel). */
export function PortfolioList(p: { account: Account }) {
  const s = useGame();
  const sym = s.settings.currency;
  const rows = portfolioRows(s, p.account);
  return (
    <>
      {rows.length === 0 && <p class="muted">Nothing here yet.</p>}
      {SLICES.map((slice) => {
        const group = rows.filter((r) => r.kind === slice.id);
        if (group.length === 0) return null;
        const total = group.reduce((t, r) => t + r.value, 0);
        return (
          <section class="inv-group" aria-label={slice.label}>
            <h4 class="inv-group-title">
              <span class={`inv-swatch inv-slice-${slice.id}`} aria-hidden="true" />
              {slice.label}
              <span class="inv-group-total">{money(total, sym)}</span>
            </h4>
            {group.map((r) => (
              <HoldingLine row={r} sym={sym} />
            ))}
          </section>
        );
      })}
    </>
  );
}

function HoldingLine(p: { row: HoldingRow; sym: string }) {
  const r = p.row;
  const body = (
    <>
      <span class="inv-line-main">
        <span class="inv-line-name">{r.name}</span>
        <span class="muted small">{r.detail}</span>
      </span>
      <span class="inv-line-figs">
        <span>{money(r.value, p.sym)}</span>
        {r.gain !== undefined && (
          <span class={`small tone-${r.gain > 0 ? 'good' : r.gain < 0 ? 'bad' : 'flat'}`}>
            {r.gain >= 0 ? '+' : '−'}
            {money(Math.abs(r.gain), p.sym)}
          </span>
        )}
      </span>
    </>
  );
  const open = r.startupId
    ? () => openPanel({ type: 'startup', startupId: r.startupId! })
    : r.siteId
      ? () => openPanel({ type: 'property', siteId: r.siteId! })
      : undefined;
  return open ? (
    <button type="button" class="inv-line inv-line-tap" onClick={open}>
      {body}
    </button>
  ) : (
    <div class="inv-line">{body}</div>
  );
}
