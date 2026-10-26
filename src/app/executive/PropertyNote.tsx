// Rents readout on the CREO's profile (SCREENS §10.1): how many buildings the
// chief manages for the bank and for you, the premium over market their
// tenants accept (SIMULATION §21.2 pricing power), and when the next rent
// review falls.
import { EXEC_DELEGATION } from '../../config/balance';
import { rentPricingPower, rentsManaged } from '../../sim/execSeats';
import type { GameState, Property } from '../../sim/state';
import { pct } from '../format/format';

const owned = (s: GameState, owner: Property['owner']) =>
  Object.values(s.realEstate.properties).filter((p) => p.owner === owner).length;

const buildings = (n: number) => `${n} ${n === 1 ? 'building' : 'buildings'}`;

export function PropertyNote(p: { s: GameState }) {
  const s = p.s;
  const bank = owned(s, 'company');
  const mine = owned(s, 'personal');
  const parts: string[] = [];
  if (rentsManaged(s, 'company')) parts.push(`${buildings(bank)} of the bank's`);
  if (rentsManaged(s, 'personal')) parts.push(`${buildings(mine)} of yours`);
  const power = Math.max(rentPricingPower(s, 'company'), rentPricingPower(s, 'personal'));
  const every = EXEC_DELEGATION.rentEveryWeeks;
  const next = (every - (s.clock.week % every)) % every || every;
  const text =
    parts.length === 0
      ? `Nothing managed yet: ${buildings(bank)} of the bank's and ${buildings(mine)} of yours wait on the switches above.`
      : `Managing ${parts.join(' and ')}: tenants pay up to ${pct(power, 0)} over market, and rents are reviewed every ${every} weeks (next in ${next === 1 ? '1 week' : `${next} weeks`}).`;
  return <p class="muted small exec-note">{text}</p>;
}
