// Branch guidance readout on the CFO's and CRO's profiles (SCREENS §10.1): what
// the two of them are currently telling delegated branch managers to do.
import { GUIDANCE } from '../../config/balance';
import { guidanceOf } from '../../sim/branchGuidance';
import type { GameState } from '../../sim/state';

/** "+0.20 pp", "−0.10 pp" or "no change" for a guidance step. */
const pp = (steps: number) =>
  steps === 0
    ? 'no change'
    : `${steps > 0 ? '+' : '−'}${Math.abs(steps * GUIDANCE.rateStep * 100).toFixed(2)} pp`;

export function GuidanceNote(p: { s: GameState }) {
  const g = guidanceOf(p.s);
  const seats = p.s.executives.seats;
  const cfo = !!seats.cfo?.delegations.guidance;
  const cro = !!seats.cro?.delegations.guidance;
  const approvals = Math.round(Math.abs(g.loans) * GUIDANCE.thresholdStep * 100);
  return (
    <div class="muted small exec-note">
      <p>
        Branch guidance now: deposit rates {pp(g.deposits)}
        {cfo ? '' : ' (needs the CFO’s switch)'}; loan rates {pp(g.loans)}
        {g.loans !== 0 ? `, approvals ${approvals}% ${g.loans > 0 ? 'stricter' : 'looser'}` : ''}
        {cro ? '' : ' (needs the CRO’s switch)'}.
      </p>
      <p>
        It applies to managers you let handle products or loan approvals, and to the CPO’s company
        pricing.
      </p>
    </div>
  );
}
