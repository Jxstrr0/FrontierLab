// "New candidates" button for the manager and executive hire sheets (SCREENS
// §5.1, §10): pays a recruiter's fee for a fresh list, and says when the free
// refresh comes.
import { moneyFull } from '../format/format';

export function RerollButton(p: { fee: number; sym: string; weeks: number; onClick: () => void }) {
  return (
    <div class="stack">
      <button type="button" class="btn btn-secondary btn-block" onClick={p.onClick}>
        New candidates · {p.fee === 0 ? 'Free' : moneyFull(p.fee, p.sym)}
      </button>
      <p class="muted small">
        A recruiter finds a fresh list. The fee doubles each time until a free new list in {p.weeks}{' '}
        week{p.weeks === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
