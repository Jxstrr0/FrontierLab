// Property readout on the CREO's profile (SCREENS §10.1): how many buildings
// the chief manages for the bank and for you, the premium over market their
// tenants accept (SIMULATION §21.2 pricing power) and when the next rent
// review falls; then, for each Buying switch that is on, the building the
// chief would buy next and when, or what is holding them back (§21.1).
import { EXEC_DELEGATION } from '../../config/balance';
import { CITIES } from '../../data/cities';
import { buyingOn, nextPurchase } from '../../sim/execBuying';
import { rentPricingPower, rentsManaged } from '../../sim/execSeats';
import type { GameState, Property } from '../../sim/state';
import { money, pct } from '../format/format';

const owned = (s: GameState, owner: Property['owner']) =>
  Object.values(s.realEstate.properties).filter((p) => p.owner === owner).length;

const buildings = (n: number) => `${n} ${n === 1 ? 'building' : 'buildings'}`;

/** Weeks until the next multiple of `every`, counting this week's as `every`. */
function weeksTo(s: GameState, every: number): string {
  const n = (every - (s.clock.week % every)) % every || every;
  return n === 1 ? '1 week' : `${n} weeks`;
}

function rentsLine(s: GameState): string {
  const bank = owned(s, 'company');
  const mine = owned(s, 'personal');
  const parts: string[] = [];
  if (rentsManaged(s, 'company')) parts.push(`${buildings(bank)} of the lab's`);
  if (rentsManaged(s, 'personal')) parts.push(`${buildings(mine)} of yours`);
  const power = Math.max(rentPricingPower(s, 'company'), rentPricingPower(s, 'personal'));
  const every = EXEC_DELEGATION.rentEveryWeeks;
  return parts.length === 0
    ? `Nothing managed yet: ${buildings(bank)} of the lab's and ${buildings(mine)} of yours wait on the switches above.`
    : `Managing ${parts.join(' and ')}: tenants pay up to ${pct(power, 0)} over market, and rents are reviewed every ${every} weeks (next in ${weeksTo(s, every)}).`;
}

function buyLine(s: GameState, owner: Property['owner']): string {
  const who = owner === 'company' ? 'For the lab' : 'For you';
  const plan = nextPurchase(s, owner);
  if (!plan.pick) return `${who}: ${plan.blocker}`;
  const c = plan.pick;
  const city = CITIES[c.cityId]?.name ?? c.cityId;
  return `${who}: next, ${c.address} in ${city} for ${money(c.asking, s.settings.currency)} (${pct(c.yield, 1)} a year), in ${weeksTo(s, EXEC_DELEGATION.buyEveryWeeks)}.`;
}

export function PropertyNote(p: { s: GameState }) {
  const s = p.s;
  const owners = (['company', 'personal'] as const).filter((o) => buyingOn(s, o));
  return (
    <>
      <p class="muted small exec-note">{rentsLine(s)}</p>
      {owners.map((o) => (
        <p key={o} class="muted small exec-note">
          {buyLine(s, o)}
        </p>
      ))}
    </>
  );
}
