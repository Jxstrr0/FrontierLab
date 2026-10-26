// "+ Add floor" sheet (SCREENS §10): the departments you can fit out on this
// office's next empty floor, each with its description, desks and fit-out
// cost. Disabled, with the reason, when every floor is in use.
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import type { DeptId, Office } from '../../sim/state';
import { Sheet } from '../components';
import { money } from '../format/format';
import { act, openPanel, useGame } from '../store';
import { addableDepts, floorDesks, officeAddress, usedFloors } from './officeSelectors';

export function AddFloorSheet(p: { office: Office; onClose: () => void }) {
  const s = useGame();
  const sym = s.settings.currency;
  const o = p.office;
  const full = usedFloors(o) >= o.floors.length;
  const fitout = cmd.floorFitout(s, o.cityId);
  const short = s.company.cash < fitout;
  const add = (dept: DeptId) => {
    if (act(cmd.addFloor, o.id, dept).ok) {
      p.onClose();
      openPanel({ type: 'hq', officeId: o.id, dept });
    }
  };
  return (
    <Sheet title="Add a floor" onClose={p.onClose}>
      <p class="muted small hq-sheet-intro">
        {officeAddress(s, o)} · {usedFloors(o)} of {o.floors.length} floors in use
      </p>
      {full && (
        <p class="hq-blocker small" role="status">
          Every floor in this office is in use. Release a floor, or lease another office from the
          map.
        </p>
      )}
      {!full && short && (
        <p class="hq-blocker small" role="status">
          Not enough cash: a floor's fit-out costs {money(fitout, sym)}.
        </p>
      )}
      <ul class="hq-add-list">
        {addableDepts().map((d) => {
          const spec = DEPARTMENTS[d];
          const have = !!s.departments[d];
          return (
            <li class="hq-add-item">
              <div class="hq-add-text">
                <span class="hq-add-name">
                  {spec.name}
                  {have && <span class="muted small"> · another floor</span>}
                </span>
                <span class="muted small">{spec.description}</span>
                <span class="small">
                  {floorDesks(o, d)} desks · fit-out {money(fitout, sym)}
                </span>
              </div>
              <button
                type="button"
                class="btn btn-secondary hq-add-btn"
                disabled={full || short}
                aria-label={`Add a ${spec.name} floor`}
                onClick={() => add(d)}
              >
                Add
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
