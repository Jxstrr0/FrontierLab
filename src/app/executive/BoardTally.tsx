// The board's animated vote tally (SCREENS §10.2): For / Against bars per item,
// filling one after the other, then the outcome lines and Close. With reduced
// motion the final tallies show at once.
import { useEffect, useState } from 'preact/hooks';
import { BOARD_ROOM } from '../../config/balance';
import { BOARD_LINES, boardLine } from '../../data/boardLines';
import type { BoardMeeting, BoardVote } from '../../sim/state';
import { exactMoney, moneyFull } from '../format/format';

/** UI timing for the tally animation (not simulation tuning). */
const TALLY = { itemMs: 1200, frameMs: 40 } as const;

export function BoardTally(p: {
  meeting: BoardMeeting;
  /** CEO salary before the meeting, to word an unchanged salary. */
  previousSalary: number;
  sym: string;
  reduced: boolean;
  onClose: () => void;
}) {
  const total = TALLY.itemMs * 2;
  const [t, setT] = useState(p.reduced ? total : 0);
  useEffect(() => {
    if (p.reduced) return;
    const start = performance.now();
    const id = setInterval(() => {
      const el = performance.now() - start;
      setT(Math.min(total, el));
      if (el >= total) clearInterval(id);
    }, TALLY.frameMs);
    return () => clearInterval(id);
  }, [p.reduced]);
  const done = t >= total;
  const share = (i: number) => Math.min(1, Math.max(0, (t - i * TALLY.itemMs) / TALLY.itemMs));
  const m = p.meeting;
  return (
    <div class="stack">
      <Tally
        label={`Dividend of ${exactMoney(m.dividend.proposed, p.sym)} a share`}
        vote={m.dividend}
        progress={share(0)}
      />
      <Tally
        label={`CEO salary of ${moneyFull(m.salary.proposed, p.sym)}`}
        vote={m.salary}
        progress={share(1)}
      />
      <div aria-live="polite">
        {done && (
          <ul class="exec-outcome">
            <li>{dividendLine(m, p.sym)}</li>
            <li>{salaryLine(m, p.previousSalary, p.sym)}</li>
            {roomLine(m) && <li class="muted">{roomLine(m)}</li>}
          </ul>
        )}
      </div>
      <button type="button" class="btn btn-primary btn-block" disabled={!done} onClick={p.onClose}>
        Close
      </button>
    </div>
  );
}

// The wording comes from data/boardLines.ts, its version picked by the meeting's week.
function dividendLine(m: BoardMeeting, sym: string): string {
  const L = BOARD_LINES;
  if (!m.dividend.passed) return boardLine(L.dividendRejected, m.week);
  if (m.dividend.proposed <= 0) return boardLine(L.dividendNone, m.week);
  return boardLine(L.dividendApproved, m.week, { amount: exactMoney(m.dividend.proposed, sym) });
}

function salaryLine(m: BoardMeeting, previous: number, sym: string): string {
  const L = BOARD_LINES;
  const salary = moneyFull(m.salary.proposed, sym);
  if (!m.salary.passed) return boardLine(L.salaryRejected, m.week + 1);
  if (m.salary.proposed === previous) return boardLine(L.salarySame, m.week + 1, { salary });
  return boardLine(L.salaryChanged, m.week + 1, { salary });
}

/** A remark on how the room split, when it was warm, split or cold. */
function roomLine(m: BoardMeeting): string | undefined {
  const votes = [m.dividend, m.salary];
  if (votes.some((v) => Math.abs(v.forShare - 0.5) <= BOARD_ROOM.closeBand))
    return boardLine(BOARD_LINES.roomSplit, m.week + 2);
  if (votes.every((v) => v.passed && v.forShare >= BOARD_ROOM.unanimous))
    return boardLine(BOARD_LINES.roomWarm, m.week + 2);
  if (votes.every((v) => !v.passed)) return boardLine(BOARD_LINES.roomCold, m.week + 2);
  return undefined;
}

function Tally(p: { label: string; vote: BoardVote; progress: number }) {
  const forPct = p.vote.forShare * 100 * p.progress;
  const againstPct = (1 - p.vote.forShare) * 100 * p.progress;
  const settled = p.progress >= 1;
  return (
    <div class="exec-tally">
      <div class="exec-tally-head">
        <span>{p.label}</span>
        {settled && (
          <span class={`exec-tally-result ${p.vote.passed ? 'tone-good' : 'tone-bad'}`}>
            {p.vote.passed ? 'Passed' : 'Rejected'}
          </span>
        )}
      </div>
      <div class="exec-tally-bar" aria-hidden="true">
        <span class="exec-tally-for" style={{ width: `${forPct}%` }} />
        <span class="exec-tally-against" style={{ width: `${againstPct}%` }} />
      </div>
      <div class="exec-tally-nums small">
        <span>For {forPct.toFixed(0)}%</span>
        <span>Against {againstPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
