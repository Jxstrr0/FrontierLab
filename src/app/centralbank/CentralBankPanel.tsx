// Central bank panel (SCREENS §8). Stage 5 foundation placeholder; replaced by the full screen.
import type { CountryId } from '../../data/types';
import { Panel } from '../components';
import { closePanel } from '../store';

export function CentralBankPanel(_p: { countryId: CountryId }) {
  return (
    <Panel title="Central bank" onClose={closePanel}>
      <p class="muted">Coming in Stage 5.</p>
    </Panel>
  );
}
