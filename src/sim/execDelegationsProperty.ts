// The CREO's delegations (SIMULATION §17.2, §21.2): Rents on the bank's
// buildings and on the ones you own privately. Every EXEC_DELEGATION.rentEveryWeeks
// weeks each managed building's rent moves to the highest level that still
// fills it (propertyMath.bestRent), counting the chief's pricing power, through
// the ordinary setPropertyRent command. Switching a Rents switch on reviews at
// once (commands/executives.ts).
import { EXEC_DELEGATION, REAL_ESTATE } from '../config/balance';
import { setPropertyRent } from './commands/realEstate';
import { rentPricingPower, rentsManaged } from './execSeats';
import { bestRent } from './propertyMath';
import type { GameState, Property } from './state';

/** Sets every managed building of this owner to its best rent now. */
export function reviewRents(state: GameState, owner: Property['owner']): void {
  if (!rentsManaged(state, owner)) return;
  const power = rentPricingPower(state, owner);
  const props = Object.values(state.realEstate.properties)
    .filter((p) => p.owner === owner)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const p of props) {
    const rent = bestRent(p.marketRent, power);
    if (Math.abs(rent - p.rent) < REAL_ESTATE.rentStep / 2) continue;
    setPropertyRent(state, p.id, rent);
  }
}

const due = (state: GameState): boolean => state.clock.week % EXEC_DELEGATION.rentEveryWeeks === 0;

/** Rents: the bank's buildings. */
export function creoBankRents(state: GameState): void {
  if (due(state)) reviewRents(state, 'company');
}

/** Rents: your own buildings. */
export function creoPrivateRents(state: GameState): void {
  if (due(state)) reviewRents(state, 'personal');
}
