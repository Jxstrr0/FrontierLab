// SCREENS §20 owned club, Squad and Transfers tabs. Squad: the stars (name,
// position, rating, salary, years) and payroll totals, each star with Release.
// Transfers: the window status and, while open, the market with Sign.
import { useState } from 'preact/hooks';
import { FRANCHISE } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { payroll } from '../../sim/franchiseMath';
import type { Player } from '../../sim/state';
import { Badge, Card, Confirm, Row, SectionTitle } from '../components';
import { money, moneyFull, pct } from '../format/format';
import { act, toast, useGame } from '../store';
import { windowStatus, type ClubView } from './franchiseView';

const years = (n: number) => `${n} yr${n === 1 ? '' : 's'}`;

function PlayerCard(p: {
  player: Player;
  sym: string;
  action: string;
  extra?: string;
  disabled?: boolean;
  onAction: () => void;
}) {
  const { player } = p;
  return (
    <Card class="fr-player">
      <div class="fr-player-head">
        <span class="fr-player-name">{player.name}</span>
        <span class="fr-rating" aria-label={`Rating ${player.rating}`}>
          {player.rating}
        </span>
      </div>
      <div class="muted small">
        {player.position} · {money(player.salary, p.sym)}/yr · {years(player.years)}
        {p.extra ? ` · ${p.extra}` : ''}
      </div>
      <button
        type="button"
        class="btn btn-secondary btn-block fr-player-btn"
        disabled={p.disabled}
        onClick={p.onAction}
      >
        {p.action}
      </button>
    </Card>
  );
}

export function SquadTab({ view }: { view: ClubView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { club, spec } = view;
  const pay = payroll(club);
  const [releasing, setReleasing] = useState<Player | null>(null);
  const release = () => {
    if (!releasing) return;
    const r = act(cmd.releasePlayer, spec.id, releasing.id);
    if (r.ok) toast(`${releasing.name} released.`, 'info');
    setReleasing(null);
  };
  return (
    <div class="stack">
      <Card>
        <Row label="Star payroll" value={`${moneyFull(pay.stars, sym)} /yr`} />
        <Row label="Rest of the squad" value={`${moneyFull(pay.others, sym)} /yr`} />
        <Row label="Total payroll" value={`${moneyFull(pay.total, sym)} /yr`} strong />
      </Card>
      <SectionTitle>
        Star players ({club.stars.length}/{FRANCHISE.maxStars})
      </SectionTitle>
      {club.stars.length === 0 && <p class="muted">No stars on the books.</p>}
      {[...club.stars]
        .sort((a, b) => b.rating - a.rating)
        .map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            sym={sym}
            action="Release"
            onAction={() => setReleasing(p)}
          />
        ))}
      {releasing && (
        <Confirm
          title={`Release ${releasing.name}?`}
          body={`Paying off the contract costs ${moneyFull(cmd.releaseCost(releasing), sym)} (${pct(FRANCHISE.releaseShare, 0)} of the salary left on it).`}
          confirmLabel="Release"
          danger
          onConfirm={release}
          onCancel={() => setReleasing(null)}
        />
      )}
    </div>
  );
}

export function TransfersTab({ view }: { view: ClubView }) {
  const s = useGame();
  const sym = s.settings.currency;
  const { club, spec } = view;
  const status = windowStatus(s);
  const full = club.stars.length >= FRANCHISE.maxStars;
  const cash = club.owner === 'company' ? s.company.cash : s.personal.cash;
  const sign = (p: Player) => {
    const r = act(cmd.signPlayer, spec.id, p.id);
    if (r.ok) toast(`${p.name} signs for the ${spec.name}.`, 'good');
  };
  return (
    <div class="stack">
      <Card>
        <div class="fr-window">
          <Badge tone={status.open ? 'good' : 'info'}>{status.open ? 'Open' : 'Closed'}</Badge>
          <span>{status.text}</span>
        </div>
        <Row
          label={club.owner === 'company' ? 'Corporate cash' : 'Personal cash'}
          value={money(cash, sym)}
        />
      </Card>
      {status.open && full && (
        <p class="muted small">
          A squad carries {FRANCHISE.maxStars} stars. Release one on the Squad tab to sign another.
        </p>
      )}
      {status.open && club.market.length === 0 && (
        <p class="muted">No players left on the market this window.</p>
      )}
      {status.open &&
        club.market.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            sym={sym}
            extra={`fee ${money(p.fee ?? 0, sym)}`}
            action={`Sign for ${money(p.fee ?? 0, sym)}`}
            disabled={full || (p.fee ?? 0) > cash}
            onAction={() => sign(p)}
          />
        ))}
      {!status.open && (
        <p class="muted">
          Players come to market while a window is open (weeks{' '}
          {FRANCHISE.transferWindows.map(([a, b]) => `${a}–${b}`).join(' and ')}).
        </p>
      )}
    </div>
  );
}
