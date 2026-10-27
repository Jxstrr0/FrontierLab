// The benchmark leaderboard (stage C6b, SIMULATION §16.12): every active lab's
// current model ranked by quality (the radar mean), yours included.
import type { GameState } from './state';
import { activeModel, modelQuality } from './underwriting';

export interface LeaderboardRow {
  lab: string;
  model: string;
  quality: number;
  /** Your lab's row. */
  you: boolean;
  /** Rival id (absent on your row). */
  rivalId?: string;
}

/** Labs ranked best model first; ties keep your row above rivals'. */
export function leaderboard(state: GameState): LeaderboardRow[] {
  const mine = activeModel(state);
  const rows: LeaderboardRow[] = [
    { lab: state.meta.bankName, model: mine.name, quality: modelQuality(mine), you: true },
  ];
  for (const r of Object.values(state.rivals)) {
    if (r.status !== 'active' || !r.model) continue;
    rows.push({
      lab: r.name,
      model: r.model.name,
      quality: r.model.quality,
      you: false,
      rivalId: r.id,
    });
  }
  return rows.sort(
    (a, b) => b.quality - a.quality || Number(b.you) - Number(a.you) || a.lab.localeCompare(b.lab),
  );
}
