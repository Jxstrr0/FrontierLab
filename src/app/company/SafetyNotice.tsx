// Pause and strict-watch notice (stage C7a, SIMULATION §15): a banner shown on
// the Company panel and the Safety floor while the regulator has paused sales
// and training, or has the lab on strict watch after a revoked licence.
import { LICENCE } from '../../config/balance';
import { pauseBlock, underStrictWatch } from '../../sim/safety';
import type { GameState } from '../../sim/state';
import { dayOfWeek } from '../branch/selectors';
import { gameDate } from '../format/format';

export function SafetyNotice(p: { s: GameState }) {
  const s = p.s;
  const pause = pauseBlock(s);
  const watchUntil = s.company.watchUntilWeek;
  const date = (w: number) => gameDate(s.meta.startDate, dayOfWeek(w));
  return (
    <>
      {pause && s.company.pause && (
        <div class="safety-notice is-pause" role="status">
          <strong>Paused until {date(s.company.pause.untilWeek)}</strong>
          <span>{pause}</span>
        </div>
      )}
      {underStrictWatch(s) && watchUntil !== undefined && (
        <div class="safety-notice is-watch" role="status">
          <strong>Strict watch until {date(watchUntil)}</strong>
          <span>
            Tier lines sit {Math.round(LICENCE.watchBuffer * 100)} points higher and audits are
            twice as likely.
          </span>
        </div>
      )}
    </>
  );
}
