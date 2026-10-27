// Close branch button and confirmation (SCREENS §5.5): shows the cash that comes
// back (equipment recovery and the lease deposit less forfeited rent) and where
// the accounts go, then runs closeBranch.
import { useState } from 'preact/hooks';
import * as cmd from '../../sim/commands';
import type { Branch } from '../../sim/state';
import { Confirm, Row } from '../components';
import { money } from '../format/format';
import { act, closePanel, toast, useGame } from '../store';

export function CloseBranch({ branch }: { branch: Branch }) {
  const s = useGame();
  const [open, setOpen] = useState(false);
  const quote = cmd.closeQuote(s, branch.id);
  if (!quote) return null;
  const sym = s.settings.currency;
  const keep = Math.round(quote.retention * 100);
  return (
    <div class="br-close">
      <button
        type="button"
        class="btn btn-danger btn-block"
        disabled={!!quote.blocker}
        onClick={() => setOpen(true)}
      >
        Close sales office
      </button>
      {quote.blocker && <p class="muted small br-close-blocker">{quote.blocker}</p>}
      {open && (
        <Confirm
          title={`Close ${branch.name}?`}
          confirmLabel="Close sales office"
          danger
          body={
            <div class="stack">
              <div>
                <Row label="Equipment recovered" value={money(quote.recovery, sym)} />
                <Row label="Lease deposit back" value={money(quote.depositRefund, sym)} />
                <Row
                  label="Rent kept by the landlord"
                  value={money(quote.forfeit, sym)}
                  tone="dim"
                />
                <Row label="Cash back" value={money(quote.cashBack, sym)} strong />
              </div>
              <p class="small">
                {quote.targetName
                  ? `Contracts move to ${quote.targetName}. About ${keep}% of customers follow; the rest leave the lab.`
                  : 'Customers and their plans leave the lab. This cannot be undone.'}
              </p>
            </div>
          }
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            const name = branch.name;
            if (act(cmd.closeBranch, branch.id).ok) {
              closePanel();
              toast(`${name} is closed. ${money(quote.cashBack, sym)} came back.`);
            }
          }}
        />
      )}
    </div>
  );
}
