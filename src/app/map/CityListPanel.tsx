// The city as a list, in a full panel (Layers sheet → List view): the
// accessible alternative to the map, with every storefront one tap away.
import { CITIES } from '../../data/cities';
import { CityList } from '../city/CityList';
import { Panel } from '../components';
import { closePanel, useGame } from '../store';

export function CityListPanel() {
  const s = useGame();
  const city = CITIES[s.world.currentCityId];
  return (
    <Panel
      title={city?.name ?? 'Your city'}
      subtitle="Storefronts by district"
      onClose={closePanel}
    >
      <CityList hideTitle />
    </Panel>
  );
}
