// View model for the Milestones screen (DESIGN §5.18): every milestone in
// CONTENT order with the date it was reached, or its goal while still ahead.
import { DAYS_PER_WEEK } from '../../config/balance';
import { MILESTONES } from '../../data/milestones';
import type { GameState } from '../../sim/state';
import { gameDate } from '../format/format';

export interface MilestoneRow {
  id: string;
  title: string;
  /** "Reached 4 Mar 2028", or the goal. */
  detail: string;
  reached: boolean;
}

export function milestoneRows(s: GameState): MilestoneRow[] {
  return MILESTONES.map((m) => {
    const week = s.milestones[m.id];
    return week === undefined
      ? { id: m.id, title: m.title, detail: m.goal, reached: false }
      : {
          id: m.id,
          title: m.title,
          detail: `Reached ${gameDate(s.meta.startDate, week * DAYS_PER_WEEK)}`,
          reached: true,
        };
  });
}
