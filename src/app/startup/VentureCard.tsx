// A venture card for carousels (SCREENS §10 Investment floor, §17 Convention):
// vignette, name, sector, short description, founded year, the round it is
// raising and a Details button that opens the startup panel.
import type { Startup } from '../../sim/state';
import { sectorOf } from '../../sim/ventureModel';
import { Badge, Card } from '../components';
import { money } from '../format/format';
import { openPanel, useGame } from '../store';
import { StartupArt } from './StartupArt';

export function VentureCard(p: { startup: Startup }) {
  const s = useGame();
  const st = p.startup;
  const raising = !!st.round && st.round.closesWeek > s.clock.week;
  return (
    <Card class="st-card">
      <div class="st-card-head">
        <StartupArt sector={st.sector} />
        <div>
          <h4 class="st-card-name">{st.name}</h4>
          <p class="muted small">
            {sectorOf(st.sector).label} · Founded {st.founded}
          </p>
        </div>
      </div>
      <p class="small st-card-desc">{st.description}</p>
      <div class="st-card-foot">
        {raising ? (
          <Badge tone="good">
            {st.round!.name} · {money(st.round!.amount, s.settings.currency)}
          </Badge>
        ) : (
          <Badge>Not raising</Badge>
        )}
        <button
          type="button"
          class="btn btn-secondary"
          onClick={() => openPanel({ type: 'startup', startupId: st.id })}
        >
          Details
        </button>
      </div>
    </Card>
  );
}
