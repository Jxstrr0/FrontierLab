// Read-only wording for the Finance floor's risk appetite card (SCREENS §10,
// SIMULATION §16.8, §17.2): level names, what a level does to loans, and who
// else is steering the dial. Nothing here mutates GameState.
import { EXEC_DELEGATION, RISK_APPETITE, TIER_THRESHOLDS } from '../../../config/balance';
import type { GameState } from '../../../sim/state';

// ─── Risk appetite (SIMULATION §16.8) ─────────────────────────────────────────

export const RISK_LABELS = [
  'Very conservative',
  'Conservative',
  'Balanced',
  'Aggressive',
  'Very aggressive',
] as const;

const pctChange = (mult: number) => Math.round(Math.abs(mult - 1) * 100);

/** One line on what a risk appetite level does to loan volume and defaults. */
export function riskHint(level: number): string {
  const i = level - 1;
  const vol = RISK_APPETITE.volumeMult[i] ?? 1;
  const pd = RISK_APPETITE.pdMult[i] ?? 1;
  if (vol === 1 && pd === 1) return 'Standard loan volumes and default rates.';
  const more = vol > 1;
  return `About ${pctChange(vol)}% ${more ? 'more' : 'fewer'} loans, with defaults ${pctChange(pd)}% ${pd > 1 ? 'higher' : 'lower'}.`;
}

/**
 * Who else moves the dial (SIMULATION §17.2): the CRO tunes it both ways, the
 * CFO's Capital switch steps it down while capital is weak. Undefined when
 * neither is seated with the switch on, so the card says nothing.
 */
export function riskSteering(s: GameState): string | undefined {
  const cro = !!s.executives.seats.cro?.delegations.appetite;
  const cfo = !!s.executives.seats.cfo?.delegations.capital;
  const adequate = TIER_THRESHOLDS.find((t) => t.tier === 'adequate')!.minCr;
  const croLine = `your CRO tunes this every ${EXEC_DELEGATION.croEveryWeeks} weeks`;
  const cfoLine = `your CFO steps it down while capital is under ${+(adequate * 100).toFixed(1)}%`;
  const parts = [cro && croLine, cfo && cfoLine].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  const text = parts.join(', and ');
  return `${text[0]!.toUpperCase()}${text.slice(1)}. You can still set it yourself.`;
}
