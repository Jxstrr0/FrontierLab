// Per-week counts of the player's own Loan Desk choices. The sim records booked
// loans (LOAN_BOOKED events) but not declines or refusals, so the tab keeps a
// small UI-only tally for the summary strip. It resets on reload, which is fine
// for a "this week" figure, and never touches game state.
import { signal } from '@preact/signals';

interface Tally {
  declined: number;
  wentElsewhere: number;
}

const tallies = signal<Record<string, Tally>>({});

const key = (branchId: string, week: number) => `${branchId}:${week}`;

/** Declines and refusals this week for a branch. Reading subscribes the caller. */
export function weekTally(branchId: string, week: number): Tally {
  return tallies.value[key(branchId, week)] ?? { declined: 0, wentElsewhere: 0 };
}

export function recordDecision(branchId: string, week: number, what: keyof Tally): void {
  const k = key(branchId, week);
  const now = tallies.value[k] ?? { declined: 0, wentElsewhere: 0 };
  // Keep only this week's entries so the map never grows.
  const next: Record<string, Tally> = {};
  for (const [existing, t] of Object.entries(tallies.value)) {
    if (existing.endsWith(`:${week}`)) next[existing] = t;
  }
  next[k] = { ...now, [what]: now[what] + 1 };
  tallies.value = next;
}
