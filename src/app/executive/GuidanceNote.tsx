// Branch guidance readout on an executive's profile (SCREENS §10.1): what the
// executive is currently telling delegated branch managers to do. The CFO and
// CRO share one note (deposit and loan rates); the COO, CMO and CPO each get
// their own line.
import { GUIDANCE } from '../../config/balance';
import { guidanceOf } from '../../sim/branchGuidance';
import type { ExecSeat } from '../../sim/marketsTypes';
import type { GameState } from '../../sim/state';

/** Seats that give branch guidance. */
export const GUIDANCE_SEATS: readonly ExecSeat[] = ['cfo', 'cro', 'coo', 'cmo', 'cpo'];

/** "+0.20 pp", "−0.10 pp" or "no change" for a guidance step. */
const pp = (steps: number) =>
  steps === 0
    ? 'no change'
    : `${steps > 0 ? '+' : '−'}${Math.abs(steps * GUIDANCE.rateStep * 100).toFixed(2)} pp`;

/** "+4%", "−2%" or "no change" for a step × a per-step share. */
const pct = (steps: number, per: number) =>
  steps === 0
    ? 'no change'
    : `${steps * per > 0 ? '+' : '−'}${Math.round(Math.abs(steps * per * 100))}%`;

function line(s: GameState, seat: ExecSeat): string {
  const g = guidanceOf(s);
  const on = (x: ExecSeat) => !!s.executives.seats[x]?.delegations.guidance;
  const needs = (x: ExecSeat, short: string) => (on(x) ? '' : ` (needs the ${short}’s switch)`);
  switch (seat) {
    case 'coo':
      return `Branch guidance now: wages ${pct(g.staffing, GUIDANCE.wageStep)}, headcount ${pct(g.staffing, GUIDANCE.staffStep)}${needs('coo', 'COO')}. It applies to managers you let handle staffing.`;
    case 'cmo':
      return `Branch guidance now: campaign push ${pct(g.marketing, GUIDANCE.marketingStep)}${needs('cmo', 'CMO')}. It applies to managers you let handle marketing.`;
    case 'cpo':
      return `Branch guidance now: fees ${pct(-g.products, GUIDANCE.feeStep)}, lineup ${g.products > 0 ? 'wider' : g.products < 0 ? 'narrower' : 'no change'}${needs('cpo', 'CPO')}. It applies to managers you let handle products, and to company pricing.`;
    default: {
      const approvals = Math.round(Math.abs(g.loans) * GUIDANCE.thresholdStep * 100);
      return (
        `Branch guidance now: deposit rates ${pp(g.deposits)}${needs('cfo', 'CFO')}; ` +
        `loan rates ${pp(g.loans)}` +
        (g.loans !== 0 ? `, approvals ${approvals}% ${g.loans > 0 ? 'stricter' : 'looser'}` : '') +
        `${needs('cro', 'CRO')}. It applies to managers you let handle products or loan approvals, and to the CPO’s company pricing.`
      );
    }
  }
}

export function GuidanceNote(p: { s: GameState; seat: ExecSeat }) {
  return (
    <div class="muted small exec-note">
      <p>{line(p.s, p.seat)}</p>
    </div>
  );
}
