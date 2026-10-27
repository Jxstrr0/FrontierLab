// The CFO's occupancy dials (SCREENS §10.1), one under each Rents switch:
// 80 / 85 / 90 / 95 / 100% full. The tagline says what the stop would do to
// rent per m² and to yearly net rent across that owner's buildings, against
// 100% (estimates from src/sim/execDelegationsProperty.ts occupancyEstimate).
import { EXEC_DELEGATION } from '../../config/balance';
import * as cmd from '../../sim/commands';
import { occupancyEstimate } from '../../sim/execDelegationsProperty';
import type { GameState, Property } from '../../sim/state';
import { StepSlider } from '../components';
import { money, pct, signedPct } from '../format/format';
import { act } from '../store';

export function OccupancyDial(p: { s: GameState; owner: Property['owner'] }) {
  const sym = p.s.settings.currency;
  const target = p.s.executives.occTargets[p.owner];
  const e = occupancyEstimate(p.s, p.owner, target);
  const whose = p.owner === 'company' ? "the lab's" : 'your';
  const delta = e.net - e.netFull;
  const hint =
    e.buildings === 0
      ? `No buildings yet: ${whose} buildings will be priced to stay ${pct(target, 0)} full.`
      : target >= 1
        ? `As full as tenants allow · net rent ${money(e.net, sym)}/yr across ${e.buildings} ${e.buildings === 1 ? 'building' : 'buildings'}`
        : `Rent ${signedPct(e.rentUp, 0)} per m² · net rent ${money(e.net, sym)}/yr, ${money(Math.abs(delta), sym)} ${delta < 0 ? 'less' : 'more'} than at 100%`;
  return (
    <div class="exec-dial">
      <StepSlider
        label="Occupancy"
        options={EXEC_DELEGATION.occTargets.map((t) => ({
          value: t,
          label: `${Math.round(t * 100)}%`,
        }))}
        value={target}
        onChange={(v) => act(cmd.setOccupancyTarget, p.owner, v)}
        hint={hint}
      />
    </div>
  );
}
