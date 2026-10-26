// Growth cities on the COO's profile (SCREENS §10.1): every city you have been
// to, with a switch for whether the Expansion delegation may act there and an
// "Open now" / "Grow now" button: the COO opens the city's sales office with
// their usual pick, or grows the one there a size (C2a), at once.
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { canGrowIn, expansionPlan } from '../../sim/execDelegationsGrowth';
import type { GameState } from '../../sim/state';
import { Toggle } from '../components';
import { money } from '../format/format';
import { officeInCity, sizeName } from '../../sim/branch/officeSize';
import { act, toast } from '../store';

/** What you have in a city: "No office yet" or "Standard office". */
function officeLine(s: GameState, cityId: string): string {
  const office = officeInCity(s, cityId);
  return office ? `${sizeName(office.size)} office` : 'No office yet';
}

export function GrowthCities(p: { s: GameState }) {
  const { s } = p;
  const sym = s.settings.currency;
  const home = s.meta.homeCityId;
  const cities = Object.keys(s.world.cities)
    .filter((id) => canGrowIn(s, id))
    .sort((a, b) =>
      a === home ? -1 : b === home ? 1 : (CITIES[a]?.name ?? a).localeCompare(CITIES[b]?.name ?? b),
    );
  const expansionOn = !!s.executives.seats.coo?.delegations.expansion;
  return (
    <div class="growth">
      <h4 class="growth-title">Growth cities</h4>
      <p class="muted small exec-note">
        Where the COO may open a sales office, or grow the one there when it gets busy: any city you
        have visited. The button acts straight away.
      </p>
      <ul class="growth-list">
        {cities.map((id) => {
          const plan = expansionPlan(s, id, false);
          const ready = !plan.blocker && (plan.lot || plan.growId);
          const have = officeLine(s, id);
          const next = plan.growId
            ? `grow a size, ${money(plan.total, sym)}`
            : `${plan.lot?.address ?? ''}, ${money(plan.total, sym)}`;
          return (
            <li key={id} class="growth-row">
              <Toggle
                label={`${CITIES[id]?.name ?? id}${id === home ? ' (home)' : ''}`}
                hint={ready ? `${have}. Next: ${next}` : `${have}. ${plan.blocker}`}
                checked={!!s.executives.growthCities[id]}
                onChange={(v) => act(cmd.setGrowthCity, id, v)}
              />
              <button
                type="button"
                class="btn btn-secondary growth-open"
                disabled={!ready}
                onClick={() => {
                  const r = act(cmd.cooOpenBranch, id);
                  const city = CITIES[id]?.name ?? id;
                  if (r.ok)
                    toast(
                      plan.growId
                        ? `Your COO grew the ${city} office.`
                        : `Your COO is opening a sales office in ${city}.`,
                    );
                }}
              >
                {plan.growId ? 'Grow now' : 'Open now'}
              </button>
            </li>
          );
        })}
      </ul>
      {!expansionOn && cities.length > 0 && (
        <p class="muted small exec-note">
          With Expansion off, the COO only builds when you tap Open now.
        </p>
      )}
    </div>
  );
}
