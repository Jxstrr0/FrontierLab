// The Layers sheet (SCREENS §2, DESIGN §3.1 "Map layers"): an "All" toggle and
// one toggle per layer whose system exists in this build, plus the Branches
// layer's "Available only" filter and a way into the accessible list view.
// Every change goes through the setSettings command so it saves with the game.
import { availableLayers, LEASE_ONLY_KEY, layerOn, type MapLayerId } from '../../data/mapLayers';
import * as cmd from '../../sim/commands';
import { Sheet, Toggle } from '../components';
import { act, openPanel, sheet, useGame } from '../store';
import { LayerIcon } from './LayerIcon';

export function LayersSheet() {
  const s = useGame();
  const layers = s.settings.layers;
  const list = availableLayers();
  const allOn = list.every((l) => layerOn(layers, l.id));
  const set = (patch: Record<string, boolean>) =>
    act(cmd.setSettings, { layers: { ...layers, ...patch } });
  const setAll = (on: boolean) => set(Object.fromEntries(list.map((l) => [l.id, on])));
  const close = () => (sheet.value = null);

  return (
    <Sheet title="Map layers" onClose={close}>
      <div class="layers">
        <div class="layer-row">
          <span class="layer-icon-slot" aria-hidden="true" />
          <Toggle label="All" checked={allOn} onChange={setAll} />
        </div>
        {list.map((l) => (
          <LayerRow
            key={l.id}
            id={l.id}
            label={l.label}
            on={layerOn(layers, l.id)}
            onChange={(on) => set({ [l.id]: on })}
          />
        ))}
        {list.some((l) => l.id === 'branches') && (
          <div class="layer-row layer-sub">
            <span class="layer-icon-slot" aria-hidden="true" />
            <Toggle
              label="Available only"
              hint="Hide branches and show only open branch locations ($)."
              checked={layers[LEASE_ONLY_KEY] === true}
              disabled={!layerOn(layers, 'branches')}
              onChange={(on) => set({ [LEASE_ONLY_KEY]: on })}
            />
          </div>
        )}
        <button
          type="button"
          class="btn btn-secondary layers-list-btn"
          onClick={() => openPanel({ type: 'cityList' })}
        >
          List view
        </button>
      </div>
    </Sheet>
  );
}

function LayerRow(p: {
  id: MapLayerId;
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div class="layer-row">
      <span class="layer-icon-slot">
        <LayerIcon id={p.id} />
      </span>
      <Toggle label={p.label} checked={p.on} onChange={p.onChange} />
    </div>
  );
}
