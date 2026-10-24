// Property building panel (SCREENS §16): For sale (estimate, market rent,
// occupancy, asking price, Company | Private, offer stepper) or Owned (rent
// stepper, occupancy, weekly income and costs, ROI, For Sale toggle).
import { LayerMedallion } from '../map/LayerIcon';
import { Panel } from '../components';
import { closePanel, useGame } from '../store';

export function PropertyPanel(p: { siteId: string }) {
  const s = useGame();
  const site = s.world.sites[p.siteId];
  return (
    <Panel
      title={site ? `Building at ${site.address}` : 'Building'}
      icon={<LayerMedallion id="realEstate" size={32} />}
      onClose={closePanel}
    >
      <p class="muted">Real estate arrives soon.</p>
    </Panel>
  );
}
