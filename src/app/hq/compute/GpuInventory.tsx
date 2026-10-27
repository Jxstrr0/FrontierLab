// GPU inventory (stage C4b, SCREENS §10 Compute): the rented GPU lots with
// provider, reservation type, fixed price, size, end date and rosette, plus
// the total GPUs rented and their weekly bill. Lots can't be cancelled early.
import { GPU_LOT_TYPES } from '../../../data/gpuLots';
import { lotsWeeklyCost } from '../../../sim/gpuMarket';
import type { GpuLot } from '../../../sim/state';
import { Card, Row } from '../../components';
import { dayOfWeek } from '../../branch/selectors';
import { count, gameDate, money } from '../../format/format';
import { useGame } from '../../store';
import { FundFacts } from '../treasury/FundFacts';
import { termText } from '../treasury/treasuryView';
import { GpuRosette } from './GpuRosette';

export function GpuInventory() {
  const s = useGame();
  const sym = s.settings.currency;
  const lots = [...s.compute.lots].sort((a, b) => a.endWeek - b.endWeek);
  if (lots.length === 0) {
    return (
      <Card>
        <p class="muted small hq-note">
          No rented GPUs yet. Reserve GPUs from an offer below to lock in a price below spot.
        </p>
      </Card>
    );
  }
  return (
    <div class="stack">
      <Card>
        <Row label="GPUs rented" value={count(s.compute.rentedGpus)} strong />
        <Row label="Bill" value={`${money(lotsWeeklyCost(s), sym)} /week`} />
        <p class="muted small hq-note">Paid weekly from corporate cash until each lot ends.</p>
      </Card>
      {lots.map((l) => (
        <LotCard key={l.id} lot={l} />
      ))}
    </div>
  );
}

function LotCard({ lot }: { lot: GpuLot }) {
  const s = useGame();
  const sym = s.settings.currency;
  const spec = GPU_LOT_TYPES[lot.type];
  return (
    <Card class="tr-fund-card">
      <div class="tr-fund-head">
        <div>
          <div class="tr-fund-name">{lot.provider}</div>
          <div class="muted small">{spec?.name ?? lot.type}</div>
        </div>
        <span class="tr-fund-rate">{money(lot.price, sym)}</span>
      </div>
      <div class="tr-fund-body">
        <FundFacts
          items={[
            ['GPUs', count(lot.gpus)],
            ['Ends', gameDate(s.meta.startDate, dayOfWeek(lot.endWeek))],
            ['Left', termText(Math.max(0, lot.endWeek - s.clock.week))],
          ]}
        />
        <GpuRosette radar={lot.radar} />
      </div>
    </Card>
  );
}
