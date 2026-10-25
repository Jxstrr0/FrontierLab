// Board meeting modal (SCREENS §10.2). Opened from the Executive floor, or by
// the quarterly reminder (which asks first). Dividends: the current dividend
// and its yield, a per-share stepper with yield and payout ratio, and the
// regulator's cap note. CEO compensation: current pay and a stepper. Take votes
// runs the meeting; each item's For / Against tally animates in turn (instant
// with reduced motion), then the outcome and Close.
import { useState } from 'preact/hooks';
import * as cmd from '../../sim/commands';
import type { BoardMeeting } from '../../sim/state';
import { Medallion, Modal, Row, SectionTitle, Stepper } from '../components';
import { exactMoney, moneyFull, moneyStepper, pct } from '../format/format';
import { act, modal, useGame } from '../store';
import { BoardTally } from './BoardTally';
import { CEO_STEP, DPS_STEP, boardCard, dividendYield, meetingView, payout } from './execSelectors';
import './executive.css';

export function BoardMeetingModal() {
  const s = useGame();
  const route = modal.value;
  const [asking, setAsking] = useState(route?.type === 'boardMeeting' && !!route.reminder);
  const view = meetingView(s);
  const [dps, setDps] = useState(view.proposal);
  const [salary, setSalary] = useState(s.governance.ceoSalary);
  const [meeting, setMeeting] = useState<BoardMeeting | null>(null);
  const [before, setBefore] = useState(s.governance.ceoSalary);
  const close = () => (modal.value = null);
  const sym = s.settings.currency;
  const icon = <Medallion ink={s.meta.brandInk} monogram={s.meta.monogram} shape={s.meta.logoShape} size={30} />;
  const b = boardCard(s);

  if (asking) {
    return (
      <Modal title="Board meeting" icon={icon} onClose={close}>
        <div class="stack">
          <p>
            A new quarter has begun and the board is ready to meet for {b.quarter}. Set this
            quarter’s dividend and your pay, then put them to a vote.
          </p>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" onClick={close}>
              Later
            </button>
            <button type="button" class="btn btn-primary" onClick={() => setAsking(false)}>
              Hold meeting
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (meeting) {
    return (
      <Modal title={`Board meeting · ${meeting.quarter}`} icon={icon} onClose={close}>
        <BoardTally
          meeting={meeting}
          previousSalary={before}
          sym={sym}
          reduced={s.settings.reducedMotion}
          onClose={close}
        />
      </Modal>
    );
  }

  const blocked = !b.canMeet;
  const problem = blocked ? b.blocker : cmd.proposalProblem(s, dps, salary);
  const ratio = payout(s, dps);
  const take = () => {
    setBefore(s.governance.ceoSalary);
    const r = act(cmd.holdBoardMeeting, dps, salary);
    if (r.ok) setMeeting(r.meeting);
  };
  return (
    <Modal
      title="Board meeting"
      icon={icon}
      onClose={close}
      footer={
        <button type="button" class="btn btn-primary btn-block" disabled={!!problem} onClick={take}>
          Take votes
        </button>
      }
    >
      <div class="stack">
        <section>
          <SectionTitle>Dividends</SectionTitle>
          <Row
            label="Current dividend"
            value={`${exactMoney(s.governance.dividendPerShare, sym)} · yield ${pct(dividendYield(s, s.governance.dividendPerShare), 1)}`}
          />
          <Stepper
            label="New dividend per share"
            value={dps}
            min={0}
            max={view.cap ?? Math.max(1, view.price)}
            step={DPS_STEP}
            {...moneyStepper(sym, exactMoney)}
            onChange={setDps}
            hint={`Yield ${pct(dividendYield(s, dps), 1)} · payout ${ratio === null ? 'n/a (no profit)' : pct(ratio, 0)}`}
          />
          {view.cfoProposes && <p class="muted small exec-note">Your CFO proposed this figure.</p>}
          {view.capNote && <p class="exec-cap-note small">{view.capNote}</p>}
        </section>
        <section>
          <SectionTitle>CEO compensation</SectionTitle>
          <Row label="Current salary" value={moneyFull(s.governance.ceoSalary, sym)} />
          <Stepper
            label="New salary"
            value={salary}
            min={0}
            max={view.ceoMax}
            step={CEO_STEP}
            {...moneyStepper(sym)}
            onChange={setSalary}
            hint={`Market rate ${moneyFull(view.ceoMarket, sym)}`}
          />
        </section>
        {problem && (
          <p class="exec-cap-note small" role="status">
            {problem}
          </p>
        )}
      </div>
    </Modal>
  );
}
