// Convention panel (SCREENS §17): event name and dates, the exhibition hall
// vignette, the exclusive ventures carousel and networking cards. Ventures
// shown here can only be bought here, during the event week.
import { LayerMedallion } from '../map/LayerIcon';
import { Panel } from '../components';
import { closePanel, useGame } from '../store';

export function ConventionPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  return (
    <Panel
      title={site ? 'Convention centre' : 'Convention'}
      icon={<LayerMedallion id="conventions" size={32} />}
      onClose={closePanel}
    >
      <p class="muted">Conventions arrive soon.</p>
    </Panel>
  );
}
