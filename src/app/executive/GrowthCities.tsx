// Growth cities on the COO's profile (SCREENS §10.1): every city you have been
// to, with a switch for whether the Expansion delegation may build there and an
// "Open a branch now" button that has the COO build their usual pick at once.
import { CITIES } from '../../data/cities';
import * as cmd from '../../sim/commands';
import { canGrowIn, expansionPlan } from '../../sim/execDelegationsGrowth';
import type { GameState } from '../../sim/state';
import { Toggle } from '../components';
import { money } from '../format/format';
import { act, toast } from '../store';

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
        Where the COO may open branches: any city you have visited. Open now builds their usual pick
        straight away.
      </p>
      <ul class="growth-list">
        {cities.map((id) => {
          const plan = expansionPlan(s, id, false);
          const ready = !plan.blocker && plan.lot;
          return (
            <li key={id} class="growth-row">
              <Toggle
                label={`${CITIES[id]?.name ?? id}${id === home ? ' (home)' : ''}`}
                hint={
                  ready ? `Next: ${plan.lot!.address}, ${money(plan.total, sym)}` : plan.blocker
                }
                checked={!!s.executives.growthCities[id]}
                onChange={(v) => act(cmd.setGrowthCity, id, v)}
              />
              <button
                type="button"
                class="btn btn-secondary growth-open"
                disabled={!ready}
                onClick={() => {
                  const r = act(cmd.cooOpenBranch, id);
                  if (r.ok) toast(`Your COO is opening a branch in ${CITIES[id]?.name ?? id}.`);
                }}
              >
                Open now
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
