// Executive floor (SCREENS §10): the board meeting card (what the board does,
// the last meeting, the current dividend and CEO pay, a pending dividend, and
// Hold meeting once per quarter) and the seven-seat grid. The CEO seat is you;
// empty seats open the hire sheet, filled ones the executive's profile.
import { useState } from 'preact/hooks';
import type { ExecSeat } from '../../sim/state';
import { Badge, Card, Row, SectionTitle, Portrait } from '../components';
import { money, moneyFull } from '../format/format';
import { modal, useGame } from '../store';
import { ExecHireSheet } from './ExecHireSheet';
import { ExecProfileSheet } from './ExecProfileSheet';
import { boardCard, delegationsOn, SEATS, seatSpec } from './execSelectors';
import './executive.css';

export function ExecutiveFloor() {
  const [hiring, setHiring] = useState<ExecSeat | null>(null);
  const [profile, setProfile] = useState<ExecSeat | null>(null);
  return (
    <>
      <BoardCard />
      <section>
        <SectionTitle>Senior executives</SectionTitle>
        <SeatGrid onHire={setHiring} onOpen={setProfile} />
      </section>
      {hiring && <ExecHireSheet seat={hiring} onClose={() => setHiring(null)} />}
      {profile && <ExecProfileSheet seat={profile} onClose={() => setProfile(null)} />}
    </>
  );
}

function BoardCard() {
  const s = useGame();
  const sym = s.settings.currency;
  const b = boardCard(s);
  return (
    <section>
      <SectionTitle>Board meeting</SectionTitle>
      <Card>
        <div class="stack">
          <p class="exec-board-text small">
            Once a quarter you chair the board. Propose a dividend per share and your own pay; the
            shareholders vote on each. Your stake carries its votes, and outside holders judge how
            reasonable the proposal is.
          </p>
          <div>
            <Row label="Last meeting" value={b.lastMeeting ?? 'Not yet held'} />
            <Row label="Dividend per share" value={`${sym}${b.dps.toFixed(2)} a quarter`} />
            <Row label="Your salary" value={`${moneyFull(b.ceoSalary, sym)} a year`} />
            {b.pending && (
              <Row
                label="Dividend payable"
                value={`${money(b.pending.total, sym)} on ${b.pending.payDate}`}
              />
            )}
          </div>
          {b.canMeet ? (
            <Badge tone="good">The board can meet for {b.quarter}</Badge>
          ) : (
            <p class="muted small exec-board-blocker">{b.blocker}</p>
          )}
          <button
            type="button"
            class="btn btn-primary btn-block"
            disabled={!b.canMeet}
            onClick={() => (modal.value = { type: 'boardMeeting' })}
          >
            Hold meeting
          </button>
        </div>
      </Card>
    </section>
  );
}

function SeatGrid(p: { onHire: (seat: ExecSeat) => void; onOpen: (seat: ExecSeat) => void }) {
  const s = useGame();
  return (
    <ul class="exec-grid" aria-label="Executive seats">
      <li>
        <div class="exec-seat is-ceo">
          <Portrait avatar={s.meta.founderAvatar} size={56} />
          <span class="exec-seat-name">{s.meta.founderName}</span>
          <span class="exec-seat-title">Chief Executive · You</span>
        </div>
      </li>
      {SEATS.map((seat) => {
        const spec = seatSpec(seat);
        const exec = s.executives.seats[seat];
        if (!exec) {
          return (
            <li>
              <button
                type="button"
                class="exec-seat is-empty"
                aria-label={`Hire a ${spec.title}`}
                onClick={() => p.onHire(seat)}
              >
                <span class="exec-seat-badge" aria-hidden="true">
                  {spec.short}
                </span>
                <span class="exec-seat-title">{spec.title}</span>
                <span class="exec-seat-hire">Hire</span>
              </button>
            </li>
          );
        }
        const on = delegationsOn(s, exec);
        return (
          <li>
            <button
              type="button"
              class="exec-seat"
              aria-label={`${exec.name}, ${spec.title}`}
              onClick={() => p.onOpen(seat)}
            >
              <Portrait avatar={exec.portrait} size={56} />
              <span class="exec-seat-name">{exec.name}</span>
              <span class="exec-seat-title">{spec.short}</span>
              <span class="exec-seat-meta muted">
                {on > 0 ? `${on} delegated` : 'Nothing delegated'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
