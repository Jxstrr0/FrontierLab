// The CFO's Rents delegations (SIMULATION §17.2, §21.2; the Chief
// Infrastructure Officer's until schema 22): Rents on the lab's buildings and
// on the ones you own privately. Every EXEC_DELEGATION.rentEveryWeeks
// weeks each managed building's rent moves to the level that holds the owner's
// occupancy dial (propertyMath.rentForOccupancy; at 100% the highest that still
// fills it), counting the CFO's pricing power, through
// the ordinary setPropertyRent command. Switching a Rents switch on reviews at
// once (commands/executives.ts). occupancyEstimate feeds the occupancy dials.
import { EXEC_DELEGATION, REAL_ESTATE, WEEKS_PER_YEAR } from '../config/balance';
import { setPropertyRent } from './commands/realEstate';
import { rentPricingPower, rentsManaged } from './execSeats';
import { occupancyTarget, propertyWeek, rentForOccupancy } from './propertyMath';
import type { GameState, Property } from './state';

/** Sets every managed building of this owner to its dialled rent now. */
export function reviewRents(state: GameState, owner: Property['owner']): void {
  if (!rentsManaged(state, owner)) return;
  const power = rentPricingPower(state, owner);
  const props = Object.values(state.realEstate.properties)
    .filter((p) => p.owner === owner)
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const p of props) {
    const rent = rentForOccupancy(p.marketRent, power, state.executives.occTargets[owner]);
    if (Math.abs(rent - p.rent) < REAL_ESTATE.rentStep / 2) continue;
    setPropertyRent(state, p.id, rent);
  }
}

const due = (state: GameState): boolean => state.clock.week % EXEC_DELEGATION.rentEveryWeeks === 0;

/** Rents: the lab's buildings. */
export function cfoBankRents(state: GameState): void {
  if (due(state)) reviewRents(state, 'company');
}

/** Rents: your own buildings. */
export function cfoPrivateRents(state: GameState): void {
  if (due(state)) reviewRents(state, 'personal');
}

export interface OccupancyEstimate {
  buildings: number;
  /** Yearly net rent across this owner's buildings at the dialled stop, and at 100%. */
  net: number;
  netFull: number;
  /** Rent per m² at the stop against the 100% rent (0.05 = 5% more). */
  rentUp: number;
}

/** What an occupancy dial stop would mean for this owner's buildings once occupancy settles. */
export function occupancyEstimate(
  state: GameState,
  owner: Property['owner'],
  target: number,
): OccupancyEstimate {
  const power = rentPricingPower(state, owner);
  const props = Object.values(state.realEstate.properties).filter((p) => p.owner === owner);
  let net = 0;
  let netFull = 0;
  let rentAt = 0;
  let rentFull = 0;
  for (const p of props) {
    const at = (t: number) => {
      const rent = rentForOccupancy(p.marketRent, power, t);
      const occupancy = occupancyTarget(rent, p.marketRent, power);
      return { rent, net: propertyWeek({ ...p, rent, occupancy }).net * WEEKS_PER_YEAR };
    };
    const a = at(target);
    const f = at(1);
    net += a.net;
    netFull += f.net;
    rentAt += a.rent * p.sqm;
    rentFull += f.rent * p.sqm;
  }
  return {
    buildings: props.length,
    net,
    netFull,
    rentUp: rentFull > 0 ? rentAt / rentFull - 1 : 0,
  };
}
