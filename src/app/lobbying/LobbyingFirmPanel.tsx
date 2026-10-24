// Lobbying firm panel (SCREENS §15): campaign cards with cost, success %,
// exposure risk % and Lobby; the outcome arrives in 4–8 weeks.
import { LOBBY_FIRMS } from '../../data/lobbying';
import { LayerMedallion } from '../map/LayerIcon';
import { Panel } from '../components';
import { closePanel, useGame } from '../store';

export function LobbyingFirmPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  const firm = site ? LOBBY_FIRMS[site.refId] : undefined;
  return (
    <Panel
      title={firm?.name ?? 'Lobbying firm'}
      subtitle="Lobbying firm"
      icon={<LayerMedallion id="lobbyingFirms" size={32} />}
      onClose={closePanel}
    >
      <p class="muted">Lobbying arrives soon.</p>
    </Panel>
  );
}
