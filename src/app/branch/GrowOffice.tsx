// Grow office card (SCREENS §5.5, stage C2a): the office's size, what the next
// size costs (fit-out, extra lease deposit, new weekly rent) and a button that
// runs upgradeOffice after a confirmation.
import { useState } from 'preact/hooks';
import { sizeName } from '../../sim/branch/officeSize';
import * as cmd from '../../sim/commands';
import type { Branch } from '../../sim/state';
import { Card, Confirm, Row, SectionTitle } from '../components';
import { money } from '../format/format';
import { act, toast, useGame } from '../store';

export function GrowOffice({ branch }: { branch: Branch }) {
  const s = useGame();
  const [open, setOpen] = useState(false);
  const sym = s.settings.currency;
  const quote = cmd.upgradeQuote(s, branch.id);
  const blocker = cmd.upgradeBlocker(s, branch.id);
  return (
    <>
      <SectionTitle>Office size</SectionTitle>
      <Card>
        <Row label="Size" value={sizeName(branch.size ?? 0)} strong />
        {quote ? (
          <>
            <Row label={`Grow to ${quote.name}`} value={money(quote.total, sym)} />
            <Row label="New weekly rent" value={money(quote.rent, sym)} tone="dim" />
            <button
              type="button"
              class="btn btn-primary btn-block"
              disabled={!!blocker}
              onClick={() => setOpen(true)}
            >
              Grow office
            </button>
            {blocker && <p class="muted small">{blocker}</p>}
          </>
        ) : (
          <p class="muted small">This is the largest size an office comes in.</p>
        )}
      </Card>
      {open && quote && (
        <Confirm
          title={`Grow ${branch.name} to ${quote.name}?`}
          confirmLabel="Grow office"
          body={
            <div class="stack">
              <div>
                <Row label="Fit-out" value={money(quote.parts, sym)} />
                <Row label="Extra lease deposit" value={money(quote.deposit, sym)} />
                <Row label="Total now" value={money(quote.total, sym)} strong />
                <Row label="New weekly rent" value={money(quote.rent, sym)} tone="dim" />
              </div>
              <p class="small">
                More seats and staff, and the office reaches more of the city. Your manager hires
                the extra staff.
              </p>
            </div>
          }
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            setOpen(false);
            if (act(cmd.upgradeOffice, branch.id).ok)
              toast(`${branch.name} is now a ${quote.name} office.`);
          }}
        />
      )}
    </>
  );
}
