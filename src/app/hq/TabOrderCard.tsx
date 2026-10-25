// Tab order on the Office sheet (SCREENS §10): the floors you have, in the
// order their tabs appear along the bottom of the HQ panel, each with up and
// down arrows, and a Reset once you have moved any. The order is kept in the
// save (settings.hqTabOrder) through the moveHqTab command.
import { DEPARTMENTS } from '../../data/departments';
import * as cmd from '../../sim/commands';
import { visibleHqTabs } from '../../sim/hqTabs';
import type { GameState } from '../../sim/state';
import { Card, Icon } from '../components';
import { act } from '../store';
import { TAB_ICON } from './tabIcons';

export function TabOrderCard(p: { s: GameState }) {
  const tabs = visibleHqTabs(p.s);
  if (tabs.length < 2) return null;
  const moved = cmd.hqTabsRearranged(p.s);
  return (
    <Card>
      <div class="muted small">Tab order</div>
      <ol class="hq-tab-order" aria-label="HQ tabs, in order">
        {tabs.map((d, i) => (
          <li class="hq-tab-row">
            <Icon name={TAB_ICON[d]} size={22} class="hq-tab-icon" />
            <span class="hq-tab-name">{DEPARTMENTS[d].name}</span>
            <button
              type="button"
              class="hq-tab-move"
              aria-label={`Move ${DEPARTMENTS[d].name} up`}
              disabled={i === 0}
              onClick={() => act(cmd.moveHqTab, d, -1)}
            >
              <Icon name="chevronUp" size={20} />
            </button>
            <button
              type="button"
              class="hq-tab-move"
              aria-label={`Move ${DEPARTMENTS[d].name} down`}
              disabled={i === tabs.length - 1}
              onClick={() => act(cmd.moveHqTab, d, 1)}
            >
              <Icon name="chevronDown" size={20} />
            </button>
          </li>
        ))}
      </ol>
      {moved && (
        <button
          type="button"
          class="btn btn-secondary btn-block hq-tab-reset"
          onClick={() => act(cmd.resetHqTabOrder)}
        >
          Reset order
        </button>
      )}
    </Card>
  );
}
