// Startup detail (SCREENS §11): profile, benchmark rosette, financials, the
// open round's two offer lots (Company | Private), venture debt, funding
// history and top shareholders. Opened from the Investment floor and from
// convention panels.
import { Panel } from '../components';
import { closePanel, useGame } from '../store';

export function StartupPanel(p: { startupId: string }) {
  const s = useGame();
  const startup = s.ventures.startups[p.startupId];
  return (
    <Panel title={startup?.name ?? 'Startup'} onClose={closePanel}>
      <p class="muted">Startup details arrive with ventures.</p>
    </Panel>
  );
}
