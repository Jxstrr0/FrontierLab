// Leaderboard card on the Products floor (SIMULATION §16.12, stage C6b): every
// lab's current model ranked by quality, your row highlighted, plus a plain
// line on the market bar your model is judged against.
import { leaderboard } from '../../../sim/leaderboard';
import { priceHeadroom, qualityBar } from '../../../sim/underwriting';
import { Badge, Card } from '../../components';
import { signedPct } from '../../format/format';
import { useGame } from '../../store';
import { radarText } from './productSelectors';

export function LeaderboardCard() {
  const s = useGame();
  const rows = leaderboard(s);
  const headroom = priceHeadroom(s) - 1;
  return (
    <Card class="pf-board">
      <p class="small">
        Customers judge your model against the best on the market. Today’s bar is{' '}
        <strong>{radarText(qualityBar(s))}</strong>, so your model lets you charge{' '}
        <strong class={headroom < 0 ? 'tone-bad' : ''}>{signedPct(headroom, 0)}</strong> versus the
        market price.
      </p>
      <ol class="pf-board-list" aria-label="Model leaderboard">
        {rows.map((r, i) => (
          <li class={`pf-board-row${r.you ? ' is-you' : ''}`}>
            <span class="pf-board-rank">{i + 1}</span>
            <span class="pf-board-text">
              <span class="pf-board-lab">
                {r.lab} {r.you && <Badge tone="good">You</Badge>}
              </span>
              <span class="muted small">{r.model}</span>
            </span>
            <span class="pf-board-q">{radarText(r.quality)}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
