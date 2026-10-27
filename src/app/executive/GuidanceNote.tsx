// Sales office guidance readout on an executive's profile (SCREENS §10.1):
// what the executive is currently telling delegated office managers to do. The
// COO, CMO and CPO each get a line.
import { GUIDANCE } from '../../config/balance';
import { guidanceOf } from '../../sim/branchGuidance';
import type { ExecSeat } from '../../sim/marketsTypes';
import type { GameState } from '../../sim/state';

/** Seats that give sales office guidance. */
export const GUIDANCE_SEATS: readonly ExecSeat[] = ['coo', 'cmo', 'cpo'];

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
      return `Sales office guidance now: wages ${pct(g.staffing, GUIDANCE.wageStep)}, headcount ${pct(g.staffing, GUIDANCE.staffStep)}${needs('coo', 'COO')}. It applies to managers you let handle staffing.`;
    case 'cmo':
      return `Sales office guidance now: campaign push ${pct(g.marketing, GUIDANCE.marketingStep)}${needs('cmo', 'CMO')}. It applies to managers you let handle marketing.`;
    default:
      return `Sales office guidance now: fees ${pct(-g.products, GUIDANCE.feeStep)}, lineup ${g.products > 0 ? 'wider' : g.products < 0 ? 'narrower' : 'no change'}${needs('cpo', 'CPO')}. It applies to managers you let handle products, and to company pricing.`;
  }
}

export function GuidanceNote(p: { s: GameState; seat: ExecSeat }) {
  if (!GUIDANCE_SEATS.includes(p.seat)) return null;
  return (
    <div class="muted small exec-note">
      <p>{line(p.s, p.seat)}</p>
    </div>
  );
}
