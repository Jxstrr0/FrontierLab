// Hire sheet for an empty executive seat (SCREENS §10): the seat's candidates
// with portrait, Leadership / Expertise / Loyalty bars, asking salary and Hire.
// The pool refreshes every few weeks.
import { EXECUTIVES } from '../../config/balance';
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import type { ExecSeat } from '../../sim/state';
import { Card, Sheet, StatBar, Portrait } from '../components';
import { moneyFull } from '../format/format';
import { act, toast, useGame } from '../store';
import { seatSpec } from './execSelectors';

export function ExecHireSheet(p: { seat: ExecSeat; onClose: () => void }) {
  const s = useGame();
  const spec = seatSpec(p.seat);
  const pool = s.executives.candidates[p.seat] ?? [];
  const sym = s.settings.currency;
  const since = s.executives.candidatesRefreshWeek;
  const weeks = Math.max(1, since + EXECUTIVES.refreshWeeks - s.clock.week);
  const teams = spec.depts.map((d) => DEPARTMENTS[d].name).join(' and ');
  const depts = teams ? `Lifts the ${teams} team${spec.depts.length > 1 ? 's' : ''}.` : '';
  return (
    <Sheet title={`Hire a ${spec.short}`} onClose={p.onClose}>
      <div class="stack">
        <p class="muted small exec-sheet-intro">
          {spec.title}. {depts} New candidates in {weeks} week{weeks === 1 ? '' : 's'}.
        </p>
        {pool.length === 0 && <p class="muted">No candidates right now.</p>}
        {pool.map((c) => (
          <Card>
            <div class="stack">
              <div class="exec-person">
                <Portrait avatar={c.portrait} size={56} />
                <div>
                  <div class="exec-person-name">{c.name}</div>
                  <div class="muted small">Asks {moneyFull(c.salary, sym)} a year</div>
                </div>
              </div>
              <div>
                <StatBar label="Leadership" value={c.leadership} />
                <StatBar label="Expertise" value={c.expertise} />
                <StatBar label="Loyalty" value={c.loyalty} />
              </div>
              <button
                type="button"
                class="btn btn-primary btn-block"
                onClick={() => {
                  if (act(cmd.hireExec, p.seat, c.id).ok) {
                    toast(`${c.name} is your new ${spec.short}.`, 'good');
                    p.onClose();
                  }
                }}
              >
                Hire {c.name.split(' ')[0]}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </Sheet>
  );
}
