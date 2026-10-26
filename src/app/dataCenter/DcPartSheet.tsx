// The picker sheet for one data center slot (SCREENS §5b): every option with its
// price and what it does. `allowed` greys out options that can't be picked
// (an upgrade must beat the fitted part).
import { dcPartsFor, DC_SLOT_NAMES, type DcSlot } from '../../data/dataCenters';
import { Sheet } from '../components';
import { moneyFull } from '../format/format';
import { partFact } from './dcView';

export function DcPartSheet(p: {
  slot: DcSlot;
  current: string;
  sym: string;
  price: (partId: string) => number;
  allowed?: (partId: string) => boolean;
  onSelect: (partId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={`Choose ${DC_SLOT_NAMES[p.slot].toLowerCase()}`} onClose={p.onClose}>
      <div class="stack">
        {dcPartsFor(p.slot).map((part) => {
          const isCurrent = part.id === p.current;
          const ok = !isCurrent && (p.allowed?.(part.id) ?? true);
          return (
            <button
              type="button"
              class={`part-tile dc-option${isCurrent ? ' is-current' : ''}`}
              disabled={!ok}
              onClick={() => p.onSelect(part.id)}
            >
              <span class="part-tile-main">
                <span class="part-tile-name">{part.name}</span>
                <span class="muted small">{part.blurb}</span>
                <span class="small">{partFact(part)}</span>
              </span>
              <span class="part-tile-price">
                {isCurrent ? 'Fitted' : moneyFull(p.price(part.id), p.sym)}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
