// The picker sheet for one build slot: a horizontal carousel of option cards
// (SCREENS §4). Selecting a card calls onSelect and closes the sheet.
import { useEffect, useRef } from 'preact/hooks';
import type { BuildSlot, EquipmentSpec } from '../../data/equipment';
import { Card, CoinRating, Sheet } from '../components';
import { count, moneyFull } from '../format/format';
import { optionsFor, SLOT_LABEL } from './builds';

/** Coin rows that describe a part: Quality, Productivity or Security. */
function coinRows(e: EquipmentSpec): { label: string; value: number }[] {
  switch (e.slot) {
    case 'teller':
      return [
        { label: 'Quality', value: e.quality },
        { label: 'Productivity', value: e.productivityCoins ?? 0 },
      ];
    case 'vault':
      return [{ label: 'Security', value: e.security ?? 0 }];
    default:
      return [{ label: 'Quality', value: e.quality }];
  }
}

/** One-line extra facts: stations, meeting rooms, racks, kiosk traffic. */
function facts(e: EquipmentSpec): string[] {
  const out: string[] = [];
  if (e.slot === 'lobby') {
    const n = e.advisorOffices ?? 0;
    out.push(n === 0 ? 'No meeting rooms' : `${n} meeting ${n === 1 ? 'room' : 'rooms'}`);
  }
  if (e.slot === 'teller') {
    out.push(`${e.stations} stations`);
    out.push(`${count(e.perStation ?? 0)} interactions per station each week`);
  }
  if (e.slot === 'vault') {
    out.push(e.boxes ? `${count(e.boxes)} server racks` : 'No server racks');
  }
  if (e.slot === 'atm' && e.atmProductivity) {
    out.push(`${count(e.atmProductivity)} interactions per week`);
  }
  return out;
}

export function PartPicker(p: {
  slot: BuildSlot;
  current: string;
  sym: string;
  /** Today's price-list level for the lot's country (§4.6). */
  level: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const currentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start with the current pick in view.
    currentRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);

  return (
    <Sheet title={`Choose ${SLOT_LABEL[p.slot].toLowerCase()}`} onClose={p.onClose}>
      <div class="carousel part-carousel">
        {optionsFor(p.slot).map((e) => {
          const isCurrent = e.id === p.current;
          return (
            <div ref={isCurrent ? currentRef : undefined} key={e.id}>
              <Card class={`part-card${isCurrent ? ' is-current' : ''}`}>
                <div class="part-name">{e.name}</div>
                <p class="muted small part-desc">{e.description}</p>
                {coinRows(e).map((c) => (
                  <div class="part-coins">
                    <span class="muted small">{c.label}</span>
                    <CoinRating value={c.value} size={14} />
                  </div>
                ))}
                {facts(e).map((f) => (
                  <div class="small part-fact">{f}</div>
                ))}
                <div class="part-foot">
                  <span class="part-price">
                    {e.cost === 0 ? 'Free' : moneyFull(Math.round(e.cost * p.level), p.sym)}
                  </span>
                  <button
                    type="button"
                    class={`btn btn-small ${isCurrent ? 'btn-secondary' : 'btn-primary'}`}
                    onClick={() => p.onSelect(e.id)}
                  >
                    {isCurrent ? 'Selected' : 'Select'}
                  </button>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
